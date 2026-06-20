import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { fetchLiteFixtures, footballToday, footballNewDay } from "@/lib/service";
import { FixtureBrowser } from "@/components/match/FixtureBrowser";

export const dynamic = "force-dynamic";

/**
 * แมตช์วันนี้ — โปรแกรมบอล + ราคาแฮนดิแคปจาก API ตรง ๆ ค้นหาทีม/กรองลีกได้
 * ไม่มีการวิเคราะห์ใด ๆ ในหน้านี้ (0 token)
 */
export default async function MatchesPage() {
  // รวมสองวันบอล — คู่ที่ยังไม่จบของรอบปัจจุบัน + รอบใหม่ (กันตกหล่นช่วงคาบเกี่ยวเที่ยงวัน)
  const [today, newDay] = await Promise.all([
    fetchLiteFixtures(footballToday()),
    fetchLiteFixtures(footballNewDay()),
  ]);
  const fallback = today.fallback && newDay.fallback;
  const error = newDay.error ?? today.error;
  const seen = new Set<string>();
  const active = [...today.fixtures, ...newDay.fixtures].filter((f) => {
    if (seen.has(f.id) || (f.status !== "SCHEDULED" && f.status !== "LIVE")) return false;
    seen.add(f.id);
    return true;
  });
  const leagueCount = new Set(active.map((f) => `${f.leagueName}__${f.leagueCountry}`)).size;

  return (
    <main>
      {active.some((f) => f.status === "LIVE") && <AutoRefresh seconds={60} />}
      <Topbar title="แมตช์วันนี้" />
      <div className="space-y-4 p-4 lg:p-6">
        {fallback && (
          <div className="glass border-[rgba(255,77,94,0.4)] bg-[var(--danger-soft)] p-3.5 text-[12px] text-[var(--danger)]">
            ดึงรายการบอลไม่สำเร็จ: {error}
          </div>
        )}

        <p className="text-[12px] text-[var(--text-secondary)]">
          โปรแกรมบอลวันนี้ทั้งหมด{" "}
          <span className="tabular font-bold text-[var(--text-primary)]">{active.length} คู่</span>{" "}
          ใน {leagueCount} ลีก — ค้นหาทีมหรือกรองลีกได้ · คู่ที่จบแล้วดูที่ผลบอลย้อนหลัง
        </p>

        <FixtureBrowser
          fixtures={active}
          variant="matches"
          emptyText="ไม่มีคู่ที่รอแข่งแล้ววันนี้ — ดูผลที่ผลบอลย้อนหลัง"
        />

        <Disclaimer />
      </div>
    </main>
  );
}
