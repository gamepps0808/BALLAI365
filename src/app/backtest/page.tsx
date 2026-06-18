import { History } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { AccuracyChart } from "@/components/match/AccuracyChart";
import { settlePending, getAccuracySummary, LedgerEntry, MarketAccuracy } from "@/lib/accuracy";

export const dynamic = "force-dynamic";

/**
 * Backtest & Accuracy — ความแม่นจริงของ AI จาก ledger
 * (คำทายถูกบันทึกตอนวิเคราะห์ แล้วตัดสินกับสกอร์จริงจาก API หลังจบแมตช์)
 */
export default async function BacktestPage() {
  await settlePending().catch(() => 0); // ตัดสินคู่ที่เพิ่งจบ (มี cache 30 นาที)
  const acc = getAccuracySummary();

  const markets: { label: string; m: MarketAccuracy }[] = [
    { label: "1X2", m: acc.oneXTwo },
    { label: "HANDICAP", m: acc.handicap },
    { label: "OVER / UNDER", m: acc.overUnder },
    { label: "CORNERS", m: acc.corners },
  ];

  return (
    <main>
      <Topbar title="Backtest & Accuracy" />
      <div className="space-y-4 p-4 lg:p-6">
        <p className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
          <History size={15} className="text-[var(--neon-blue)]" />
          สถิติจริงทั้งหมด — คำทายของ AI (รอบสุดท้ายก่อนเตะ ด้วยรายชื่อตัวจริง) ถูกล็อก แล้วตัดสินกับสกอร์จริงหลังจบแมตช์
          {acc.pending > 0 && (
            <span className="tabular text-[11px] text-[var(--text-muted)]">
              (รอตัดสินอีก {acc.pending} คู่)
            </span>
          )}
        </p>

        {/* วงแหวนความแม่นต่อตลาด */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <RingCard label="ภาพรวม" m={acc.overall} />
          {markets.map(({ label, m }) => (
            <RingCard key={label} label={label} m={m} />
          ))}
        </div>

        {/* กราฟรายวัน */}
        <section className="glass p-4">
          <h2 className="text-[13px] font-extrabold tracking-wider">
            <span className="mr-1 text-[var(--neon-blue)]">▎</span>ความแม่น 1X2 รายวัน (%)
          </h2>
          {acc.last7Days.length > 0 ? (
            <div className="mt-3">
              <AccuracyChart data={acc.last7Days} />
            </div>
          ) : (
            <p className="mt-3 p-6 text-center text-[12px] text-[var(--text-muted)]">
              ยังไม่มีวันที่มีผลตัดสินครบ — กราฟจะขึ้นเองหลังแมตช์ที่ AI วิเคราะห์จบ
            </p>
          )}
        </section>

        {/* ตารางผลรายคู่ */}
        <section className="glass overflow-x-auto">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-[13px] font-bold">
            ผลตัดสินรายคู่ ({acc.entries.length} คู่ล่าสุด)
          </div>
          {acc.entries.length === 0 ? (
            <p className="p-10 text-center text-[12px] text-[var(--text-muted)]">
              ยังไม่มีคู่ที่ตัดสินแล้ว — ระบบเริ่มเก็บสถิติตั้งแต่วันนี้ ทุกคู่ที่ AI
              วิเคราะห์จะถูกบันทึกและตัดสินอัตโนมัติหลังจบแมตช์
            </p>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-3 py-2.5 font-semibold">วันที่</th>
                  <th className="px-3 py-2.5 font-semibold">คู่</th>
                  <th className="px-3 py-2.5 font-semibold">AI ทาย</th>
                  <th className="tabular px-3 py-2.5 text-center font-semibold">สกอร์ทาย</th>
                  <th className="tabular px-3 py-2.5 text-center font-semibold">สกอร์จริง</th>
                  <th className="px-3 py-2.5 text-center font-semibold">1X2</th>
                  <th className="px-3 py-2.5 text-center font-semibold">AH</th>
                  <th className="px-3 py-2.5 text-center font-semibold">O/U</th>
                  <th className="px-3 py-2.5 text-center font-semibold">เตะมุม</th>
                </tr>
              </thead>
              <tbody>
                {acc.entries.map((e) => (
                  <LedgerRow key={e.id} e={e} />
                ))}
              </tbody>
            </table>
          )}
        </section>

        <p className="text-[11px] text-[var(--text-muted)]">
          * ✓ = ทายถูก, ✗ = ทายผิด (เส้นเศษ .25/.75 ได้ครึ่งนับถูก เสียครึ่งนับผิด) ·
          — = ไม่มีคำทาย หรือผลออกเท่าเส้นพอดี (push) · คู่ที่ยกเลิก/เลื่อนแข่งไม่ถูกนับ ·
          สกอร์ทาย = คำทายรอบสุดท้ายก่อนเตะ (วิเคราะห์ใหม่ด้วยตัวจริง) อาจต่างจากทรรศนะช่วงแรก ·
          สถิติในอดีตไม่การันตีผลในอนาคต
        </p>
        <Disclaimer />
      </div>
    </main>
  );
}

function RingCard({ label, m }: { label: string; m: MarketAccuracy }) {
  return (
    <div className="glass flex flex-col items-center p-4">
      {m.pct != null ? (
        <ScoreRing score={m.pct} size={72} label="" />
      ) : (
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-dashed border-[var(--border-subtle)] text-[12px] text-[var(--text-muted)]">
          รอข้อมูล
        </span>
      )}
      <p className="mt-2 text-center text-[11px] font-bold text-[var(--text-secondary)]">{label}</p>
      <p className="tabular text-[10px] text-[var(--text-muted)]">
        {m.total > 0 ? `${m.won}/${m.total} คู่` : "ยังไม่มีคู่ตัดสิน"}
      </p>
    </div>
  );
}

function Mark({ v }: { v: boolean | null | undefined }) {
  if (v == null) return <span className="text-[var(--text-muted)]">—</span>;
  return v ? (
    <span className="font-bold text-[var(--neon-green)]">✓</span>
  ) : (
    <span className="font-bold text-[var(--danger)]">✗</span>
  );
}

function LedgerRow({ e }: { e: LedgerEntry }) {
  return (
    <tr className="border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-elevated)]">
      <td className="tabular whitespace-nowrap px-3 py-2.5 text-[11px] text-[var(--text-muted)]">
        {e.date
          ? new Date(`${e.date}T12:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
          : "—"}
      </td>
      <td className="px-3 py-2.5">
        <span className="font-semibold">{e.home ?? "?"} vs {e.away ?? "?"}</span>
        {e.league && <span className="block text-[10px] text-[var(--text-muted)]">{e.league}</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--neon-blue)]">
        {e.pickSide === "DRAW"
          ? "เสมอ"
          : e.pickTeamName ?? (e.pickSide === "HOME" ? e.home : e.away) ?? "ไม่มีข้อมูล"}
        {e.ahLabel && <span className="block text-[10px] font-normal text-[var(--text-muted)]">{e.ahLabel}</span>}
      </td>
      <td className="tabular px-3 py-2.5 text-center">{e.expHome}-{e.expAway}</td>
      <td className="tabular px-3 py-2.5 text-center font-black">
        {e.actualHome != null ? `${e.actualHome}-${e.actualAway}` : "—"}
      </td>
      <td className="px-3 py-2.5 text-center"><Mark v={e.r1x2} /></td>
      <td className="px-3 py-2.5 text-center"><Mark v={e.rAh} /></td>
      <td className="px-3 py-2.5 text-center"><Mark v={e.rOu} /></td>
      <td
        className="px-3 py-2.5 text-center"
        title={
          e.cornerPick != null && e.cornerLine != null
            ? `ทาย ${e.cornerPick === "OVER" ? "Over" : "Under"} ${e.cornerLine}${e.actualCorners != null ? ` · เตะมุมจริง ${e.actualCorners}` : " · ไม่มีสถิติเตะมุมจาก API"}`
            : "ไม่มีคำทายเตะมุม"
        }
      >
        <Mark v={e.rCorner} />
      </td>
    </tr>
  );
}
