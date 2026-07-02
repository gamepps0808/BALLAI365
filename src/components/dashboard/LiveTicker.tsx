"use client";

import Link from "next/link";

/**
 * แถบสกอร์วิ่งบนสุดหน้าแรก — เว็บดู "มีชีวิต" ตั้งแต่วินาทีแรก
 *  - มีบอลสด: วิ่งสกอร์สด (จุดแดงกะพริบ + นาที)
 *  - ไม่มีบอลสด: วิ่งคู่ที่ใกล้เตะ (เวลาเตะ) — แถบไม่หายไปไหน
 * duplicate รายการ 2 ชุดเพื่อ loop ไร้รอยต่อ · hover = หยุด · คลิกไปหน้าแมตช์ได้
 */
export interface TickerItem {
  id: string;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
  live: boolean;
  kickoffLabel: string;
}

export function LiveTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  const speed = Math.max(18, items.length * 7); // รายการน้อย = วิ่งช้าพอดีอ่าน

  return (
    <div className="overflow-hidden border-b border-[var(--border)] bg-[rgba(10,16,30,0.6)]">
      <div
        className="ticker-track flex w-max items-center gap-6 px-4 py-1.5"
        style={{ "--ticker-speed": `${speed}s` } as React.CSSProperties}
      >
        {doubled.map((m, i) => (
          <Link
            key={`${m.id}-${i}`}
            href={`/match/${m.id}`}
            className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            {m.live ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--danger)]" />
                <span>{m.home}</span>
                <span className="tabular font-extrabold text-[var(--text-primary)]">
                  {m.homeGoals ?? 0}-{m.awayGoals ?? 0}
                </span>
                <span>{m.away}</span>
                {m.elapsed != null && (
                  <span className="tabular text-[10px] text-[var(--danger)]">{m.elapsed}&apos;</span>
                )}
              </>
            ) : (
              <>
                <span className="tabular text-[10px] font-bold text-[var(--neon-blue)]">
                  {m.kickoffLabel}
                </span>
                <span>
                  {m.home} <span className="text-[var(--text-muted)]">vs</span> {m.away}
                </span>
              </>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
