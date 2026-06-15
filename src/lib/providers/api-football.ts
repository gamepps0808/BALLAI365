import { FootballDataProvider } from "./provider";
import {
  Fixture,
  League,
  Player,
  Team,
  Prediction,
  PickSide,
  ModelOutput,
  EndpointStatus,
  EndpointName,
  DataSourceFlag,
  CornerAnalysis,
  AfFixtureRaw,
  AfTeamStatistics,
} from "@/types/football";
import * as api from "../api-football";
import * as map from "../football-mapper";
import * as calc from "../football-calculator";
import { deriveStatus } from "../engine/score";
import { analyzeFixtureWithClaude, applyClaudeAnalysis, claudeEnabled } from "../claude-analyst";
import { recordPrediction, getLedgerEntry, LedgerEntry } from "../accuracy";
import { getSettings } from "../settings";
import { cacheGet, cachePut } from "../cache";
import { getMatchWeatherByCity } from "../openweather";
import { loadSelection } from "../big-match-selector";
import { loadSavedAnalysis } from "../claude-store";

/**
 * API-Football provider — orchestrates client → mapper → calculator.
 *
 * List view (getFixtures): fixtures + standings for every match; odds +
 * predictions for the first AF_DETAIL_LIMIT matches (request budget).
 * Detail view (getFixtureById): ALL 10 endpoints.
 * Every fixture carries `endpointStatus` for the Dev Debug Panel.
 */

/** บอลโลก 2026 — เจ้าภาพที่ได้เล่นในบ้านจริง */
const WC_HOSTS = ["USA", "Canada", "Mexico"];
/** ทัวร์นาเมนต์ทีมชาติที่เตะสนามกลาง (ยกเว้นเจ้าภาพ) */
const NEUTRAL_TOURNAMENTS = ["worldcup", "euro", "copaamerica", "asiancup"];

function isNeutralVenue(leagueId: string, homeTeamName: string): boolean {
  if (leagueId === "worldcup") return !WC_HOSTS.includes(homeTeamName);
  return NEUTRAL_TOURNAMENTS.includes(leagueId);
}

/**
 * ทับราคาตลาดที่แสดงด้วยค่าที่ "ล็อกไว้ตอนวิเคราะห์ครั้งแรก" จากสมุดสถิติ —
 * ราคาต่อรอง/สูงต่ำ/เตะมุมบนหน้าเว็บต้องเป็นชุดเดียวกับที่ใช้ตัดสินความแม่นเสมอ
 * ห้ามคำนวณใหม่ตามราคาตลาดที่ขยับ หรือเลวร้ายกว่านั้นคือสถิติหลังรู้ผลแล้ว
 */
function applyLockedMarkets(f: Fixture, locked: LedgerEntry): void {
  const p = f.prediction;
  // ทับเฉพาะตลาดที่ล็อกค่าไว้จริง — ค่าที่ถูกล้าง (null) ปล่อยให้ใช้เส้นตลาดสดจาก assemble
  if (locked.ahLine != null) {
    p.handicapLine = locked.ahLine;
    p.handicapPickTeam = locked.ahLabel;
  }
  p.overUnderLine = locked.ouLine;
  p.overUnderPick = locked.ouPick;
  if (locked.ouLine != null)
    p.overUnderNote = locked.finalizedAt
      ? "อัปเดตรอบสุดท้ายก่อนเตะ ✓"
      : "ล็อกตามที่วิเคราะห์ไว้ก่อนเตะ";
  p.cornerLine = locked.cornerLine;
  p.cornerPick = locked.cornerPick;
}

// limit ทั้งสองอ่านจาก Admin settings (fallback = .env) — เปลี่ยนค่าแล้วมีผลรอบถัดไปทันที

export class ApiFootballProvider implements FootballDataProvider {
  readonly name = "api-football";

  async getLeagues(): Promise<League[]> {
    return Object.entries(map.LEAGUES).map(([, l]) => ({
      id: l.id,
      name: l.id,
      nameTh: l.nameTh,
      country: l.country,
      enabled: true,
      isCup: l.isCup,
    }));
  }

  async getTeams(): Promise<Team[]> {
    return []; // teams are assembled per-fixture from standings/statistics
  }

  async getPlayers(): Promise<Player[]> {
    return [];
  }

  /** โหมดอ่านอย่างเดียว — ใช้ผลวิเคราะห์ที่เซฟไว้ ไม่เรียก Claude ใหม่ (ทุกหน้ายกเว้นหน้าหลัก) */
  async getFixtures(date?: string): Promise<Fixture[]> {
    return this.buildDay(date, false);
  }

  /** โหมดหน้าหลัก/cron — อนุญาตให้ Claude วิเคราะห์คู่ใหญ่ใหม่ได้ */
  async getFixturesWithAnalysis(date?: string): Promise<Fixture[]> {
    return this.buildDay(date, true);
  }

  private async buildDay(date: string | undefined, allowNewAnalysis: boolean): Promise<Fixture[]> {
    const day = date ?? api.todayInBangkok();
    const rawAll = await api.getFixturesByDate(day);
    const supported = rawAll.filter((f) => map.AF_LEAGUE_IDS.includes(f.league.id));

    // ดึงข้อมูลหนัก (odds/teamStats/h2h/lineups/predictions) เฉพาะ "คู่ที่ AI คัด" เท่านั้น
    // — ประหยัด API: คู่เล็กไม่ถูกดึงเปล่า, ไม่พลาดคู่ใหญ่ที่อยู่ลำดับท้าย
    // fallback: ยังไม่มี selection (วันแรก/ยังไม่คัด) → ใช้ detailLimit แรกๆ กันหน้าว่าง
    const selection = loadSelection(day);
    const bigIds = new Set(selection?.fixtureIds ?? []);
    const detailLimit = getSettings().detailLimit;

    const fixtures: Fixture[] = [];
    for (const [i, raw] of supported.entries()) {
      try {
        const afId = raw.fixture.id;
        const enrich = bigIds.size > 0
          ? bigIds.has(afId) || loadSavedAnalysis(`af-${afId}`) !== null
          : i < detailLimit;
        fixtures.push(await this.assemble(raw, { detail: false, enrich }));
      } catch (err) {
        // one malformed fixture must not sink the whole day
        console.error(`[api-football] skip fixture ${raw.fixture.id}:`, (err as Error).message);
      }
    }

    if (claudeEnabled()) {
      // คำทายที่เซฟไว้ถูก "ล็อก" แล้ว — ต้องติดตามคู่นั้นทุกสถานะ (รอเตะ/สด/จบ)
      // ไม่งั้นพอแมตช์จบ หน้าเว็บจะหล่นไปโชว์สกอร์จากโมเดลสถิติแทนคำทายจริง
      for (const f of fixtures) {
        const saved = loadSavedAnalysis<Parameters<typeof applyClaudeAnalysis>[1]>(f.id);
        if (saved) {
          applyClaudeAnalysis(f, saved);
          const locked = recordPrediction(f);
          if (locked) applyLockedMarkets(f, locked);
        }
      }
      if (allowNewAnalysis) {
        // วิเคราะห์ใหม่เฉพาะ "คู่ใหญ่" ที่คัดไว้และยังไม่เตะ — คู่ที่เซฟแล้วอ่านจากดิสก์ (ฟรี)
        const selection = loadSelection(day);
        const candidates = fixtures
          .filter(
            (f) =>
              f.status === "SCHEDULED" &&
              loadSavedAnalysis(f.id) === null &&
              (!selection?.fixtureIds?.length ||
                selection.fixtureIds.includes(Number(f.id.replace("af-", ""))))
          )
          .sort((a, b) => b.prediction.aiScore - a.prediction.aiScore)
          .slice(0, Math.max(getSettings().claudeLimit, 1));
        await Promise.all(
          candidates.map(async (f) => {
            const analysis = await analyzeFixtureWithClaude(f);
            if (analysis) {
              applyClaudeAnalysis(f, analysis);
              // ลง ledger ความแม่น (ล็อกครั้งแรก) — ตัดสินหลังจบแมตช์
              const locked = recordPrediction(f);
              if (locked) applyLockedMarkets(f, locked);
            }
          })
        );
      }
    }

    // Match of the Day = highest AI score among matches not yet kicked off
    const pool = fixtures.filter((f) => f.status === "SCHEDULED");
    const best = (pool.length > 0 ? pool : fixtures).reduce<Fixture | null>(
      (a, b) => (!a || b.prediction.aiScore > a.prediction.aiScore ? b : a),
      null
    );
    if (best) best.isMatchOfTheDay = true;
    return fixtures.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  }

  async getFixtureById(id: string): Promise<Fixture | null> {
    const afId = Number(id.replace(/^af-/, ""));
    if (!Number.isFinite(afId)) return null;

    // คู่ที่จบแล้วข้อมูลนิ่งแล้ว — cache ผลประกอบทั้งก้อน 24 ชม.
    // (ประหยัด ~10 API calls ต่อการเปิดหน้าหนึ่งครั้ง เมื่อมีผู้ใช้หลายคน)
    const doneKey = `fixture-done:${id}`;
    let fixture = cacheGet<Fixture>(doneKey);
    if (!fixture) {
      const rows = await api.getFixtureById(afId);
      const raw = rows[0];
      if (!raw) return null;
      fixture = await this.assemble(raw, { detail: true, enrich: true });
      if (fixture.status === "FINISHED") cachePut(doneKey, fixture, 24 * 3600);
    }

    // clone ก่อน apply — กัน mutate ก้อนใน cache (เหตุผลวิเคราะห์จะซ้อนกันถ้า apply ซ้ำ)
    const out = structuredClone(fixture);
    // หน้ารายละเอียด = แสดงผลที่เซฟไว้เท่านั้น ไม่จุดการวิเคราะห์ใหม่ (0 token)
    // คำทายที่ล็อกไว้ต้องโชว์ทุกสถานะ (รอเตะ/สด/จบ) — ห้ามหล่นไปใช้สกอร์โมเดลพื้นฐาน
    if (claudeEnabled()) {
      const saved = loadSavedAnalysis<Parameters<typeof applyClaudeAnalysis>[1]>(out.id);
      if (saved) applyClaudeAnalysis(out, saved);
      const locked = getLedgerEntry(out.id);
      if (locked) applyLockedMarkets(out, locked);
    }
    return out;
  }

  /* ------------------------------------------------------------------ */

  private async assemble(
    raw: AfFixtureRaw,
    opts: { detail: boolean; enrich: boolean }
  ): Promise<Fixture> {
    const status: EndpointStatus[] = [
      { endpoint: "fixtures", ok: true, state: "ok" },
    ];
    // thunk, not promise — a skipped endpoint must never fire a request
    const track = <T>(endpoint: EndpointName, fn: () => Promise<T>, skipped = false): Promise<T | undefined> => {
      if (skipped) {
        status.push({ endpoint, ok: false, state: "skipped", note: "ข้ามเพื่อประหยัดโควตา (โหลดเต็มในหน้ารายละเอียด)" });
        return Promise.resolve(undefined);
      }
      return fn().then(
        (v) => {
          const empty = v === undefined || v === null || (Array.isArray(v) && v.length === 0) || (v instanceof Map && v.size === 0);
          status.push({ endpoint, ok: !empty, state: empty ? "missing" : "ok" });
          return empty ? undefined : v;
        },
        (err) => {
          status.push({ endpoint, ok: false, state: "error", note: api.classifyError(err) });
          return undefined;
        }
      );
    };

    const leagueId = raw.league.id;
    const season = raw.league.season;
    const homeId = raw.teams.home.id;
    const awayId = raw.teams.away.id;
    const started = raw.fixture.status.short !== "NS" && raw.fixture.status.short !== "TBD";

    const [
      standings,
      homeStats,
      awayStats,
      h2hRows,
      oddsRows,
      predRows,
      lineupRows,
      injuryRows,
      homePlayers,
      awayPlayers,
      fixtureStatRows,
      homeRecentRows,
      awayRecentRows,
      weatherInfo,
      eventRows,
    ] = await Promise.all([
      track("standings", () => api.getStandings(leagueId, season)),
      track("teamStatistics", () => api.getTeamStatistics(leagueId, season, homeId), !opts.enrich),
      opts.enrich ? api.getTeamStatistics(leagueId, season, awayId).catch(() => undefined) : Promise.resolve(undefined),
      track("h2h", () => api.getHeadToHead(homeId, awayId), !opts.enrich),
      track("odds", () => api.getOdds(raw.fixture.id), !opts.enrich),
      track("predictions", () => api.getPredictions(raw.fixture.id), !opts.enrich),
      track("lineups", () => api.getLineups(raw.fixture.id), !opts.enrich),
      track("injuries", () => this.injuriesWithFallback(raw.fixture.id, homeId, awayId, season), !opts.enrich),
      opts.enrich ? api.getPlayers(homeId, season).catch(() => undefined) : Promise.resolve(undefined),
      opts.enrich ? api.getPlayers(awayId, season).catch(() => undefined) : Promise.resolve(undefined),
      // fixture statistics exist only after kickoff — pre-match = missing, not error
      track("fixtureStatistics", () => (started ? api.getFixtureStatistics(raw.fixture.id) : Promise.resolve(undefined)), !opts.detail),
      opts.enrich ? api.getTeamLastFixtures(homeId).catch(() => undefined) : Promise.resolve(undefined),
      opts.enrich ? api.getTeamLastFixtures(awayId).catch(() => undefined) : Promise.resolve(undefined),
      opts.enrich
        ? getMatchWeatherByCity(raw.fixture.venue?.city, raw.fixture.date).catch(() => null)
        : Promise.resolve(null),
      // เหตุการณ์สด — เฉพาะหน้ารายละเอียดและหลังเริ่มเตะ (ก่อนเตะ = ไม่มี ไม่ใช่ error)
      opts.detail && started
        ? api.getFixtureEvents(raw.fixture.id).catch(() => undefined)
        : Promise.resolve(undefined),
    ]);

    if (opts.enrich) {
      status.push({
        endpoint: "players",
        ok: !!(homePlayers?.length || awayPlayers?.length),
        state: homePlayers?.length || awayPlayers?.length ? "ok" : "missing",
      });
    } else {
      status.push({ endpoint: "players", ok: false, state: "skipped", note: "โหลดเฉพาะคู่ที่วิเคราะห์" });
    }

    /* ---------- map teams ---------- */
    const league = map.mapLeague(raw.league);
    const home = map.mapTeam(raw.teams.home, league.id, standings?.get(homeId), homeStats as AfTeamStatistics | undefined);
    const away = map.mapTeam(raw.teams.away, league.id, standings?.get(awayId), awayStats);

    // ผล 5 นัดจริงจาก API — ใช้สร้างฟอร์ม + ค่าเฉลี่ยประตู ให้ทีมที่ไม่มีตารางคะแนน (ทีมชาติ)
    const homeRecent = homeRecentRows?.length ? map.mapRecent(homeRecentRows, homeId) : null;
    const awayRecent = awayRecentRows?.length ? map.mapRecent(awayRecentRows, awayId) : null;
    if (home.form.length === 0 && homeRecent) home.form = homeRecent.map((r) => r.result).slice(0, 5);
    if (away.form.length === 0 && awayRecent) away.form = awayRecent.map((r) => r.result).slice(0, 5);
    const fillGoalsFromRecent = (team: Team, recent: typeof homeRecent) => {
      if (!recent?.length || team.statsAvg.goalsFor !== 1.4 || team.statsAvg.goalsAgainst !== 1.4) return false;
      let gf = 0, ga = 0, n = 0;
      for (const r of recent) {
        const m = r.score.match(/^(\d+)-(\d+)$/);
        if (!m) continue;
        gf += Number(m[1]); ga += Number(m[2]); n++;
      }
      if (n === 0) return false;
      team.statsAvg.goalsFor = +(gf / n).toFixed(2);
      team.statsAvg.goalsAgainst = +(ga / n).toFixed(2);
      return true;
    };
    const homeGoalsReal = fillGoalsFromRecent(home, homeRecent) || home.statsAvg.goalsFor !== 1.4;
    const awayGoalsReal = fillGoalsFromRecent(away, awayRecent) || away.statsAvg.goalsFor !== 1.4;

    /* ---------- odds markets ---------- */
    const bookmakers = oddsRows?.[0]?.bookmakers ?? [];
    const matchWinner = calc.extractMatchWinner(bookmakers);
    const ouMarket = calc.extractOverUnder(bookmakers);
    const ahMarket = calc.extractAsianHandicap(bookmakers);
    const cornersMarket = calc.extractCornersOverUnder(bookmakers);
    const bttsMarket = calc.extractBtts(bookmakers);

    /* ---------- probability blend ---------- */
    const neutralVenue = isNeutralVenue(league.id, raw.teams.home.name);
    const poi = calc.poissonFromAverages(
      home.statsAvg.goalsFor, home.statsAvg.goalsAgainst,
      away.statsAvg.goalsFor, away.statsAvg.goalsAgainst,
      1.4,
      neutralVenue ? 1.0 : 1.12
    );
    const formProb = formModel(home, away, neutralVenue);
    const marketProb = matchWinner ? implied(matchWinner) : null;
    const apiPred = predRows?.[0]?.predictions;
    const predProb = apiPred?.percent
      ? {
          home: pct(apiPred.percent.home ?? "0"),
          draw: pct(apiPred.percent.draw ?? "0"),
          away: pct(apiPred.percent.away ?? "0"),
        }
      : null;

    const weights = {
      stat: 0.35,
      form: 0.15,
      odds: marketProb ? 0.3 : 0,
      pred: predProb ? 0.2 : 0,
    };
    const wSum = weights.stat + weights.form + weights.odds + weights.pred;
    const blend = (k: "home" | "draw" | "away") =>
      (poi[k] * weights.stat +
        formProb[k] * weights.form +
        (marketProb ? marketProb[k] * weights.odds : 0) +
        (predProb ? predProb[k] * weights.pred : 0)) / wSum;

    let ph = blend("home"), pd = blend("draw"), pa = blend("away");
    const norm = ph + pd + pa;
    ph /= norm; pd /= norm; pa /= norm;

    const pick: PickSide = ph >= pa && ph >= pd ? "HOME" : pa >= ph && pa >= pd ? "AWAY" : "DRAW";
    const pickTeam = pick === "HOME" ? home : pick === "AWAY" ? away : null;
    const pickProb = pick === "HOME" ? ph : pick === "AWAY" ? pa : pd;
    const expectedScore = poi.likelyScoreByOutcome[pick];
    const expectedMargin = expectedScore.home - expectedScore.away;

    /* ---------- AI Score (per-spec weights, only real data) ---------- */
    const picked = pick === "AWAY" ? away : home;
    const other = pick === "AWAY" ? home : away;
    const homeInjuries = injuryRows ? map.mapInjuries(injuryRows, homeId) : [];
    const awayInjuries = injuryRows ? map.mapInjuries(injuryRows, awayId) : [];
    const pickedInjuries = pick === "AWAY" ? awayInjuries : homeInjuries;
    const otherInjuries = pick === "AWAY" ? homeInjuries : awayInjuries;
    const homeLineup = map.mapLineup(lineupRows?.find((l) => l.team.id === homeId));
    const awayLineup = map.mapLineup(lineupRows?.find((l) => l.team.id === awayId));

    const h2h = h2hRows ? map.mapH2H(h2hRows, homeId) : undefined;
    const h2hTotal = h2h ? h2h.homeWins + h2h.draws + h2h.awayWins : 0;
    const pickH2HWins = h2h ? (pick === "AWAY" ? h2h.awayWins : pick === "DRAW" ? h2h.draws : h2h.homeWins) : 0;

    const aiScore = calc.computeAiScore({
      teamStats: homeStats || awayStats
        ? clamp01(0.5 + ((picked.statsAvg.goalsFor - picked.statsAvg.goalsAgainst) - (other.statsAvg.goalsFor - other.statsAvg.goalsAgainst)) / 3)
        : undefined,
      form: picked.form.length > 0
        ? clamp01(0.5 + (formPts(picked) - formPts(other)) * 0.06)
        : undefined,
      h2h: h2h && h2hTotal > 0 ? clamp01((pickH2HWins / h2hTotal) * 1.3) : undefined,
      odds: marketProb
        ? clamp01(0.45 + ((pick === "HOME" ? marketProb.home : pick === "AWAY" ? marketProb.away : marketProb.draw) - 1 / 3) * 1.4)
        : undefined,
      predictions: predProb
        ? clamp01((pick === "HOME" ? predProb.home : pick === "AWAY" ? predProb.away : predProb.draw) * 1.6)
        : undefined,
      lineupsInjuries: injuryRows || lineupRows
        ? clamp01(0.75 - pickedInjuries.length * 0.1 + otherInjuries.length * 0.06 + (homeLineup?.confirmed ? 0.1 : 0))
        : undefined,
    });

    /* ---------- Data Quality / Confidence / Risk (per spec) ---------- */
    const dataQuality = calc.computeDataQuality(status);
    const confidence = calc.computeConfidence(dataQuality, aiScore);
    const risk = calc.computeRisk(dataQuality);
    const riskScore = 100 - dataQuality;

    /* ---------- Value (per spec: AI prob − 1/odds) ---------- */
    const pickOdd = matchWinner
      ? pick === "HOME" ? matchWinner.home : pick === "AWAY" ? matchWinner.away : matchWinner.draw
      : null;
    const { rating: value, stars: valueStars, edgePct } = calc.computeValue(pickProb, pickOdd);

    /* ---------- Picks from real markets only ---------- */
    const overUnderLine = ouMarket?.line ?? null;
    let overUnderPick: "OVER" | "UNDER" | null = null;
    let overUnderNote: string | null = null;
    if (ouMarket) {
      const pickOddOf = (side: "OVER" | "UNDER") =>
        side === "OVER" ? ouMarket.overOdd : ouMarket.underOdd;
      if (homeGoalsReal && awayGoalsReal) {
        // มีค่าเฉลี่ยประตูจริง → เทียบโอกาส "ชนะจริง" สองฝั่งที่เส้นนี้
        // (รองรับเส้นเต็ม/เศษ — push และแพ้ครึ่งไม่ถูกเหมาเข้าอีกฝั่ง)
        const sc = calc.ouSideScores(poi, ouMarket.line);
        overUnderPick = sc.over >= sc.under ? "OVER" : "UNDER";
        const winPct = Math.round(
          (Math.max(sc.over, sc.under) / Math.max(sc.over + sc.under, 1e-9)) * 100
        );
        overUnderNote = `โมเดลให้ ${overUnderPick === "OVER" ? "Over" : "Under"} ${winPct}% · ราคา ${pickOddOf(overUnderPick).toFixed(2)}`;
      } else {
        // ไม่มีข้อมูลประตูจริง → ห้ามเดา ใช้ฝั่งที่ตลาดต่อ (ราคาต่ำกว่า)
        overUnderPick = ouMarket.overOdd <= ouMarket.underOdd ? "OVER" : "UNDER";
        overUnderNote = `ตามราคาตลาด (${overUnderPick === "OVER" ? "Over" : "Under"} ต่อ ${pickOddOf(overUnderPick).toFixed(2)})`;
      }
    }

    // เส้นแฮนดิแคป = เส้นตลาดจริงเสมอ (ไม่บีบตามสกอร์ที่ทาย)
    // ผู้ใช้ต้องเห็นเส้นที่ไปแทงได้จริง เช่น Spain -2.75 ไม่ใช่ -1
    // ฝั่งที่เลือก (ต่อ/รับ) ดูจากสกอร์ที่ทายเทียบเส้น:
    //   ทายชนะมากกว่าเส้น → ตัวเต็งต่อ · น้อยกว่าเส้น → ทีมรองรับลูก (value bet)
    const handicapLine = ahMarket ? ahMarket.line : null;
    const handicapPickTeam = ahMarket && handicapLine !== null
      ? expectedMargin + handicapLine > 0
        ? `${home.shortName} ${fmtLine(handicapLine)}`
        : `${away.shortName} ${fmtLine(-handicapLine)}`
      : null;

    const fxStats = fixtureStatRows ? map.mapFixtureStats(fixtureStatRows, homeId) : null;
    const corners = buildCorners(fxStats, started, cornersMarket);

    /* ---------- reasons / risk factors ---------- */
    const reasons = buildReasons({
      picked, other, pick, h2h, pickH2HWins, h2hTotal,
      otherInjuries, apiAdvice: apiPred?.advice ?? null,
      matchWinnerBookmaker: matchWinner?.bookmaker ?? null,
      home, away, neutralVenue,
    });
    const riskFactors = buildRiskFactors({
      dataQuality, league, lineupConfirmed: !!homeLineup?.confirmed,
      injuries: homeInjuries.length + awayInjuries.length,
      hasOdds: !!matchWinner,
    });

    const modelOutputs: ModelOutput[] = [
      { model: "Statistical Model (Poisson)", modelTh: "โมเดลสถิติ (Poisson)", homeProb: pc(poi.home), drawProb: pc(poi.draw), awayProb: pc(poi.away), weight: Math.round((weights.stat / wSum) * 100) },
      { model: "Form Model", modelTh: "โมเดลฟอร์ม", homeProb: pc(formProb.home), drawProb: pc(formProb.draw), awayProb: pc(formProb.away), weight: Math.round((weights.form / wSum) * 100) },
      ...(marketProb ? [{ model: "Odds Model", modelTh: "โมเดลราคา (ตลาด)", homeProb: pc(marketProb.home), drawProb: pc(marketProb.draw), awayProb: pc(marketProb.away), weight: Math.round((weights.odds / wSum) * 100) }] : []),
      ...(predProb ? [{ model: "API-Football Predictions", modelTh: "โมเดล Predictions (API)", homeProb: pc(predProb.home), drawProb: pc(predProb.draw), awayProb: pc(predProb.away), weight: Math.round((weights.pred / wSum) * 100) }] : []),
    ];

    const prediction: Prediction = {
      pick,
      pickTeamName: pickTeam ? pickTeam.name : "Draw",
      pickLabel: pickTeam ? `${pickTeam.name.toUpperCase()} WIN` : "DRAW",
      winProbability: { home: pc(ph), draw: pc(pd), away: pc(pa) },
      expectedScore,
      handicapLine,
      handicapPickTeam,
      overUnderLine,
      overUnderPick,
      overUnderNote,
      cornerLine: corners.hasData ? corners.line : null,
      cornerPick: corners.hasData ? corners.pick : null,
      aiScore,
      confidence,
      risk,
      riskScore,
      value,
      valueStars,
      edgePct,
      dataQuality,
      status: deriveStatus(aiScore, riskScore, dataQuality),
      reasons,
      riskFactors,
      warning: "This is an AI statistical prediction, not a guaranteed result.",
      modelOutputs,
    };

    const kickoff = new Date(raw.fixture.date);
    return {
      id: `af-${raw.fixture.id}`,
      leagueId: league.id,
      league,
      kickoff: raw.fixture.date,
      kickoffLabel: kickoff.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }),
      status: map.mapStatus(raw.fixture.status.short),
      elapsed: raw.fixture.status.elapsed ?? null,
      venueName: raw.fixture.venue?.name ?? null,
      venueCity: raw.fixture.venue?.city ?? null,
      referee: raw.fixture.referee ?? null,
      round: raw.league.round ?? null,
      neutralVenue,
      homeGoals: raw.goals?.home ?? null,
      awayGoals: raw.goals?.away ?? null,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeTeam: home,
      awayTeam: away,
      homeKeyPlayer: homePlayers ? map.mapKeyPlayer(homePlayers, homeId) : undefined,
      awayKeyPlayer: awayPlayers ? map.mapKeyPlayer(awayPlayers, awayId) : undefined,
      homeInjuries,
      awayInjuries,
      homeLineup,
      awayLineup,
      endpointStatus: status,
      events: eventRows ? map.mapEvents(eventRows, homeId) : undefined,
      liveStats:
        opts.detail && fixtureStatRows ? map.mapLiveStats(fixtureStatRows, homeId) : undefined,
      h2h: h2h ?? { homeWins: 0, draws: 0, awayWins: 0 },
      homeRecent: homeRecent ?? map.recentFromForm(home.form),
      awayRecent: awayRecent ?? map.recentFromForm(away.form),
      weather: weatherInfo ?? {
        hasData: false,
        temperatureC: 0, rainProbability: 0, windKmh: 0, humidity: 0,
        impactScore: 0,
        impactNote: "ยังไม่มีข้อมูลอากาศสำหรับสนามนี้",
      },
      odds: {
        ...map.mapOddsAnalysis(matchWinner, handicapLine, overUnderLine),
        markets: {
          overUnder: ouMarket ?? undefined,
          asianHandicap: ahMarket ?? undefined,
          btts: bttsMarket ?? undefined,
        },
      },
      corners,
      dataSources: [
        ...toDataSources(status),
        { source: "Weather Data", sourceTh: "ข้อมูลอากาศ", available: !!weatherInfo },
      ],
      prediction,
      isMatchOfTheDay: false,
    };
  }

  /** Injuries: by fixture first, fallback to by-team (per spec). */
  private async injuriesWithFallback(fixtureId: number, homeId: number, awayId: number, season: number) {
    const byFixture = await api.getInjuriesByFixture(fixtureId).catch(() => []);
    if (byFixture.length > 0) return byFixture;
    const [h, a] = await Promise.all([
      api.getInjuriesByTeam(homeId, season).catch(() => []),
      api.getInjuriesByTeam(awayId, season).catch(() => []),
    ]);
    return [...h, ...a];
  }
}

/* ------------------------------ helpers ------------------------------ */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pc = (p: number) => Math.round(p * 100);
const pct = (s: string) => Number(s.replace("%", "")) / 100 || 0;

function fmtLine(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function formPts(team: Team): number {
  return team.form.reduce((sum, r, i) => sum + (r === "W" ? 3 : r === "D" ? 1 : 0) * (1 - i * 0.12), 0);
}

function formModel(home: Team, away: Team, neutralVenue = false) {
  const fh = formPts(home) + (neutralVenue ? 0 : 1.5); // สนามกลาง = ไม่มีแต้มต่อเจ้าบ้าน
  const fa = formPts(away);
  const total = fh + fa + 4;
  return { home: fh / total, draw: 4 / total, away: fa / total };
}

function implied(mw: { home: number; draw: number; away: number }) {
  const ih = 1 / mw.home, id = 1 / mw.draw, ia = 1 / mw.away;
  const t = ih + id + ia;
  return { home: ih / t, draw: id / t, away: ia / t };
}

/** Handicap line must not be deeper than the expected score margin allows. */
function buildCorners(
  fx: map.FixtureStatsSummary | null,
  started: boolean,
  market?: calc.CornersMarket | null
): CornerAnalysis {
  const hasData = !!fx && fx.homeCorners !== null && fx.awayCorners !== null;
  if (!hasData && market) {
    // pre-match: corner line + lean from the odds market (real data, not a guess)
    const pick = market.overOdd <= market.underOdd ? "OVER" : "UNDER";
    return {
      hasData: true,
      homeForAvg: 0, homeAgainstAvg: 0, awayForAvg: 0, awayAgainstAvg: 0,
      firstHalfAvg: +(market.line * 0.44).toFixed(1),
      secondHalfAvg: +(market.line * 0.56).toFixed(1),
      leagueAvg: 9.8,
      totalProjection: market.line,
      line: market.line,
      pick,
      confidencePct: 55,
    };
  }
  if (!hasData) {
    return {
      hasData: false,
      homeForAvg: 0, homeAgainstAvg: 0, awayForAvg: 0, awayAgainstAvg: 0,
      firstHalfAvg: 0, secondHalfAvg: 0, leagueAvg: 9.8, totalProjection: 0,
      line: 9.5, pick: "OVER", confidencePct: 0,
    };
  }
  const total = (fx!.homeCorners ?? 0) + (fx!.awayCorners ?? 0);
  const line = Math.round(total - 0.5) + 0.5;
  return {
    hasData: true,
    homeForAvg: fx!.homeCorners ?? 0,
    homeAgainstAvg: fx!.awayCorners ?? 0,
    awayForAvg: fx!.awayCorners ?? 0,
    awayAgainstAvg: fx!.homeCorners ?? 0,
    firstHalfAvg: +(total * 0.44).toFixed(1),
    secondHalfAvg: +(total * 0.56).toFixed(1),
    leagueAvg: 9.8,
    totalProjection: total,
    line,
    pick: total > line ? "OVER" : "UNDER",
    confidencePct: started ? 70 : 0,
  };
}

function buildReasons(ctx: {
  picked: Team; other: Team; pick: PickSide;
  h2h?: { homeWins: number; draws: number; awayWins: number };
  pickH2HWins: number; h2hTotal: number;
  otherInjuries: Player[];
  apiAdvice: string | null;
  matchWinnerBookmaker: string | null;
  home: Team; away: Team; neutralVenue?: boolean;
}): string[] {
  const out: { text: string; w: number }[] = [];
  const { picked, other, pick } = ctx;

  const fp = formPts(picked), fo = formPts(other);
  if (picked.form.length > 0 && fp > fo + 1) {
    out.push({
      text: `${picked.shortName} ฟอร์มดีกว่า 5 นัดหลังสุด ชนะ ${picked.form.filter((r) => r === "W").length} นัด`,
      w: fp - fo,
    });
  }
  if (picked.statsAvg.goalsFor > other.statsAvg.goalsFor + 0.3) {
    out.push({
      text: `${picked.shortName} ยิงเฉลี่ย ${picked.statsAvg.goalsFor.toFixed(2)} ประตูต่อนัด สูงกว่า ${other.shortName} (${other.statsAvg.goalsFor.toFixed(2)})`,
      w: picked.statsAvg.goalsFor - other.statsAvg.goalsFor,
    });
  }
  if (pick === "HOME" && ctx.home.rank > 0 && ctx.away.rank > 0 && ctx.home.rank < ctx.away.rank) {
    out.push({
      text: ctx.neutralVenue
        ? `${ctx.home.shortName} อันดับ ${ctx.home.rank} เหนือกว่า ${ctx.away.shortName} อันดับ ${ctx.away.rank}`
        : `${ctx.home.shortName} อันดับ ${ctx.home.rank} เหนือกว่า ${ctx.away.shortName} อันดับ ${ctx.away.rank} และได้เล่นในบ้าน`,
      w: (ctx.away.rank - ctx.home.rank) * 0.3,
    });
  }
  if (ctx.h2h && ctx.h2hTotal > 0 && ctx.pickH2HWins > ctx.h2hTotal / 2) {
    out.push({
      text: `สถิติเจอกัน ${picked.shortName} ชนะ ${ctx.pickH2HWins} จาก ${ctx.h2hTotal} นัด`,
      w: ctx.pickH2HWins / ctx.h2hTotal,
    });
  }
  if (ctx.otherInjuries.length > 0) {
    out.push({
      text: `${other.shortName} มีผู้เล่นบาดเจ็บ/ติดโทษแบน ${ctx.otherInjuries.length} ราย`,
      w: ctx.otherInjuries.length * 0.6,
    });
  }
  if (ctx.apiAdvice) {
    out.push({ text: `คำแนะนำจากโมเดล API: ${ctx.apiAdvice}`, w: 0.4 });
  }
  if (ctx.matchWinnerBookmaker) {
    out.push({ text: `ราคาจาก ${ctx.matchWinnerBookmaker} สอดคล้องกับฝั่งที่ AI เลือก`, w: 0.3 });
  }
  if (out.length === 0) {
    out.push({
      text: `ข้อมูลเชิงลึกของคู่นี้ยังจำกัด — AI ประเมินจากค่าพลังพื้นฐาน (${picked.shortName} ${picked.power.overall} vs ${other.shortName} ${other.power.overall})`,
      w: 0.1,
    });
  }
  return out.sort((a, b) => b.w - a.w).slice(0, 5).map((r) => r.text);
}

function buildRiskFactors(ctx: {
  dataQuality: number;
  league: League;
  lineupConfirmed: boolean;
  injuries: number;
  hasOdds: boolean;
}): string[] {
  const out: string[] = [];
  if (!ctx.lineupConfirmed) out.push("รายชื่อตัวจริงยังไม่ประกาศ");
  if (!ctx.hasOdds) out.push("ไม่มีข้อมูลราคาจากตลาด");
  if (ctx.league.isCup) out.push("บอลถ้วย/ทีมชาติ — ทีมอาจโรเตชั่นผู้เล่น");
  if (ctx.injuries >= 3) out.push(`มีผู้เล่นบาดเจ็บ/ติดโทษแบนรวม ${ctx.injuries} ราย`);
  if (ctx.dataQuality < 50) out.push("ข้อมูลไม่ครบ ความน่าเชื่อถือของการวิเคราะห์ลดลง");
  return out;
}

const SOURCE_LABELS: Partial<Record<EndpointName, { en: string; th: string }>> = {
  fixtures: { en: "Fixture Data", th: "ข้อมูลโปรแกรมแข่ง" },
  odds: { en: "Odds Data", th: "ข้อมูลราคา" },
  standings: { en: "Historical Data", th: "สถิติย้อนหลัง (ตารางคะแนน)" },
  teamStatistics: { en: "Team Statistics", th: "สถิติทีม" },
  fixtureStatistics: { en: "Fixture Statistics", th: "สถิติในเกม" },
  predictions: { en: "Predictions Data", th: "ข้อมูลคำทำนาย (API)" },
  players: { en: "Player Data", th: "ข้อมูลนักเตะ" },
  injuries: { en: "Injury Data", th: "ข้อมูลอาการบาดเจ็บ" },
  lineups: { en: "Lineup Data", th: "รายชื่อตัวจริง" },
  h2h: { en: "H2H Data", th: "สถิติเจอกัน" },
};

function toDataSources(status: EndpointStatus[]): DataSourceFlag[] {
  return status
    .filter((s) => SOURCE_LABELS[s.endpoint])
    .map((s) => ({
      source: SOURCE_LABELS[s.endpoint]!.en,
      sourceTh: SOURCE_LABELS[s.endpoint]!.th,
      available: s.state === "ok",
    }));
}
