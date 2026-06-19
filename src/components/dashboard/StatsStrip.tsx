import { OverviewStats } from "@/lib/types";

/**
 * แถบสถิติย่อ — โชว์บนมือถือเท่านั้น (lg:hidden) วางไว้ล่างสุดของหน้าหลัก
 * แทนการ์ดสถิติ 6 อันที่เคยกินที่ด้านบน — เหลือแก่นที่เป็น trust signal
 */
export function StatsStrip({ stats }: { stats: OverviewStats }) {
  const items: { label: string; value: string; color: string }[] = [
    { label: "ความแม่น AI", value: stats.aiAccuracy7d != null ? `${stats.aiAccuracy7d}%` : "—", color: "var(--neon-green)" },
    { label: "คู่วันนี้", value: `${stats.totalMatches}`, color: "var(--text-primary)" },
    { label: "AI แนะนำ", value: `${stats.aiRecommended}`, color: "var(--neon-blue)" },
    { label: "มั่นใจสูง", value: `${stats.highConfidence}`, color: "var(--soft-purple)" },
  ];
  return (
    <section className="glass flex items-center justify-around px-2 py-2.5 lg:hidden">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center text-center">
          <span className="tabular text-[15px] font-bold leading-none" style={{ color: it.color }}>
            {it.value}
          </span>
          <span className="mt-1 text-[10px] text-[var(--text-muted)]">{it.label}</span>
        </div>
      ))}
    </section>
  );
}
