import { FootballDataProvider, WeatherProvider } from "./provider";
import { Fixture, League, Player, Team, WeatherInfo } from "../types";
import { fixtures, leagues, players, teams } from "../mock/data";

/** Default provider until real API keys are configured — serves mock data. */
export class MockProvider implements FootballDataProvider, WeatherProvider {
  readonly name = "mock";

  async getLeagues(): Promise<League[]> {
    return leagues;
  }

  async getTeams(leagueId: string): Promise<Team[]> {
    return teams.filter((t) => t.leagueId === leagueId);
  }

  async getFixtures(): Promise<Fixture[]> {
    return fixtures;
  }

  async getFixtureById(id: string): Promise<Fixture | null> {
    return fixtures.find((f) => f.id === id) ?? null;
  }

  async getPlayers(teamId: string): Promise<Player[]> {
    return players.filter((p) => p.teamId === teamId);
  }

  async getMatchWeather(): Promise<WeatherInfo> {
    return {
      temperatureC: 18,
      rainProbability: 40,
      windKmh: 12,
      humidity: 72,
      impactScore: 22,
      impactNote: "สภาพอากาศมีผลกระทบต่ำ",
    };
  }
}
