import { Radio, RefreshCw } from "lucide-react";
import { Fixture, MatchEvent } from "@/lib/types";

/**
 * LIVE CENTER — ไทม์ไลน์เหตุการณ์ + สถิติสดเทียบสองทีม (ข้อมูลจริงจาก API)
 * แสดงเฉพาะแมตช์ที่เริ่มเตะแล้ว — สด: อัปเดตพร้อมรีเฟรชหน้า / จบแล้ว: เป็นสรุปเหตุการณ์
 */
export function LiveCenter({ fixture }: { fixture: Fixture }) {
  if (fixture.status !== "LIVE" && fixture.status !== "FINISHED") return null;
  const events = fixture.events ?? [];
  const stats = fixture.liveStats ?? [];
  const live = fixture.status === "LIVE";

  return (
    <section className="glass p-4">
      <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-wider">
        <span className="mr-1 text-[var(--neon-blue)]">▎</span>
        {live ? "LIVE CENTER — เหตุการณ์สด" : "MATCH TIMELINE — สรุปเหตุการณ์"}
        {live && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--danger)]">
            <Radio size={11} className="animate-pulse" /> LIVE
            {fixture.elapsed != null && <span className="tabular">นาทีที่ {fixture.elapsed}</span>}
          </span>
        )}
        {live && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-normal text-[var(--text-muted)]">
            <RefreshCw size={10} /> อัปเดตอัตโนมัติทุก 1 นาที
          </span>
        )}
      </h2>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {/* ไทม์ไลน์ */}
        <div>
          <p className="mb-2 text-[11px] font-bold text-[var(--text-secondary)]">
            เหตุการณ์สำคัญ{" "}
            <span className="font-normal text-[var(--text-muted)]">
              (ประตู · ใบเหลือง/แดง · เปลี่ยนตัว · VAR)
            </span>
          </p>
          {events.length === 0 ? (
            <p className="rounded-lg bg-[var(--bg-elevated)] p-4 text-center text-[11px] text-[var(--text-muted)]">
              ยังไม่มีเหตุการณ์สำคัญ
            </p>
          ) : (
            <ul className="space-y-1.5">
              {events.map((e, i) => (
                <EventRow key={i} e={e} homeName={fixture.homeTeam.shortName} awayName={fixture.awayTeam.shortName} />
              ))}
            </ul>
          )}
        </div>

        {/* สถิติสด */}
        <div>
          <p className="mb-2 flex justify-between text-[11px] font-bold text-[var(--text-secondary)]">
            <span>{fixture.homeTeam.shortName}</span>
            <span className="font-normal text-[var(--text-muted)]">สถิติในเกม</span>
            <span>{fixture.awayTeam.shortName}</span>
          </p>
          {stats.length === 0 ? (
            <p className="rounded-lg bg-[var(--bg-elevated)] p-4 text-center text-[11px] text-[var(--text-muted)]">
              สถิติยังไม่เข้า (ช่วงนาทีแรกอาจยังไม่มีข้อมูล)
            </p>
          ) : (
            <div className="space-y-2">
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
          )}
        </div>
      </div>
    </section>
  );
}

function eventIcon(e: MatchEvent): string {
  if (e.type === "GOAL") return e.detail === "Missed Penalty" ? "❌" : "⚽";
  if (e.type === "CARD") return e.detail === "Red Card" ? "🟥" : "🟨";
  if (e.type === "VAR") return "📺";
  return "🔄";
}

function EventRow({ e, homeName, awayName }: { e: MatchEvent; homeName: string; awayName: string }) {
  return (
    <li
      className={`flex items-center gap-2 rounded-md bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[12px] ${
        e.side === "AWAY" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <span className="tabular w-10 shrink-0 text-[11px] font-black text-[var(--neon-blue)]">
        {e.minute}{e.extra ? `+${e.extra}` : ""}&apos;
      </span>
      <span className="shrink-0">{eventIcon(e)}</span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">
          {e.player ?? e.detailTh}
          {e.type === "SUBST" && e.assist && (
            <span className="font-normal text-[var(--text-muted)]"> ⟵ {e.assist}</span>
          )}
          {e.type === "GOAL" && e.assist && (
            <span className="font-normal text-[var(--text-muted)]"> (แอสซิสต์ {e.assist})</span>
          )}
        </span>
        <span className="block text-[10px] text-[var(--text-muted)]">
          {e.detailTh} · {e.side === "HOME" ? homeName : awayName}
        </span>
      </span>
    </li>
  );
}
