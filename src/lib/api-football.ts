import { cached } from "./cache";
import {
  AfFixtureRaw,
  AfOddsDateItem,
  AfTeamSearchResult,
  AfStandingsResponse,
  AfStandingRow,
  AfTeamStatistics,
  AfFixtureStatRow,
  AfOddsResponse,
  AfPredictionResponse,
  AfLineupResponse,
  AfEventRow,
  AfTopScorerRow,
  AfVenue,
  AfInjuryRow,
  AfPlayerRow,
} from "@/types/football";

/**
 * Raw API-Football client — one method per endpoint, nothing else.
 * Mapping to UI types lives in football-mapper.ts; scoring in
 * football-calculator.ts.
 *
 * Errors are classified so the UI can show the right message:
 *  - ApiKeyInvalidError   → "API Key Invalid"
 *  - ApiQuotaExceededError→ "API Quota Exceeded"
 *  - Endpoint answering with no rows is NOT an error → caller shows Missing Data
 */

const BASE = "https://v3.football.api-sports.io";
const TZ = "Asia/Bangkok";

export class ApiKeyInvalidError extends Error {
  constructor() {
    super("API Key Invalid");
  }
}

export class ApiQuotaExceededError extends Error {
  constructor() {
    super("API Quota Exceeded");
  }
}

function apiKey(): string {
  const key =
    process.env.API_FOOTBALL_KEY ?? process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
  if (!key) throw new ApiKeyInvalidError();
  return key;
}

async function call<T>(path: string, ttlSeconds: number, keySuffix = ""): Promise<T> {
  return cached(`af:${path}${keySuffix}`, ttlSeconds, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "x-apisports-key": apiKey() },
        signal: controller.signal,
      });
      if (res.status === 429) throw new ApiQuotaExceededError();
      const json = (await res.json()) as { errors: unknown; response: T };

      // API-Football returns HTTP 200 with an `errors` object on auth/plan problems
      const errors = json.errors as Record<string, string> | string[] | undefined;
      if (errors && !Array.isArray(errors) && Object.keys(errors).length > 0) {
        if (errors.token) throw new ApiKeyInvalidError();
        if (errors.requests || errors.rateLimit) throw new ApiQuotaExceededError();
        throw new Error(`api-football: ${JSON.stringify(errors)}`);
      }
      return json.response;
    } finally {
      clearTimeout(timer);
    }
  });
}

/* ----------------------------- endpoints ----------------------------- */

/** 1. GET /fixtures?date=YYYY-MM-DD */
export function getFixturesByDate(date: string) {
  return call<AfFixtureRaw[]>(
    `/fixtures?date=${date}&timezone=${encodeURIComponent(TZ)}`,
    60
  );
}

export function getFixtureById(id: number) {
  return call<AfFixtureRaw[]>(
    `/fixtures?id=${id}&timezone=${encodeURIComponent(TZ)}`,
    60
  );
}

/** 1b. GET /fixtures?team=&last=5 — recent results for Form Analysis */
export function getTeamLastFixtures(teamId: number, last = 5) {
  return call<AfFixtureRaw[]>(
    `/fixtures?team=${teamId}&last=${last}&status=FT&timezone=${encodeURIComponent(TZ)}`,
    6 * 3600
  );
}

/** 1c. GET /fixtures?team=&next=5 — โปรแกรมนัดถัดไปของทีม */
export function getTeamNextFixtures(teamId: number, next = 5) {
  return call<AfFixtureRaw[]>(
    `/fixtures?team=${teamId}&next=${next}&timezone=${encodeURIComponent(TZ)}`,
    3600
  );
}

/** 1d. GET /venues?id= — ข้อมูลสนาม (เมือง+ประเทศ ใช้หาพิกัดอากาศ) cache 30 วัน */
export function getVenueById(venueId: number) {
  return call<AfVenue[]>(`/venues?id=${venueId}`, 30 * 24 * 3600);
}

/** 2. GET /teams/statistics?league=&season=&team= */
export function getTeamStatistics(leagueId: number, season: number, teamId: number) {
  return call<AfTeamStatistics>(
    `/teams/statistics?league=${leagueId}&season=${season}&team=${teamId}`,
    6 * 3600
  );
}

/** 3. GET /fixtures/statistics?fixture= (live/finished matches only) */
export function getFixtureStatistics(fixtureId: number) {
  return call<AfFixtureStatRow[]>(`/fixtures/statistics?fixture=${fixtureId}`, 120);
}

/** 4. GET /fixtures/headtohead?h2h=A-B */
export function getHeadToHead(homeId: number, awayId: number) {
  return call<AfFixtureRaw[]>(
    `/fixtures/headtohead?h2h=${homeId}-${awayId}&last=20&status=FT`,
    24 * 3600
  );
}

/** 5. GET /fixtures/lineups?fixture= */
export function getLineups(fixtureId: number) {
  return call<AfLineupResponse[]>(`/fixtures/lineups?fixture=${fixtureId}`, 300);
}

/** 5b. GET /fixtures/events?fixture= — เหตุการณ์สด (ประตู/ใบ/เปลี่ยนตัว/VAR) */
export function getFixtureEvents(fixtureId: number) {
  return call<AfEventRow[]>(`/fixtures/events?fixture=${fixtureId}`, 60);
}

/** 6. GET /injuries?fixture=  (fallback: /injuries?team=&season=) */
export function getInjuriesByFixture(fixtureId: number) {
  return call<AfInjuryRow[]>(`/injuries?fixture=${fixtureId}`, 6 * 3600);
}

export function getInjuriesByTeam(teamId: number, season: number) {
  return call<AfInjuryRow[]>(`/injuries?team=${teamId}&season=${season}`, 6 * 3600);
}

/** 7. GET /players?team=&season= */
export function getPlayers(teamId: number, season: number) {
  return call<AfPlayerRow[]>(`/players?team=${teamId}&season=${season}`, 12 * 3600);
}

/** 7b. GET /teams?search= — ค้นหาทีมตามชื่อ (อังกฤษ, อย่างน้อย 3 ตัวอักษร) */
export function searchTeams(query: string) {
  return call<AfTeamSearchResult[]>(
    `/teams?search=${encodeURIComponent(query)}`,
    24 * 3600
  );
}

/** 7c. GET /teams?id= — ข้อมูลทีมตาม id */
export function getTeamInfo(teamId: number) {
  return call<AfTeamSearchResult[]>(`/teams?id=${teamId}`, 24 * 3600);
}

/** 8. GET /standings?league=&season= */
export async function getStandings(leagueId: number, season: number) {
  const res = await call<AfStandingsResponse[]>(
    `/standings?league=${leagueId}&season=${season}`,
    6 * 3600
  );
  const map = new Map<number, AfStandingRow>();
  for (const row of res[0]?.league?.standings?.flat() ?? []) map.set(row.team.id, row);
  return map;
}

/** 8b. ตารางคะแนนแบบรักษากลุ่ม — ใช้กับหน้าวิเคราะห์ลีก (บอลโลก = หลายกลุ่ม)
 *  cache สั้นกว่าตัววิเคราะห์ (1 ชม. + key แยก) — แต้มหลังบอลจบต้องขึ้นไว */
export async function getStandingsGroups(
  leagueId: number,
  season: number
): Promise<AfStandingRow[][]> {
  const res = await call<AfStandingsResponse[]>(
    `/standings?league=${leagueId}&season=${season}`,
    3600,
    ":groups"
  );
  return res[0]?.league?.standings ?? [];
}

/** 8c. GET /players/topscorers?league=&season= — ดาวซัลโวของลีก */
export function getTopScorers(leagueId: number, season: number) {
  return call<AfTopScorerRow[]>(
    `/players/topscorers?league=${leagueId}&season=${season}`,
    6 * 3600
  );
}

/** 9. GET /odds?fixture=  (Match Winner, Over/Under, Asian Handicap, BTTS) */
export function getOdds(fixtureId: number) {
  return call<AfOddsResponse[]>(`/odds?fixture=${fixtureId}`, 600);
}

/** 9b. GET /odds?date= — ราคาทุกคู่ของวันในไม่กี่ call (Bet365, แบ่งหน้า) */
export function getOddsForDate(date: string): Promise<AfOddsDateItem[]> {
  return cached(`af:oddsdate:${date}`, 1800, async () => {
    const out: AfOddsDateItem[] = [];
    for (let page = 1; page <= 8; page++) {
      const res = await fetch(
        `${BASE}/odds?date=${date}&bookmaker=8&page=${page}`,
        { headers: { "x-apisports-key": apiKey() }, signal: AbortSignal.timeout(15_000) }
      );
      if (res.status === 429) throw new ApiQuotaExceededError();
      const json = (await res.json()) as {
        errors: unknown;
        response: AfOddsDateItem[];
        paging: { current: number; total: number };
      };
      const errors = json.errors as Record<string, string> | undefined;
      if (errors && !Array.isArray(errors) && Object.keys(errors).length > 0) {
        if (errors.token) throw new ApiKeyInvalidError();
        throw new Error(`api-football: ${JSON.stringify(errors)}`);
      }
      out.push(...(json.response ?? []));
      if (json.paging.current >= json.paging.total) break;
    }
    return out;
  });
}

/** 10. GET /predictions?fixture= */
export function getPredictions(fixtureId: number) {
  return call<AfPredictionResponse[]>(`/predictions?fixture=${fixtureId}`, 3600);
}

/* ----------------------------- helpers ----------------------------- */

export function todayInBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function seasonFor(dateStr: string): number {
  const d = new Date(dateStr);
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
}

/** Classify an error for banner display. */
export function classifyError(err: unknown): string {
  if (err instanceof ApiKeyInvalidError) return "API Key Invalid — ตรวจสอบ API_FOOTBALL_KEY ใน .env";
  if (err instanceof ApiQuotaExceededError) return "API Quota Exceeded — โควตา requests วันนี้หมดแล้ว";
  return (err as Error).message;
}
