import { Fixture, LiteFixture, OverviewStats } from "./types";
import { getDataProvider } from "./providers";
import { cached } from "./cache";
import { fixtures as mockFixtures } from "./mock/data";
import { getAccuracySummary } from "./accuracy";
import * as api from "./api-football";
import { mapStatus } from "./football-mapper";
import { extractMatchWinner, extractAsianHandicap } from "./football-calculator";
import { selectBigMatches } from "./big-match-selector";
import { loadSavedAnalysis } from "./claude-store";

/**
 * Service layer between pages/API routes and the data provider.
 *
 * Live-provider failures fall back to mock data, but NEVER silently:
 * `fallback: true` + `error` are surfaced so the UI shows a clear banner —
 * sample data must never be mistaken for real analysis (ข้อห้าม: ห้ามเดาข้อมูลเอง).
 */
export interface FixturesResult {
  fixtures: Fixture[];
  provider: string;
  fallback: boolean;
  error?: string;
  updatedAt: string;
}

const TTL = Number(process.env.DATA_REFRESH_INTERVAL ?? 60);

/**
 * "วันบอล" ตามเวลาไทย — วันใหม่เริ่มตอนเที่ยง (12:00) พร้อมรอบรีเฟรช/วิเคราะห์รายวัน
 * คู่ที่วิเคราะห์ไว้จะอยู่บนหน้าหลักจนถึงเที่ยงวันถัดไป แม้เตะช่วงเช้า (เช่นบอลโลก 09:00)
 * footballToday  = วันปฏิทินของ (เวลาปัจจุบัน − 12 ชม.) → รอบที่กำลังไล่เตะอยู่
 * footballNewDay = วันถัดไป → "บอลวันใหม่" ที่แสดงบนหน้าหลัก (รวมเกมเช้าพรุ่งนี้)
 */
const DAY_FLIP_HOURS = 12 * 3600 * 1000;
const ONE_DAY = 24 * 3600 * 1000;
const bkkDate = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(ms));

export function footballToday(): string {
  return bkkDate(Date.now() - DAY_FLIP_HOURS);
}

export function footballNewDay(): string {
  return bkkDate(Date.now() - DAY_FLIP_HOURS + ONE_DAY);
}

export async function fetchFixtures(
  date?: string,
  opts?: { analyze?: boolean }
): Promise<FixturesResult> {
  const provider = getDataProvider();
  const updatedAt = new Date().toISOString();
  // analyze = หน้าหลัก/cron เท่านั้น — หน้าอื่นอ่านผลที่เซฟไว้ (0 token)
  const analyze = !!opts?.analyze && !!provider.getFixturesWithAnalysis;
  try {
    const fixtures = await cached(
      `svc:fixtures:${provider.name}:${date ?? "today"}:${analyze ? "deep" : "read"}`,
      TTL,
      () =>
        analyze
          ? provider.getFixturesWithAnalysis!(date)
          : provider.getFixtures(date)
    );
    return { fixtures, provider: provider.name, fallback: false, updatedAt };
  } catch (err) {
    console.error(`[service] ${provider.name} getFixtures failed:`, err);
    return {
      fixtures: mockFixtures,
      provider: provider.name,
      fallback: true,
      error: (err as Error).message,
      updatedAt,
    };
  }
}

export interface FixtureResult {
  fixture: Fixture | null;
  provider: string;
  fallback: boolean;
  error?: string;
}

export async function fetchFixture(id: string): Promise<FixtureResult> {
  const provider = getDataProvider();
  try {
    const fixture = await cached(`svc:fixture:${provider.name}:${id}`, TTL, () =>
      provider.getFixtureById(id)
    );
    return { fixture, provider: provider.name, fallback: false };
  } catch (err) {
    console.error(`[service] ${provider.name} getFixtureById failed:`, err);
    return {
      fixture: mockFixtures.find((f) => f.id === id) ?? null,
      provider: provider.name,
      fallback: true,
      error: (err as Error).message,
    };
  }
}

export function computeOverview(fixtures: Fixture[]): OverviewStats {
  return {
    totalMatches: fixtures.length,
    aiRecommended: fixtures.filter((f) => f.prediction.aiScore >= 75).length,
    highConfidence: fixtures.filter((f) =>
      ["HIGH", "VERY_HIGH"].includes(f.prediction.confidence)
    ).length,
    valueBets: fixtures.filter((f) =>
      ["STRONG_VALUE", "ELITE_VALUE"].includes(f.prediction.value)
    ).length,
    highRisk: fixtures.filter((f) =>
      ["HIGH", "VERY_HIGH"].includes(f.prediction.risk)
    ).length,
    // ความแม่นจริงจาก ledger (1X2, 7 วันล่าสุด) — null เมื่อยังไม่มีคู่ตัดสิน
    aiAccuracy7d: getAccuracySummary().accuracy7d,
  };
}

/**
 * รายการบอลทั้งวันแบบเบา — โปรแกรม + ราคาแฮนดิแคป/1X2 จากตลาด
 * ไม่มีการวิเคราะห์ AI (0 token) | ~2-6 API calls ต่อวัน (cache 30 นาที)
 * พร้อมธง isBig = คู่ใหญ่ที่ AI คัดให้วิเคราะห์เชิงลึก
 */
export interface LiteResult {
  fixtures: LiteFixture[];
  fallback: boolean;
  error?: string;
  selectionBy: "claude" | "heuristic" | "none";
}

/**
 * คู่เด่นสำหรับหน้าหลัก + หน้า scanner (AI แนะนำ/แฮนดิแคป/สูงต่ำ/เตะมุม/แจ้งเตือน)
 * = บอลวันใหม่ทั้งชุด + คู่ใหญ่ค่ำวันนี้ที่ยังไม่เตะ (เช่นบอลโลกเตะ 23:00 ที่ยังเป็นวันนี้)
 * มิฉะนั้นบอลเด่นที่เตะหัวค่ำจะหายไปจากทุกหน้าหลังรีเซ็ตเที่ยง
 */
export async function fetchFeaturedFixtures(
  opts?: { analyze?: boolean }
): Promise<FixturesResult> {
  const [newDayRes, todayRes] = await Promise.all([
    fetchFixtures(footballNewDay(), opts),
    fetchFixtures(footballToday()),
  ]);
  // คู่ใหญ่ค่ำวันนี้ที่ยังไม่เตะ/เตะอยู่ — "คู่ใหญ่" = มีผลวิเคราะห์ Claude ที่เซฟไว้
  const todayBig = todayRes.fixtures.filter(
    (f) =>
      (f.status === "SCHEDULED" || f.status === "LIVE") &&
      loadSavedAnalysis(f.id) !== null
  );
  const seen = new Set<string>();
  const fixtures = [...todayBig, ...newDayRes.fixtures].filter((f) => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });
  return {
    fixtures,
    provider: newDayRes.provider,
    fallback: newDayRes.fallback,
    error: newDayRes.error,
    updatedAt: newDayRes.updatedAt,
  };
}

export async function fetchLiteFixtures(date?: string): Promise<LiteResult> {
  const day = date ?? footballToday();
  try {
    // /odds?date ใช้วันที่ UTC แต่โปรแกรมใช้วันที่ไทย (UTC+7) —
    // คู่เตะ 00:00-07:00 ไทยจะอยู่ในวันก่อนหน้าตาม UTC จึงต้องดึงทั้งสองวันมารวมกัน
    const prevDay = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(
      new Date(new Date(`${day}T00:00:00+07:00`).getTime() - 12 * 3600 * 1000)
    );
    const [rawFixtures, oddsToday, oddsPrev] = await Promise.all([
      api.getFixturesByDate(day),
      api.getOddsForDate(day).catch(() => []),
      api.getOddsForDate(prevDay).catch(() => []),
    ]);
    const oddsByFixture = new Map(
      [...oddsPrev, ...oddsToday].map((o) => [o.fixture.id, o.bookmakers ?? []])
    );

    const lite: LiteFixture[] = rawFixtures
      // แสดงเฉพาะคู่ที่ตลาดเปิดราคา (คู่ที่มีความหมาย) — กันรายการพัน ๆ คู่
      .filter((f) => oddsByFixture.has(f.fixture.id))
      .map((f) => {
        const bookmakers = oddsByFixture.get(f.fixture.id)!;
        const mw = extractMatchWinner(bookmakers);
        const ah = extractAsianHandicap(bookmakers);
        return {
          id: `af-${f.fixture.id}`,
          afId: f.fixture.id,
          kickoff: f.fixture.date,
          kickoffLabel: new Date(f.fixture.date).toLocaleTimeString("th-TH", {
            hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
          }),
          status: mapStatus(f.fixture.status.short),
          leagueName: f.league.name,
          leagueCountry: f.league.country,
          leagueLogo: f.league.logo,
          homeName: f.teams.home.name,
          awayName: f.teams.away.name,
          homeLogo: f.teams.home.logo,
          awayLogo: f.teams.away.logo,
          homeGoals: f.goals?.home ?? null,
          awayGoals: f.goals?.away ?? null,
          elapsed: f.fixture.status.elapsed ?? null,
          ahLine: ah?.line ?? null,
          ahHome: ah?.homeOdd ?? null,
          ahAway: ah?.awayOdd ?? null,
          mwHome: mw?.home ?? null,
          mwDraw: mw?.draw ?? null,
          mwAway: mw?.away ?? null,
          isBig: false,
        };
      })
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

    // AI คัดคู่ใหญ่ 10 คู่ (1 call/วัน เซฟถาวร)
    const selection = await selectBigMatches(day, lite);
    for (const f of lite) f.isBig = selection.fixtureIds.includes(f.afId);

    return { fixtures: lite, fallback: false, selectionBy: selection.by };
  } catch (err) {
    console.error("[service] fetchLiteFixtures failed:", err);
    return { fixtures: [], fallback: true, error: (err as Error).message, selectionBy: "none" };
  }
}

export function pickMatchOfTheDay(fixtures: Fixture[]): Fixture | null {
  if (fixtures.length === 0) return null;
  // prefer matches that have not kicked off — finished games belong in ผลบอลย้อนหลัง
  const upcoming = fixtures.filter((f) => f.status === "SCHEDULED");
  const pool = upcoming.length > 0 ? upcoming : fixtures;
  return (
    pool.find((f) => f.isMatchOfTheDay) ??
    pool.reduce((a, b) => (b.prediction.aiScore > a.prediction.aiScore ? b : a))
  );
}
