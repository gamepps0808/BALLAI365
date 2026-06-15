import { Topbar } from "@/components/layout/Topbar";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { DashboardMatches } from "@/components/dashboard/DashboardMatches";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { ProviderBanner } from "@/components/ui/ProviderBanner";
import Link from "next/link";
import { History, Radio, CalendarDays } from "lucide-react";
import {
  fetchFixtures,
  computeOverview,
  pickMatchOfTheDay,
  footballToday,
  footballNewDay,
} from "@/lib/service";
import { loadSavedAnalysis } from "@/lib/claude-store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // หน้าหลัก = "บอลวันใหม่" (วันบอลถัดไป รวมเกมหลังเที่ยงคืนคืนนี้ เช่น บอลโลกตี 2)
  // บอลค้างของวันนี้ → "แมตช์วันนี้" | คู่ที่จบแล้ว → "ผลบอลย้อนหลัง"
  const newDay = footballNewDay();
  const [newDayRes, todayRes] = await Promise.all([
    fetchFixtures(newDay, { analyze: true }), // หน้าหลักเท่านั้นที่วิเคราะห์
    fetchFixtures(footballToday()),
  ]);
  const { provider, fallback, error } = newDayRes;
  const liveCount = todayRes.fixtures.filter((f) => f.status === "LIVE").length;
  const todayLeftCount = todayRes.fixtures.filter((f) => f.status === "SCHEDULED").length;
  const finishedCount = todayRes.fixtures.filter((f) => f.status === "FINISHED").length;
  // หน้าหลัก = บอลเด่นที่ AI วิเคราะห์ ซึ่ง "ยังไม่เตะ/เตะอยู่" จากทั้ง
  //  - วันบอลใหม่ (พรุ่งนี้) ทั้งชุด — คาคู่ที่เตะ/จบไว้จนรีเซ็ตเที่ยง
  //  - คู่ใหญ่ค่ำวันนี้ที่ยังไม่เตะ (เช่นบอลโลกเตะ 23:00 ที่ยังเป็นวันปฏิทินนี้)
  //    มิฉะนั้นบอลเด่นที่เตะคืนนี้จะตกไปอยู่ "แมตช์วันนี้" ไม่เด่นบนหน้าหลัก
  const todayUpcomingBig = todayRes.fixtures.filter(
    (f) =>
      (f.status === "SCHEDULED" || f.status === "LIVE") &&
      loadSavedAnalysis(f.id) !== null // มีผลวิเคราะห์ Claude = คู่ใหญ่ที่ AI เลือก
  );
  const seen = new Set<string>();
  const fixtures = [...todayUpcomingBig, ...newDayRes.fixtures]
    .filter((f) => {
      if (f.status === "CANCELLED" || f.status === "POSTPONED" || seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    })
    .sort((a, b) => b.prediction.aiScore - a.prediction.aiScore)
    .slice(0, 10);
  const overview = computeOverview(fixtures);
  const motd = pickMatchOfTheDay(fixtures);
  const newDayLabel = new Date(`${newDay}T12:00:00`).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const hasLive = fixtures.some((f) => f.status === "LIVE") || liveCount > 0;
  return (
    <main>
      {/* นาที/สกอร์ของคู่ที่กำลังเตะต้องเดินเอง — รีเฟรชเฉพาะตอนมีบอลสด */}
      {hasLive && <AutoRefresh seconds={60} />}
      <Topbar title="ภาพรวมวันนี้" />
      <div className="space-y-4 p-4 lg:p-6">
        <ProviderBanner provider={provider} fallback={fallback} error={error} />
        {(liveCount > 0 || todayLeftCount > 0 || finishedCount > 0) && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {(liveCount > 0 || todayLeftCount > 0) && (
              <Link
                href="/matches"
                className="glass glass-hover flex flex-1 items-center gap-2.5 p-3 text-[12px] text-[var(--text-secondary)]"
              >
                {liveCount > 0 ? (
                  <Radio size={15} className="shrink-0 animate-pulse text-[var(--danger)]" />
                ) : (
                  <CalendarDays size={15} className="shrink-0 text-[var(--neon-blue)]" />
                )}
                บอลของวันนี้{liveCount > 0 && (
                  <>
                    {" "}กำลังแข่ง{" "}
                    <span className="tabular font-bold text-[var(--danger)]">{liveCount}</span>
                  </>
                )}{todayLeftCount > 0 && (
                  <>
                    {" "}รอแข่ง{" "}
                    <span className="tabular font-bold text-[var(--text-primary)]">{todayLeftCount}</span>
                  </>
                )}{" "}คู่ — ดูได้ที่แมตช์วันนี้ →
              </Link>
            )}
            {finishedCount > 0 && (
              <Link
                href="/results"
                className="glass glass-hover flex flex-1 items-center gap-2.5 p-3 text-[12px] text-[var(--text-secondary)]"
              >
                <History size={15} className="shrink-0 text-[var(--neon-blue)]" />
                จบไปแล้ว{" "}
                <span className="tabular font-bold text-[var(--text-primary)]">{finishedCount} คู่</span>
                — ดูผลที่ผลบอลย้อนหลัง →
              </Link>
            )}
          </div>
        )}
        <OverviewCards stats={overview} />

        {motd ? (
          <DashboardMatches key={motd.id} fixtures={fixtures} newDayLabel={newDayLabel} />
        ) : (
          <div className="glass p-12 text-center text-[13px] text-[var(--text-muted)]">
            {`ยังไม่มีโปรแกรมบอลวันใหม่ (${newDayLabel}) ในลีกที่เปิดใช้งาน — บอลที่เหลือของวันนี้ดูได้ที่แมตช์วันนี้`}
          </div>
        )}

        <Disclaimer />
      </div>
    </main>
  );
}
