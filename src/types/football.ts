/**
 * TypeScript types for the API-Football integration.
 * - Raw response shapes (Af*) — exactly what v3.football.api-sports.io returns
 * - EndpointStatus — per-fixture record of which endpoints succeeded (Dev Debug Panel)
 * UI-facing normalized types live in src/lib/types.ts and are re-exported here.
 */

export * from "@/lib/types";

/* ------------------------- raw API shapes ------------------------- */

export interface AfTeamRef {
  id: number;
  name: string;
  logo?: string;
  winner?: boolean | null;
}

export interface AfFixtureRaw {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
    referee?: string | null;
    venue?: { id?: number | null; name?: string | null; city?: string | null };
  };
  league: { id: number; season: number; name: string; country: string; logo?: string; round?: string };
  teams: { home: AfTeamRef; away: AfTeamRef };
  goals?: { home: number | null; away: number | null };
}

export interface AfVenue {
  id: number;
  name?: string;
  city?: string;
  country?: string;
}

export interface AfStandingRow {
  rank: number;
  points: number;
  goalsDiff?: number;
  group?: string;
  form: string | null;
  team: AfTeamRef;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

export interface AfStandingsResponse {
  league: { standings: AfStandingRow[][] };
}

export interface AfTeamStatistics {
  form: string | null;
  fixtures: {
    played: { home: number; away: number; total: number };
    wins: { home: number; away: number; total: number };
    draws: { home: number; away: number; total: number };
    loses: { home: number; away: number; total: number };
  };
  goals: {
    for: { average: { home: string; away: string; total: string } };
    against: { average: { home: string; away: string; total: string } };
  };
  clean_sheet: { home: number; away: number; total: number };
  failed_to_score: { home: number; away: number; total: number };
}

export interface AfFixtureStatRow {
  team: AfTeamRef;
  statistics: { type: string; value: number | string | null }[];
}

export interface AfOddsBetValue {
  value: string;
  odd: string;
}

export interface AfOddsBet {
  id: number;
  name: string;
  values: AfOddsBetValue[];
}

export interface AfOddsBookmaker {
  id: number;
  name: string;
  bets: AfOddsBet[];
}

export interface AfOddsResponse {
  bookmakers: AfOddsBookmaker[];
}

export interface AfPredictionResponse {
  predictions: {
    winner: { id: number | null; name: string | null; comment: string | null };
    win_or_draw: boolean;
    under_over: string | null;
    goals: { home: string | null; away: string | null };
    advice: string | null;
    percent: { home: string; draw: string; away: string };
  };
  comparison?: Record<string, { home: string; away: string }>;
}

export interface AfLineupResponse {
  team: AfTeamRef;
  coach: { id: number; name: string } | null;
  formation: string | null;
  startXI: { player: { id: number; name: string; number: number; pos: string | null } }[];
  substitutes: { player: { id: number; name: string; number: number; pos: string | null } }[];
}

export interface AfEventRow {
  time: { elapsed: number; extra: number | null };
  team: AfTeamRef;
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string; // Goal | Card | subst | Var
  detail: string; // Normal Goal, Yellow Card, Substitution 1, ...
  comments: string | null;
}

export interface AfInjuryRow {
  player: { id: number; name: string; type?: string; reason?: string };
  team: AfTeamRef;
}

export interface AfPlayerRow {
  player: {
    id: number;
    name: string;
    photo?: string;
    injured?: boolean;
  };
  statistics: {
    games: { position: string | null; rating: string | null; minutes: number | null };
    goals: { total: number | null; assists: number | null };
  }[];
}

export interface AfTopScorerRow {
  player: { id: number; name: string; photo?: string };
  statistics: {
    team: { id: number; name: string; logo?: string };
    games: { appearences: number | null; minutes: number | null };
    goals: { total: number | null; assists: number | null };
    penalty: { scored: number | null };
  }[];
}

export interface AfOddsDateItem {
  fixture: { id: number };
  league: { id: number; name: string; country?: string; logo?: string };
  bookmakers: AfOddsBookmaker[];
}

export interface AfTeamSearchResult {
  team: { id: number; name: string; country?: string; logo?: string; national?: boolean };
}

/* Bookmaker priority for Asian Handicap / Over-Under (per spec) */
export const PREFERRED_BOOKMAKERS = ["Bet365", "Pinnacle", "1xBet"];
