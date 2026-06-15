import { Fixture, League, Team, Player, WeatherInfo } from "../types";

/**
 * Data Normalization Layer.
 *
 * Every external API (API-Football, Sportmonks, football-data.org, OpenWeather)
 * is wrapped in a class implementing FootballDataProvider. Business logic and
 * UI never touch a provider's raw response — they only see normalized types
 * from src/lib/types.ts, so swapping providers is a one-line config change.
 */
export interface FootballDataProvider {
  readonly name: string;
  getLeagues(): Promise<League[]>;
  getTeams(leagueId: string): Promise<Team[]>;
  /** อ่านข้อมูล + ใช้ผลวิเคราะห์ AI ที่เซฟไว้เท่านั้น (ห้ามเรียก AI ใหม่) */
  getFixtures(date?: string): Promise<Fixture[]>;
  getFixtureById(id: string): Promise<Fixture | null>;
  getPlayers(teamId: string): Promise<Player[]>;
  /** เหมือน getFixtures แต่อนุญาตให้เรียก AI วิเคราะห์คู่ใหม่ได้ — ใช้เฉพาะหน้าหลัก/cron */
  getFixturesWithAnalysis?(date?: string): Promise<Fixture[]>;
}

export interface WeatherProvider {
  readonly name: string;
  getMatchWeather(lat: number, lon: number, kickoffIso: string): Promise<WeatherInfo>;
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    public status: number,
    message: string
  ) {
    super(`[${provider}] ${message}`);
  }
}

/** Shared fetch helper with timeout + rate-limit awareness. */
export async function providerFetch(
  provider: string,
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (res.status === 429) {
      throw new ProviderError(provider, 429, "Rate limit reached — backing off");
    }
    if (!res.ok) {
      throw new ProviderError(provider, res.status, `HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
