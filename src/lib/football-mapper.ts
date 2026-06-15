import {
  Team,
  Player,
  League,
  H2H,
  RecentMatch,
  FormResult,
  LineupInfo,
  TeamPowerRating,
  OddsAnalysis,
  OddsPoint,
  AfFixtureRaw,
  AfStandingRow,
  AfTeamStatistics,
  AfFixtureStatRow,
  AfLineupResponse,
  AfInjuryRow,
  AfPlayerRow,
  AfTeamRef,
  AfEventRow,
  MatchEvent,
  LiveStatPair,
} from "@/types/football";
import { MatchWinnerOdds } from "./football-calculator";

/**
 * football-mapper — converts raw API-Football payloads into the UI's
 * normalized types. No fetching, no scoring — mapping only.
 */

/* --------------------------- leagues --------------------------- */

export const LEAGUES: Record<number, { id: string; nameTh: string; country: string; isCup: boolean }> = {
  39: { id: "epl", nameTh: "พรีเมียร์ลีก", country: "England", isCup: false },
  140: { id: "laliga", nameTh: "ลาลีกา", country: "Spain", isCup: false },
  78: { id: "bundesliga", nameTh: "บุนเดสลีกา", country: "Germany", isCup: false },
  135: { id: "seriea", nameTh: "เซเรีย อา", country: "Italy", isCup: false },
  61: { id: "ligue1", nameTh: "ลีกเอิง", country: "France", isCup: false },
  2: { id: "ucl", nameTh: "ยูฟ่าแชมเปียนส์ลีก", country: "Europe", isCup: true },
  3: { id: "uel", nameTh: "ยูโรปาลีก", country: "Europe", isCup: true },
  848: { id: "uecl", nameTh: "คอนเฟอเรนซ์ลีก", country: "Europe", isCup: true },
  45: { id: "facup", nameTh: "เอฟเอคัพ", country: "England", isCup: true },
  48: { id: "carabao", nameTh: "คาราบาวคัพ", country: "England", isCup: true },
  143: { id: "copadelrey", nameTh: "โกปาเดลเรย์", country: "Spain", isCup: true },
  81: { id: "dfbpokal", nameTh: "เดเอฟเบโพคาล", country: "Germany", isCup: true },
  137: { id: "coppaitalia", nameTh: "โคปปา อิตาเลีย", country: "Italy", isCup: true },
  40: { id: "championship", nameTh: "แชมเปียนชิพ", country: "England", isCup: false },
  1: { id: "worldcup", nameTh: "ฟุตบอลโลก", country: "World", isCup: true },
  4: { id: "euro", nameTh: "ยูโร", country: "Europe", isCup: true },
  9: { id: "copaamerica", nameTh: "โคปา อเมริกา", country: "South America", isCup: true },
  7: { id: "asiancup", nameTh: "เอเชียนคัพ", country: "Asia", isCup: true },
  10: { id: "friendlies", nameTh: "กระชับมิตรทีมชาติ", country: "World", isCup: true },
};

export const AF_LEAGUE_IDS = Object.keys(LEAGUES).map(Number);

export function mapLeague(raw: AfFixtureRaw["league"]): League {
  const meta = LEAGUES[raw.id];
  return {
    id: meta?.id ?? `af-${raw.id}`,
    name: raw.name,
    nameTh: meta?.nameTh ?? raw.name,
    country: raw.country,
    logo: raw.logo,
    enabled: true,
    isCup: meta?.isCup ?? false,
  };
}

/* --------------------------- teams --------------------------- */

export function mapTeam(
  t: AfTeamRef,
  leagueId: string,
  standing?: AfStandingRow,
  teamStats?: AfTeamStatistics
): Team {
  const played = standing?.all.played ?? 0;
  // team statistics endpoint is the better source — standings as fallback
  const gfAvg = teamStats
    ? Number(teamStats.goals.for.average.total) || 1.4
    : played > 0
      ? standing!.all.goals.for / played
      : 1.4;
  const gaAvg = teamStats
    ? Number(teamStats.goals.against.average.total) || 1.4
    : played > 0
      ? standing!.all.goals.against / played
      : 1.4;

  const formStr = teamStats?.form ?? standing?.form ?? "";
  const form = formStr
    .split("")
    .filter((c): c is FormResult => c === "W" || c === "D" || c === "L")
    .reverse()
    .slice(0, 5);

  return {
    id: `af-t-${t.id}`,
    name: t.name,
    shortName: t.name.length > 14 ? t.name.split(" ")[0] : t.name,
    logo: t.logo,
    leagueId,
    rank: standing?.rank ?? 0,
    points: standing?.points ?? 0,
    form,
    power: estimatePower(standing, gfAvg, gaAvg),
    statsAvg: {
      goalsFor: +gfAvg.toFixed(2),
      goalsAgainst: +gaAvg.toFixed(2),
      possession: 0, // filled from fixture statistics when available
      shots: 0,
      corners: 0,
    },
  };
}

/** Power ratings estimated from standings/stats — flagged as AI Estimate. */
function estimatePower(s: AfStandingRow | undefined, gfAvg: number, gaAvg: number): TeamPowerRating {
  const rank = s?.rank ?? 10;
  const base = Math.max(55, 92 - rank * 2);
  return {
    overall: base,
    attack: Math.max(50, Math.min(96, Math.round(60 + gfAvg * 14))),
    defense: Math.max(50, Math.min(96, Math.round(96 - gaAvg * 16))),
    homeStrength: Math.min(97, base + 4),
    awayStrength: Math.max(50, base - 4),
    pressing: base,
    setPiece: base - 2,
    corner: base - 2,
    injuryImpact: 0,
    squadDepth: base,
    fitness: 85,
    tacticalStability: base,
  };
}

/* --------------------------- H2H / recent --------------------------- */

export function mapH2H(rows: AfFixtureRaw[], homeId: number): H2H {
  const h2h: H2H = { homeWins: 0, draws: 0, awayWins: 0 };
  for (const m of rows) {
    const hg = m.goals?.home ?? 0, ag = m.goals?.away ?? 0;
    const homeIsHome = m.teams.home.id === homeId;
    if (hg === ag) h2h.draws++;
    else if ((hg > ag) === homeIsHome) h2h.homeWins++;
    else h2h.awayWins++;
  }
  return h2h;
}

export function mapRecent(rows: AfFixtureRaw[], teamId: number): RecentMatch[] {
  return rows.map((m) => {
    const isHome = m.teams.home.id === teamId;
    const gf = (isHome ? m.goals?.home : m.goals?.away) ?? 0;
    const ga = (isHome ? m.goals?.away : m.goals?.home) ?? 0;
    const opp = isHome ? m.teams.away.name : m.teams.home.name;
    return {
      result: (gf > ga ? "W" : gf === ga ? "D" : "L") as FormResult,
      score: `${gf}-${ga}`,
      opponentShort: opp.split(" ")[0].slice(0, 3).toUpperCase(),
    };
  });
}

export function recentFromForm(form: FormResult[]): RecentMatch[] {
  return form.map((r) => ({ result: r, score: "-", opponentShort: "—" }));
}

/* --------------------------- fixture statistics --------------------------- */

export interface FixtureStatsSummary {
  homeCorners: number | null;
  awayCorners: number | null;
  homePossession: number | null;
  awayPossession: number | null;
  homeShots: number | null;
  awayShots: number | null;
}

export function mapFixtureStats(rows: AfFixtureStatRow[], homeId: number): FixtureStatsSummary {
  const get = (teamRow: AfFixtureStatRow | undefined, type: string): number | null => {
    const v = (teamRow?.statistics ?? []).find((s) => s.type === type)?.value;
    if (v === null || v === undefined) return null;
    if (typeof v === "string") return Number(v.replace("%", "")) || null;
    return v;
  };
  const home = rows.find((r) => r.team.id === homeId);
  const away = rows.find((r) => r.team.id !== homeId);
  return {
    homeCorners: get(home, "Corner Kicks"),
    awayCorners: get(away, "Corner Kicks"),
    homePossession: get(home, "Ball Possession"),
    awayPossession: get(away, "Ball Possession"),
    homeShots: get(home, "Total Shots"),
    awayShots: get(away, "Total Shots"),
  };
}

/* --------------------------- lineups --------------------------- */

export function mapLineup(raw: AfLineupResponse | undefined): LineupInfo | undefined {
  if (!raw) return undefined;
  // friendlies often return partial lineup rows — never assume arrays exist
  const startXI = raw.startXI ?? [];
  const bench = raw.substitutes ?? [];
  return {
    formation: raw.formation ?? null,
    coach: raw.coach?.name ?? null,
    confirmed: startXI.length > 0,
    startXI: startXI.map((p) => p.player.name),
    startXIDetail: startXI.map((p) => ({
      name: p.player.name,
      number: p.player.number ?? null,
      pos: p.player.pos ?? null,
    })),
    bench: bench.map((p) => p.player.name),
  };
}

/* --------------------------- live events / stats --------------------------- */

const EVENT_TH: Record<string, string> = {
  "Normal Goal": "ประตู",
  "Own Goal": "ทำเข้าประตูตัวเอง",
  "Penalty": "จุดโทษ",
  "Missed Penalty": "ยิงจุดโทษพลาด",
  "Yellow Card": "ใบเหลือง",
  "Red Card": "ใบแดง",
  "Goal cancelled": "VAR ไม่ให้ประตู",
  "Penalty confirmed": "VAR ยืนยันจุดโทษ",
};

export function mapEvents(rows: AfEventRow[], homeId: number): MatchEvent[] {
  return (rows ?? []).map((e) => {
    const type =
      e.type === "Goal" ? "GOAL" : e.type === "Card" ? "CARD" : e.type === "Var" ? "VAR" : "SUBST";
    return {
      minute: e.time?.elapsed ?? 0,
      extra: e.time?.extra ?? null,
      side: (e.team?.id === homeId ? "HOME" : "AWAY") as "HOME" | "AWAY",
      teamName: e.team?.name ?? "",
      type: type as MatchEvent["type"],
      detail: e.detail ?? "",
      detailTh: EVENT_TH[e.detail] ?? (type === "SUBST" ? "เปลี่ยนตัว" : e.detail ?? ""),
      player: e.player?.name ?? null,
      assist: e.assist?.name ?? null,
    };
  });
}

/** สถิติสดที่คัดมาเทียบสองทีม — เฉพาะตัวที่ API มีจริง */
const LIVE_STAT_TH: [string, string][] = [
  ["Ball Possession", "ครองบอล (%)"],
  ["Total Shots", "ยิงทั้งหมด"],
  ["Shots on Goal", "ยิงตรงกรอบ"],
  ["Corner Kicks", "เตะมุม"],
  ["Fouls", "ฟาวล์"],
  ["Offsides", "ล้ำหน้า"],
  ["Yellow Cards", "ใบเหลือง"],
  ["Goalkeeper Saves", "เซฟ"],
];

export function mapLiveStats(rows: AfFixtureStatRow[], homeId: number): LiveStatPair[] {
  const homeRow = rows.find((r) => r.team.id === homeId);
  const awayRow = rows.find((r) => r.team.id !== homeId);
  const num = (row: AfFixtureStatRow | undefined, type: string): number | null => {
    const v = row?.statistics?.find((s) => s.type === type)?.value;
    if (v == null) return null;
    const n = typeof v === "string" ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : null;
  };
  const out: LiveStatPair[] = [];
  for (const [type, labelTh] of LIVE_STAT_TH) {
    const h = num(homeRow, type);
    const a = num(awayRow, type);
    if (h == null && a == null) continue; // ไม่มีข้อมูล → ไม่โชว์ ไม่เดา
    out.push({ type, labelTh, home: h ?? 0, away: a ?? 0, isPercent: type === "Ball Possession" });
  }
  return out;
}

/* --------------------------- injuries --------------------------- */

export function mapInjuries(rows: AfInjuryRow[], teamId: number): Player[] {
  return rows
    .filter((r) => r.team.id === teamId)
    .map((r) => ({
      id: `af-p-${r.player.id}`,
      teamId: `af-t-${r.team.id}`,
      name: r.player.name,
      position: r.player.type ?? "",
      positionTh: r.player.type ?? "",
      rating: 0,
      goals: 0,
      assists: 0,
      fitness: 0,
      isKeyPlayer: false,
      status: r.player.reason?.toLowerCase().includes("susp") ? "suspended" : "injured",
    }));
}

/* --------------------------- players --------------------------- */

const POSITION_TH: Record<string, string> = {
  Goalkeeper: "ผู้รักษาประตู",
  Defender: "กองหลัง",
  Midfielder: "กองกลาง",
  Attacker: "กองหน้า",
};

/** Key player = highest-rated player with meaningful minutes. */
export function mapKeyPlayer(rows: AfPlayerRow[], teamId: number): Player | undefined {
  let best: { row: AfPlayerRow; rating: number } | null = null;
  for (const row of rows) {
    const st = row.statistics?.[0];
    if (!st || (st.games.minutes ?? 0) < 200) continue;
    const rating = Number(st.games.rating ?? 0);
    if (!rating) continue;
    if (!best || rating > best.rating) best = { row, rating };
  }
  if (!best) return undefined;
  const st = best.row.statistics[0];
  return {
    id: `af-p-${best.row.player.id}`,
    teamId: `af-t-${teamId}`,
    name: best.row.player.name,
    position: st.games.position ?? "",
    positionTh: POSITION_TH[st.games.position ?? ""] ?? st.games.position ?? "",
    rating: +best.rating.toFixed(1),
    goals: st.goals.total ?? 0,
    assists: st.goals.assists ?? 0,
    fitness: best.row.player.injured ? 50 : 90,
    photo: best.row.player.photo,
    isKeyPlayer: true,
    status: best.row.player.injured ? "injured" : "fit",
  };
}

/* --------------------------- odds --------------------------- */

export function mapOddsAnalysis(
  mw: MatchWinnerOdds | null,
  handicapLine: number | null,
  ouLine: number | null
): OddsAnalysis {
  if (!mw) {
    const zero: OddsPoint = { time: "-", home: 0, draw: 0, away: 0, handicapLine: 0, overUnderLine: 2.5 };
    return {
      opening: zero,
      current: zero,
      history: [],
      steamMove: false,
      sharpMoney: false,
      movementNote: "ไม่มีข้อมูลราคาสำหรับคู่นี้ (Missing Data)",
      marketProbability: { home: 0, draw: 0, away: 0 },
    };
  }
  const point: OddsPoint = {
    time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    home: mw.home,
    draw: mw.draw,
    away: mw.away,
    handicapLine: handicapLine ?? 0,
    overUnderLine: ouLine ?? 2.5,
  };
  const total = 1 / mw.home + 1 / mw.draw + 1 / mw.away;
  return {
    opening: point,
    current: point,
    history: [point],
    steamMove: false, // Future Feature — needs odds snapshots over time
    sharpMoney: false, // Future Feature — needs odds snapshots over time
    movementNote: `ราคาปัจจุบันจาก ${mw.bookmaker} — กราฟการไหลของราคาจะเปิดใช้เมื่อระบบสะสม snapshot (Future Feature)`,
    marketProbability: {
      home: +((1 / mw.home / total) * 100).toFixed(1),
      draw: +((1 / mw.draw / total) * 100).toFixed(1),
      away: +((1 / mw.away / total) * 100).toFixed(1),
    },
  };
}

/* --------------------------- misc --------------------------- */

export function mapStatus(
  short: string
): "SCHEDULED" | "LIVE" | "FINISHED" | "CANCELLED" | "POSTPONED" {
  if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(short)) return "LIVE";
  if (["FT", "AET", "PEN"].includes(short)) return "FINISHED";
  if (["CANC", "ABD", "AWD", "WO"].includes(short)) return "CANCELLED";
  if (["PST", "SUSP", "INT"].includes(short)) return "POSTPONED";
  return "SCHEDULED"; // NS / TBD
}
