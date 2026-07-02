import Link from "next/link";
import { History } from "lucide-react";
import { LedgerEntry } from "@/lib/accuracy";

/**
 * แถบบาง "ผลล่าสุด" บรรทัดเดียว — จุดสีเขียว=ถูก แดง=ผิด (10 คู่ล่าสุด) + อัตราถูก
 * ตัวสร้างความเชื่อใจแบบไม่รก คลิกไปดูสถิติเต็มที่ /backtest
 */
export function RecentResults({ entries }: { entries: LedgerEntry[] }) {
  const graded = entries.filter((e) => e.r1x2 != null);
  const recent = graded.slice(0, 10);
  if (recent.length === 0) return null;
  const won = recent.filter((e) => e.r1x2).length;
  const pct = Math.round((won / recent.length) * 100);
  // ฟอร์มร้อนแรง — ทายถูกติดต่อกันกี่คู่ล่าสุด (โชว์เมื่อ ≥ 3)
  let streak = 0;
  for (const e of graded) {
    if (e.r1x2) streak++;
    else break;
  }

  return (
    <Link
      href="/backtest"
      className="glass glass-hover flex items-center gap-2.5 p-3 text-[12px] text-[var(--text-secondary)]"
    >
      <History size={15} className="shrink-0 text-[var(--neon-blue)]" />
      <span className="font-bold text-[var(--text-primary)]">ผลล่าสุด AI</span>
      <span className="tabular font-extrabold text-[var(--neon-green)]">
        {won}/{recent.length}
      </span>
      <span className="text-[var(--text-muted)]">({pct}%)</span>
      {streak >= 3 && (
        <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10.5px] font-extrabold text-[var(--warning)]">
          🔥 ถูก {streak} คู่ติด
        </span>
      )}
      <span className="ml-1 flex items-center gap-1">
        {recent.map((e, i) => (
          <span
            key={i}
            title={e.r1x2 ? "ถูก" : "ผิด"}
            className={`h-2 w-2 rounded-full ${e.r1x2 ? "bg-[var(--neon-green)]" : "bg-[var(--danger)]"}`}
          />
        ))}
      </span>
      <span className="ml-auto shrink-0 text-[var(--neon-green)]">ดูทั้งหมด →</span>
    </Link>
  );
}
