import { Radio } from "lucide-react";
import { Fixture } from "@/lib/types";

/**
 * สถิติในเกม (compact) สำหรับหน้าหลัก — แสดงระหว่าง MATCH DETAIL กับ TACTICAL OVERVIEW
 * เฉพาะเมื่อบอล "เริ่มเตะแล้ว" (LIVE/FINISHED) และมีสถิติจริงจาก API
 * ไม่มีสถิติ/ยังไม่เตะ → ไม่แสดงอะไร (return null)
 */
export function MatchStatsPanel({ fixture }: { fixture: Fixture }) {
  const started = fixture.status === "LIVE" || fixture.status === "FINISHED";
  const stats = fixture.liveStats ?? [];
  if (!started || stats.length === 0) return null;
  const live = fixture.status === "LIVE";

  return (
    <section className="glass p-4">
      <p className="flex items-center justify-between text-[11px] font-bold">
        <span>{fixture.homeTeam.shortName}</span>
        <span className="flex items-center gap-1 font-normal text-[var(--text-muted)]">
          {live && <Radio size={10} className="animate-pulse text-[var(--danger)]" />}
          สถิติในเกม
        </span>
        <span>{fixture.awayTeam.shortName}</span>
      </p>
      <div className="mt-3 space-y-2">
        {stats.map((s) => {
          const total = s.home + s.away;
          const hPct = total > 0 ? (s.home / total) * 100 : 50;
          return (
            <div key={s.type}>
              <div className="flex justify-between text-[11px]">
                <span className="tabular font-bold">{s.home}{s.isPercent ? "%" : ""}</span>
                <span className="text-[var(--text-muted)]">{s.labelTh}</span>
                <span className="tabular font-bold">{s.away}{s.isPercent ? "%" : ""}</span>
              </div>
              <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div className="bg-[var(--neon-blue)]" style={{ width: `${hPct}%` }} />
                <div className="bg-[var(--danger)]" style={{ width: `${100 - hPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
