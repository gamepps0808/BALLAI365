import { Radio } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { fetchLiteFixtures, footballToday, footballNewDay } from "@/lib/service";
import { FixtureBrowser } from "@/components/match/FixtureBrowser";

export const dynamic = "force-dynamic";

/**
 * แมตช์สด — ทุกคู่ที่กำลังแข่งตอนนี้ สกอร์+นาทีเรียลไทม์จาก API · ค้นหาทีม/กรองลีกได้
 * รีเฟรชอัตโนมัติทุก 60 วินาที
 */
export default async function LivePage() {
  const [today, newDay] = await Promise.all([
    fetchLiteFixtures(footballToday()),
    fetchLiteFixtures(footballNewDay()),
  ]);
  const seen = new Set<string>();
  const live = [...today.fixtures, ...newDay.fixtures]
    .filter((f) => {
      if (f.status !== "LIVE" || seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    })
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  return (
    <main>
      <AutoRefresh seconds={60} />
      <Topbar title="แมตช์สด" />
      <div className="space-y-4 p-4 lg:p-6">
        <p className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
          <Radio size={15} className="animate-pulse text-[var(--danger)]" />
          กำลังแข่งตอนนี้{" "}
          <span className="tabular font-bold text-[var(--text-primary)]">{live.length} คู่</span>
          — สกอร์อัปเดตอัตโนมัติทุก 1 นาที
        </p>

        {live.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 p-14 text-center">
            <Radio size={36} className="text-[var(--text-muted)]" />
            <p className="text-[13px] text-[var(--text-secondary)]">ยังไม่มีบอลกำลังแข่งในขณะนี้</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              ดูโปรแกรมที่กำลังจะเตะได้ที่หน้าแมตช์วันนี้
            </p>
          </div>
        ) : (
          <FixtureBrowser fixtures={live} variant="live" />
        )}

        <Disclaimer />
      </div>
    </main>
  );
}
