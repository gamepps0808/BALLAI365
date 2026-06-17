import {
  ListChecks,
  Sparkles,
  Gauge,
  Gem,
  TriangleAlert,
  Target,
} from "lucide-react";
import { OverviewStats } from "@/lib/types";

export function OverviewCards({ stats }: { stats: OverviewStats }) {
  const cards = [
    { label: "คู่ทั้งหมดวันนี้", value: `${stats.totalMatches} คู่`, icon: ListChecks, color: "var(--neon-green)" },
    { label: "AI แนะนำ", value: `${stats.aiRecommended} คู่`, icon: Sparkles, color: "var(--neon-blue)" },
    { label: "ความมั่นใจสูง", value: `${stats.highConfidence} คู่`, icon: Gauge, color: "var(--soft-purple)" },
    { label: "Value Bet เด่น", value: `${stats.valueBets} คู่`, icon: Gem, color: "var(--gold)" },
    { label: "ความเสี่ยงสูง", value: `${stats.highRisk} คู่`, icon: TriangleAlert, color: "var(--danger)" },
    { label: "AI Accuracy", value: stats.aiAccuracy7d != null ? `${stats.aiAccuracy7d}%` : "—", sub: "ทายผล 7 วันล่าสุด", icon: Target, color: "var(--neon-blue)" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className="glass glass-hover flex items-center gap-3 p-3.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
          >
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] text-[var(--text-secondary)]">{label}</p>
            <p className="tabular text-lg font-bold leading-tight">
              {value}
              {sub && (
                <span className="ml-1 text-[10px] font-normal text-[var(--text-muted)]">{sub}</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
