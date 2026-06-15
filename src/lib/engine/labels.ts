import { ConfidenceLevel, RiskLevel, ValueRating, MatchStatus } from "../types";

/** Central badge/colour mapping so every component renders states identically. */

export type Tone = "green" | "blue" | "orange" | "red" | "darkred" | "gold" | "muted";

export const toneClasses: Record<Tone, string> = {
  green: "bg-[var(--neon-green-soft)] text-[var(--neon-green)] border-[rgba(61,255,139,0.3)]",
  blue: "bg-[var(--neon-blue-soft)] text-[var(--neon-blue)] border-[rgba(47,129,247,0.3)]",
  orange: "bg-[var(--warning-soft)] text-[var(--warning)] border-[rgba(255,159,67,0.3)]",
  red: "bg-[var(--danger-soft)] text-[var(--danger)] border-[rgba(255,77,94,0.3)]",
  darkred: "bg-[rgba(180,30,45,0.25)] text-[#ff8a94] border-[rgba(255,77,94,0.45)]",
  gold: "bg-[var(--gold-soft)] text-[var(--gold)] border-[rgba(245,197,66,0.3)]",
  muted: "bg-[rgba(91,108,140,0.15)] text-[var(--text-secondary)] border-[var(--border-subtle)]",
};

/** AI Score tiers: 80-100 green Strong / 65-79 blue Watchlist / 50-64 orange Medium / <50 red Avoid */
export function aiScoreTone(score: number): Tone {
  if (score >= 80) return "green";
  if (score >= 65) return "blue";
  if (score >= 50) return "orange";
  return "red";
}

export function aiScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Watchlist";
  if (score >= 50) return "Medium";
  return "Avoid";
}

export const confidenceLabel: Record<ConfidenceLevel, string> = {
  VERY_HIGH: "VERY HIGH",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
};

export const confidenceTone: Record<ConfidenceLevel, Tone> = {
  VERY_HIGH: "green",
  HIGH: "green",
  MEDIUM: "orange",
  LOW: "muted",
};

export const riskLabel: Record<RiskLevel, string> = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  VERY_HIGH: "VERY HIGH",
};

export const riskTone: Record<RiskLevel, Tone> = {
  LOW: "green",
  MEDIUM: "orange",
  HIGH: "red",
  VERY_HIGH: "darkred",
};

export const valueLabel: Record<ValueRating, string> = {
  NO_VALUE: "NO VALUE",
  SMALL_VALUE: "SMALL VALUE",
  GOOD_VALUE: "GOOD VALUE",
  STRONG_VALUE: "STRONG VALUE",
  ELITE_VALUE: "ELITE VALUE",
};

export const valueTone: Record<ValueRating, Tone> = {
  NO_VALUE: "muted",
  SMALL_VALUE: "blue",
  GOOD_VALUE: "green",
  STRONG_VALUE: "gold",
  ELITE_VALUE: "gold",
};

export const statusLabel: Record<MatchStatus, string> = {
  ACTIVE: "ACTIVE",
  WATCHLIST: "WATCHLIST",
  REJECTED: "REJECTED",
  AVOID: "AVOID",
};

export const statusTone: Record<MatchStatus, Tone> = {
  ACTIVE: "green",
  WATCHLIST: "blue",
  REJECTED: "muted",
  AVOID: "red",
};
