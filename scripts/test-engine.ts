/** Smoke test: engine must produce sane output from normalized inputs. */
import { buildPrediction } from "../src/lib/engine/predict";
import { teams, leagues } from "../src/lib/mock/data";

const input = {
  home: teams[0], // Man City
  away: teams[1], // Liverpool
  league: leagues[0],
  h2h: { homeWins: 12, draws: 6, awayWins: 8 },
  odds: {
    opening: { time: "10:00", home: 1.95, draw: 3.6, away: 4.0, handicapLine: -0.25, overUnderLine: 2.5 },
    current: { time: "18:00", home: 1.78, draw: 3.7, away: 4.4, handicapLine: -0.25, overUnderLine: 2.5 },
    history: [],
    steamMove: true,
    sharpMoney: true,
    movementNote: "",
    marketProbability: { home: 50, draw: 26, away: 24 },
  },
  homeInjuries: [],
  awayInjuries: [],
  dataSources: [
    { source: "Fixture Data", sourceTh: "", available: true },
    { source: "Odds Data", sourceTh: "", available: true },
    { source: "Historical Data", sourceTh: "", available: true },
    { source: "Player Data", sourceTh: "", available: false },
    { source: "Injury Data", sourceTh: "", available: false },
    { source: "Lineup Data", sourceTh: "", available: false },
  ],
};

const p = buildPrediction(input);
const sum = p.winProbability.home + p.winProbability.draw + p.winProbability.away;
console.log(JSON.stringify({
  pick: p.pickLabel,
  winProb: p.winProbability,
  probSum: sum,
  expectedScore: p.expectedScore,
  handicap: p.handicapPickTeam,
  ou: `${p.overUnderPick} ${p.overUnderLine}`,
  corner: `${p.cornerPick} ${p.cornerLine}`,
  aiScore: p.aiScore,
  confidence: p.confidence,
  risk: `${p.risk} (${p.riskScore})`,
  value: `${p.value} edge=${p.edgePct}%`,
  dataQuality: p.dataQuality,
  reasons: p.reasons,
}, null, 2));

if (Math.abs(sum - 100) > 2) throw new Error("probabilities do not sum to ~100");
if (!p.pickTeamName || p.pickTeamName === "Home") throw new Error("pick must be a team name");
console.log("\n✅ engine smoke test passed");
