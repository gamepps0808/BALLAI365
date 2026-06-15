import { FootballDataProvider } from "./provider";
import { MockProvider } from "./mock-provider";
import { ApiFootballProvider } from "./api-football";
import { SportmonksProvider } from "./sportmonks";
import { FootballDataOrgProvider } from "./football-data-org";

/**
 * Provider registry — selection is config-driven (DATA_PROVIDER env var),
 * never hard-coded in business logic. Defaults to mock data until real
 * API keys are configured.
 */
export function getDataProvider(): FootballDataProvider {
  const choice = process.env.DATA_PROVIDER ?? "mock";

  switch (choice) {
    case "api-football": {
      // key is read from env inside the client (API_FOOTBALL_KEY or NEXT_PUBLIC_API_FOOTBALL_KEY)
      return new ApiFootballProvider();
    }
    case "sportmonks": {
      const key = process.env.SPORTMONKS_KEY;
      if (!key) throw new Error("SPORTMONKS_KEY is not set");
      return new SportmonksProvider(key);
    }
    case "football-data-org": {
      const key = process.env.FOOTBALL_DATA_ORG_KEY;
      if (!key) throw new Error("FOOTBALL_DATA_ORG_KEY is not set");
      return new FootballDataOrgProvider(key);
    }
    default:
      return new MockProvider();
  }
}
