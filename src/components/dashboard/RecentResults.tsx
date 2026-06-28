import Link from "next/link";
import { CheckCircle2, XCircle, History } from "lucide-react";
import { LedgerEntry } from "@/lib/accuracy";

/**
 * "ผลล่าสุด — AI แม่นแค่ไหน" — โชว์คู่ที่ตัดสินแล้วล่าสุด (ถูก ✅ / ผิด ❌)
 * ตัวสร้างความเชื่อใจ: ผู้ใช้เห็นว่า AI ทายถูกจริงเมื่อวาน → กล้าตามวันนี้
 */
export function RecentResults({ entries }: { entries: LedgerEntry[] }) {
  const recent = entries.filter((e) => e.r1x2 != null).slice(0, 8);
  if (recent.length === 0) return null;
  const won = recent.filter((e) => e.r1x2).length;
  const pct = Math.round((won / recent.length) * 100);

  return (
    <section className="glass p-4">
      <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-[var(--text-primary)]">
        <History size={16} className="text-[var(--neon-blue)]" /> ผลล่าสุด
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-normal text-[var(--text-muted)]">
          ทายถูก{" "}
          <span className="tabular font-extrabold text-[var(--neon-green)]">
            {won}/{recent.length}
          </span>
          <span className="text-[var(--text-muted)]">({pct}%)</span>
        </span>
      </h2>
      <div className="mt-3 space-y-1.5">
        {recent.map((e) => (
          <Link
            key={e.id}
            href={`/match/${e.id}`}
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-[12px] transition hover:bg-[rgba(255,255,255,0.04)]"
          >
            {e.r1x2 ? (
              <CheckCircle2 size={15} className="shrink-0 text-[var(--neon-green)]" />
            ) : (
              <XCircle size={15} className="shrink-0 text-[var(--danger)]" />
            )}
            <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
              {e.home}{" "}
              <span className="tabular font-bold text-[var(--text-primary)]">
                {e.actualHome ?? "-"}-{e.actualAway ?? "-"}
              </span>{" "}
              {e.away}
            </span>
            <span className="shrink-0 text-[10.5px] text-[var(--text-muted)]">
              ทาย {e.pickTeamName ?? "เสมอ"}
            </span>
          </Link>
        ))}
      </div>
      <Link
        href="/backtest"
        className="mt-2.5 inline-block text-[11px] text-[var(--neon-green)] hover:underline"
      >
        ดูสถิติความแม่นทั้งหมด →
      </Link>
    </section>
  );
}
