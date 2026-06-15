/**
 * Normalized data model — every API provider maps into these types.
 * UI and AI engine depend ONLY on these, never on a provider's raw shape.
 */

export type FormResult = "W" | "D" | "L";

export interface League {
  id: string;
  name: string;
  nameTh: string;
  country: string;
  logo?: string;
  enabled: boolean;
  isCup: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  leagueId: string;
  rank: number;
  points: number;
  /** อันดับโลก FIFA (ทีมชาติ) — จาก Claude เมื่อ API ไม่มีข้อมูล */
  fifaRank?: number | null;
  form: FormResult[]; // most recent first
  power: TeamPowerRating;
  statsAvg: TeamStatsAvg;
}

export interface TeamPowerRating {
  overall: number;
  attack: number;
  defense: number;
  homeStrength: number;
  awayStrength: number;
  pressing: number;
  setPiece: number;
  corner: number;
  injuryImpact: number; // 0 = no impact, 100 = devastated
  squadDepth: number;
  fitness: number;
  tacticalStability: number;
}

export interface TeamStatsAvg {
  goalsFor: number;
  goalsAgainst: number;
  possession: number; // %
  shots: number;
  corners: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  position: string;
  positionTh: string;
  rating: number;
  goals: number;
  assists: number;
  fitness: number; // %
  photo?: string;
  isKeyPlayer: boolean;
  status: "fit" | "injured" | "suspended" | "doubtful";
}

export interface H2H {
  homeWins: number;
  draws: number;
  awayWins: number;
}

export interface RecentMatch {
  result: FormResult;
  score: string;
  opponentShort: string;
}

export interface WeatherInfo {
  /** true = ข้อมูลจริงจาก OpenWeather (false/undefined = ยังไม่มีข้อมูล) */
  hasData?: boolean;
  temperatureC: number;
  rainProbability: number; // %
  windKmh: number;
  humidity: number; // %
  impactScore: number; // 0-100, higher = more disruption
  impactNote: string;
}

export interface OddsPoint {
  time: string; // ISO or HH:mm label
  home: number;
  draw: number;
  away: number;
  handicapLine: number;
  overUnderLine: number;
}

export interface OddsAnalysis {
  opening: OddsPoint;
  current: OddsPoint;
  history: OddsPoint[];
  steamMove: boolean;
  sharpMoney: boolean;
  movementNote: string;
  marketProbability: { home: number; draw: number; away: number };
  /** ราคาจริงของแต่ละตลาดจาก API (undefined = เจ้ามือไม่เปิดตลาดนั้น) */
  markets?: MarketPrices;
}

export interface MarketPrices {
  overUnder?: { line: number; overOdd: number; underOdd: number; bookmaker: string };
  asianHandicap?: { line: number; homeOdd: number; awayOdd: number; bookmaker: string };
  btts?: { yes: number; no: number; bookmaker: string };
}

export type ConfidenceLevel = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
export type ValueRating =
  | "NO_VALUE"
  | "SMALL_VALUE"
  | "GOOD_VALUE"
  | "STRONG_VALUE"
  | "ELITE_VALUE";
export type MatchStatus = "ACTIVE" | "WATCHLIST" | "REJECTED" | "AVOID";
export type PickSide = "HOME" | "DRAW" | "AWAY";

export interface CornerAnalysis {
  /** false = no real corner data from the API (UI shows Missing Data, never 0) */
  hasData: boolean;
  homeForAvg: number;
  homeAgainstAvg: number;
  awayForAvg: number;
  awayAgainstAvg: number;
  firstHalfAvg: number;
  secondHalfAvg: number;
  leagueAvg: number;
  totalProjection: number;
  line: number;
  pick: "OVER" | "UNDER";
  confidencePct: number;
}

export type EndpointName =
  | "fixtures"
  | "teamStatistics"
  | "fixtureStatistics"
  | "h2h"
  | "odds"
  | "predictions"
  | "lineups"
  | "injuries"
  | "players"
  | "standings";

/** Per-fixture record of which endpoints returned data (Dev Debug Panel). */
export interface EndpointStatus {
  endpoint: EndpointName;
  ok: boolean;
  /** "missing" = endpoint answered but had no data (NOT an error) */
  state: "ok" | "missing" | "error" | "skipped";
  note?: string;
}

export interface LineupPlayer {
  name: string;
  number: number | null;
  pos: string | null; // G/D/M/F จาก API
}

export interface LineupInfo {
  formation: string | null;
  coach: string | null;
  confirmed: boolean;
  startXI: string[];
  /** 11 ตัวจริงพร้อมเบอร์เสื้อ+ตำแหน่ง (ใช้แสดงรายชื่อเต็ม) */
  startXIDetail?: LineupPlayer[];
  bench: string[];
}

export interface MatchEvent {
  minute: number;
  extra: number | null;
  side: "HOME" | "AWAY";
  teamName: string;
  type: "GOAL" | "CARD" | "SUBST" | "VAR";
  /** ป้ายไทย เช่น "ประตู", "ใบเหลือง", "เปลี่ยนตัว" */
  detailTh: string;
  detail: string;
  player: string | null;
  assist: string | null;
}

export interface LiveStatPair {
  type: string;
  labelTh: string;
  home: number; // ตัวเลขเทียบ (possession = %)
  away: number;
  isPercent: boolean;
}

export interface DataSourceFlag {
  source: string;
  sourceTh: string;
  available: boolean;
}

export interface Prediction {
  pick: PickSide;
  pickTeamName: string; // ALWAYS the team name, never "Home Win"
  pickLabel: string; // e.g. "MANCHESTER CITY WIN"
  winProbability: { home: number; draw: number; away: number };
  expectedScore: { home: number; away: number };
  /** null = no Asian Handicap market from the API — UI must show "ไม่มีข้อมูลแฮนดิแคป" */
  handicapLine: number | null; // negative = home gives
  handicapPickTeam: string | null; // e.g. "Man City -0.25"
  /** null = no Goals Over/Under market — UI must show "ไม่มีข้อมูลสูงต่ำ" */
  overUnderLine: number | null;
  overUnderPick: "OVER" | "UNDER" | null;
  /** ที่มา/ความมั่นใจของ O/U pick เช่น "โมเดลให้ Over 61%" */
  overUnderNote?: string | null;
  /** null = no corner statistics — UI must show "ไม่มีข้อมูลเตะมุม" */
  cornerLine: number | null;
  cornerPick: "OVER" | "UNDER" | null;
  aiScore: number; // 0-100
  confidence: ConfidenceLevel;
  risk: RiskLevel;
  riskScore: number; // 0-100
  value: ValueRating;
  valueStars: number; // 1-5
  edgePct: number; // AI prob - market prob
  dataQuality: number; // 0-100
  status: MatchStatus;
  reasons: string[]; // plain-language, Thai
  riskFactors: string[];
  warning: string;
  modelOutputs: ModelOutput[];
}

export interface ModelOutput {
  model: string;
  modelTh: string;
  homeProb: number;
  drawProb: number;
  awayProb: number;
  weight: number;
}

export interface Fixture {
  id: string;
  leagueId: string;
  kickoff: string; // ISO
  kickoffLabel: string; // "19:30"
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "CANCELLED" | "POSTPONED";
  /** true = สนามกลาง (ทัวร์นาเมนต์ทีมชาติ) — ห้ามให้แต้มต่อเจ้าบ้าน */
  neutralVenue?: boolean;
  /** นาทีการแข่ง (เฉพาะตอน LIVE) */
  elapsed?: number | null;
  /** ข้อมูลแมตช์ทั่วไปจาก API (null/undefined = ไม่มีข้อมูล) */
  venueName?: string | null;
  venueCity?: string | null;
  referee?: string | null;
  round?: string | null;
  /** actual score from the API (null until the match starts) */
  homeGoals?: number | null;
  awayGoals?: number | null;
  homeTeamId: string;
  awayTeamId: string;
  /** Denormalized objects — components must read these, never a mock store. */
  league: League;
  homeTeam: Team;
  awayTeam: Team;
  homeKeyPlayer?: Player;
  awayKeyPlayer?: Player;
  homeInjuries: Player[];
  awayInjuries: Player[];
  homeLineup?: LineupInfo;
  awayLineup?: LineupInfo;
  endpointStatus?: EndpointStatus[];
  /** เหตุการณ์สด/หลังจบ (เฉพาะหน้ารายละเอียด) */
  events?: MatchEvent[];
  /** สถิติสดเทียบสองทีม (เฉพาะหน้ารายละเอียด หลังเริ่มเตะ) */
  liveStats?: LiveStatPair[];
  h2h: H2H;
  homeRecent: RecentMatch[];
  awayRecent: RecentMatch[];
  weather: WeatherInfo;
  odds: OddsAnalysis;
  corners: CornerAnalysis;
  dataSources: DataSourceFlag[];
  prediction: Prediction;
  isMatchOfTheDay: boolean;
  alert?: string;
}

/** แถวบอลรายวันแบบเบา — ไม่มีการวิเคราะห์ AI (0 token) แค่โปรแกรม+ราคา */
export interface LiteFixture {
  id: string; // af-{fixtureId}
  afId: number;
  kickoff: string;
  kickoffLabel: string;
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "CANCELLED" | "POSTPONED";
  leagueName: string;
  leagueCountry: string;
  leagueLogo?: string;
  homeName: string;
  awayName: string;
  homeLogo?: string;
  awayLogo?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  /** นาทีการแข่ง (เฉพาะแมตช์สด) */
  elapsed?: number | null;
  /** Asian Handicap (มุมมองทีมแรก) — null = เจ้ามือไม่เปิดตลาด */
  ahLine: number | null;
  ahHome: number | null;
  ahAway: number | null;
  mwHome: number | null;
  mwDraw: number | null;
  mwAway: number | null;
  /** คู่ใหญ่ที่ AI คัดให้วิเคราะห์เชิงลึก */
  isBig: boolean;
}

export interface AccuracyStats {
  overall: number;
  oneXTwo: number;
  handicap: number;
  overUnder: number;
  corners: number;
  correctScore: number;
  last7Days: { date: string; accuracy: number }[];
}

export interface OverviewStats {
  totalMatches: number;
  aiRecommended: number;
  highConfidence: number;
  valueBets: number;
  highRisk: number;
  aiAccuracy7d: number;
}

export interface ModelWeights {
  teamForm: number;
  homeAwayStrength: number;
  attackDefense: number;
  injuries: number;
  oddsMovement: number;
  headToHead: number;
  cornerTrend: number;
  weatherTravelFatigue: number;
}

export const DEFAULT_MODEL_WEIGHTS: ModelWeights = {
  teamForm: 20,
  homeAwayStrength: 15,
  attackDefense: 15,
  injuries: 15,
  oddsMovement: 10,
  headToHead: 10,
  cornerTrend: 10,
  weatherTravelFatigue: 5,
};

export const DISCLAIMER_TH =
  "การวิเคราะห์นี้เป็นการประเมินจากสถิติและ AI เท่านั้น ผลการแข่งขันฟุตบอลมีความไม่แน่นอน ควรใช้วิจารณญาณและบริหารความเสี่ยงเสมอ";
export const DISCLAIMER_EN =
  "AI analysis is for informational purposes only. Football results are uncertain. Use risk management.";
