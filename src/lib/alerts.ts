import { Fixture } from "./types";

/**
 * Match Alert System — เงื่อนไขแจ้งเตือนจากข้อมูลจริงของรอบวันปัจจุบัน
 * ใช้ร่วมกันทั้งหน้าการแจ้งเตือน, /api/alerts และกระดิ่งบน Topbar
 */

export type AlertType = "AI_SCORE" | "VALUE" | "ODDS_MOVE" | "RISK" | "AVOID";

export interface AlertItem {
  type: AlertType;
  message: string;
  fixtureId: string;
  match: string; // "Home vs Away"
  kickoffLabel: string;
}

export function buildAlerts(fixtures: Fixture[]): AlertItem[] {
  return fixtures.flatMap((f) => {
    const p = f.prediction;
    const base = {
      fixtureId: f.id,
      match: `${f.homeTeam.shortName} vs ${f.awayTeam.shortName}`,
      kickoffLabel: f.kickoffLabel,
    };
    const items: AlertItem[] = [];
    if (p.aiScore > 75)
      items.push({ ...base, type: "AI_SCORE", message: `AI Score ${p.aiScore} — ${p.pickLabel}` });
    if (p.value === "STRONG_VALUE" || p.value === "ELITE_VALUE")
      items.push({
        ...base,
        type: "VALUE",
        message: `Value Bet เด่น (Edge ${p.edgePct >= 0 ? "+" : ""}${p.edgePct}%)`,
      });
    if (f.odds.steamMove) items.push({ ...base, type: "ODDS_MOVE", message: f.odds.movementNote });
    if (p.risk === "HIGH" || p.risk === "VERY_HIGH")
      items.push({ ...base, type: "RISK", message: `ความเสี่ยงสูง: ${p.riskFactors[0] ?? ""}` });
    if (p.status === "AVOID")
      items.push({ ...base, type: "AVOID", message: "คู่นี้ควรหลีกเลี่ยง ข้อมูลไม่ครบหรือเสี่ยงสูง" });
    return items;
  });
}
