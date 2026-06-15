import { FootballDataProvider, providerFetch } from "./provider";
import { Fixture, League, Player, Team } from "../types";

/**
 * football-data.org adapter — skeleton (supplementary source).
 * Covers: fixtures, scores, standings, squads, basic stats.
 */
export class FootballDataOrgProvider implements FootballDataProvider {
  readonly name = "football-data-org";
  private base = "https://api.football-data.org/v4";

  constructor(private apiKey: string) {}

  private headers() {
    return { "X-Auth-Token": this.apiKey };
  }

  async getLeagues(): Promise<League[]> {
    const raw = (await providerFetch(this.name, `${this.base}/competitions`, {
      headers: this.headers(),
    })) as { competitions: FdoCompetition[] };
    return raw.competitions.map(mapCompetition);
  }

  async getTeams(leagueId: string): Promise<Team[]> {
    void leagueId;
    // TODO: GET /competitions/{id}/teams + /competitions/{id}/standings
    throw new Error("FootballDataOrgProvider.getTeams: implement mapping before enabling");
  }

  async getFixtures(date?: string): Promise<Fixture[]> {
    void date;
    // TODO: GET /matches?date={date}
    throw new Error("FootballDataOrgProvider.getFixtures: implement mapping before enabling");
  }

  async getFixtureById(id: string): Promise<Fixture | null> {
    void id;
    throw new Error("FootballDataOrgProvider.getFixtureById: implement mapping before enabling");
  }

  async getPlayers(teamId: string): Promise<Player[]> {
    void teamId;
    // TODO: GET /teams/{id} (squad)
    throw new Error("FootballDataOrgProvider.getPlayers: implement mapping before enabling");
  }
}

interface FdoCompetition {
  id: number;
  name: string;
  type: string;
  area: { name: string };
  emblem?: string;
}

function mapCompetition(raw: FdoCompetition): League {
  return {
    id: `fdo-${raw.id}`,
    name: raw.name,
    nameTh: raw.name,
    country: raw.area.name,
    logo: raw.emblem,
    enabled: false,
    isCup: raw.type === "CUP",
  };
}
