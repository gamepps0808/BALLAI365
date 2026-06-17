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
    // มือถือ: ชิปกระชับ 3 คอลัมน์ (ไอคอนบน · เลขเด่น · ป้ายเล็ก) = 2 แถว ไม่รก
    // จอใหญ่: การ์ดแนวนอนเต็มเหมือนเดิม
    <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-6">
      {cards.map(({ label, value, sub, icon: Icon, color }) => (
        <div
          key={label}
          className="glass glass-hover flex flex-col items-center gap-1 p-2.5 text-center sm:flex-row sm:items-center sm:gap-3 sm:p-3.5 sm:text-left"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <p className="tabular text-[15px] font-bold leading-tight sm:text-lg">{value}</p>
            <p className="truncate text-[10px] text-[var(--text-secondary)] sm:text-[11px]">
              {label}
              {sub && (
                <span className="ml-1 hidden font-normal text-[var(--text-muted)] sm:inline">
                  · {sub}
                </span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
