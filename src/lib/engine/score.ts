import {
  ConfidenceLevel,
  ModelWeights,
  DEFAULT_MODEL_WEIGHTS,
  RiskLevel,
  ValueRating,
  MatchStatus,
} from "../types";

/**
 * AI Scoring Formula — every factor is normalized to 0-100 before weighting.
 * Weights are admin-configurable (see ModelWeights); they must sum to 100.
 */
export interface ScoreFactors {
  teamForm: number;
  homeAwayStrength: number;
  attackDefense: number;
  injuries: number; // 100 = opponent injury crisis favors pick
  oddsMovement: number;
  headToHead: number;
  cornerTrend: number;
  weatherTravelFatigue: number;
}

export function computeAiScore(
  factors: ScoreFactors,
  weights: ModelWeights = DEFAULT_MODEL_WEIGHTS
): number {
  const total =
    factors.teamForm * weights.teamForm +
    factors.homeAwayStrength * weights.homeAwayStrength +
    factors.attackDefense * weights.attackDefense +
    factors.injuries * weights.injuries +
    factors.oddsMovement * weights.oddsMovement +
    factors.headToHead * weights.headToHead +
    factors.cornerTrend * weights.cornerTrend +
    factors.weatherTravelFatigue * weights.weatherTravelFatigue;
  return Math.round(total / 100);
}

/**
 * Confidence is capped by data quality: with incomplete data the engine is
 * never allowed to express high confidence (UI/UX rule #13).
 */
export function deriveConfidence(
  aiScore: number,
  dataQuality: number
): ConfidenceLevel {
  if (dataQuality < 60) return aiScore >= 70 ? "MEDIUM" : "LOW";
  if (aiScore >= 85 && dataQuality >= 80) return "VERY_HIGH";
  if (aiScore >= 75) return "HIGH";
  if (aiScore >= 60) return "MEDIUM";
  return "LOW";
}

export function deriveRiskLevel(riskScore: number): RiskLevel {
  if (riskScore < 30) return "LOW";
  if (riskScore < 55) return "MEDIUM";
  if (riskScore < 75) return "HIGH";
  return "VERY_HIGH";
}

/** Value Bet Detection: edge = AI probability − market implied probability */
export function deriveValue(edgePct: number): {
  rating: ValueRating;
  stars: number;
} {
  if (edgePct >= 10) return { rating: "ELITE_VALUE", stars: 5 };
  if (edgePct >= 6) return { rating: "STRONG_VALUE", stars: 5 };
  if (edgePct >= 3) return { rating: "GOOD_VALUE", stars: 4 };
  if (edgePct >= 1) return { rating: "SMALL_VALUE", stars: 3 };
  return { rating: "NO_VALUE", stars: 2 };
}

export function deriveStatus(
  aiScore: number,
  riskScore: number,
  dataQuality: number
): MatchStatus {
  if (riskScore >= 75 || dataQuality < 40) return "AVOID";
  if (aiScore >= 80) return "ACTIVE";
  if (aiScore >= 65) return "WATCHLIST";
  if (aiScore >= 50) return "WATCHLIST";
  return "REJECTED";
}
