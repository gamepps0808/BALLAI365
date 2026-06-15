import { FootballDataProvider, providerFetch } from "./provider";
import { Fixture, League, Player, Team } from "../types";

/**
 * Sportmonks adapter — skeleton.
 * Covers: fixtures, lineups, player/team stats, xG (plan-dependent), odds, injuries.
 */
export class SportmonksProvider implements FootballDataProvider {
  readonly name = "sportmonks";
  private base = "https://api.sportmonks.com/v3/football";

  constructor(private apiKey: string) {}

  private url(path: string, params = "") {
    return `${this.base}${path}?api_token=${this.apiKey}${params}`;
  }

  async getLeagues(): Promise<League[]> {
    const raw = (await providerFetch(this.name, this.url("/leagues"))) as {
      data: SportmonksLeague[];
    };
    return raw.data.map(mapLeague);
  }

  async getTeams(leagueId: string): Promise<Team[]> {
    void leagueId;
    // TODO: GET /teams/seasons/{seasonId}?include=statistics
    throw new Error("SportmonksProvider.getTeams: implement mapping before enabling");
  }

  async getFixtures(date?: string): Promise<Fixture[]> {
    void date;
    // TODO: GET /fixtures/date/{date}?include=odds;lineups;participants;statistics
    throw new Error("SportmonksProvider.getFixtures: implement mapping before enabling");
  }

  async getFixtureById(id: string): Promise<Fixture | null> {
    void id;
    throw new Error("SportmonksProvider.getFixtureById: implement mapping before enabling");
  }

  async getPlayers(teamId: string): Promise<Player[]> {
    void teamId;
    // TODO: GET /squads/teams/{teamId}?include=player.statistics
    throw new Error("SportmonksProvider.getPlayers: implement mapping before enabling");
  }
}

interface SportmonksLeague {
  id: number;
  name: string;
  sub_type: string;
  image_path?: string;
}

function mapLeague(raw: SportmonksLeague): League {
  return {
    id: `sm-${raw.id}`,
    name: raw.name,
    nameTh: raw.name,
    country: "",
    logo: raw.image_path,
    enabled: false,
    isCup: raw.sub_type === "cup",
  };
}
