/* eslint-disable @next/next/no-img-element */
import { Radio } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { fetchLiteFixtures, footballToday, footballNewDay } from "@/lib/service";
import { LiteFixture } from "@/lib/types";
import { sortSectionsByImportance } from "@/lib/league-priority";

export const dynamic = "force-dynamic";

/**
 * แมตช์วันนี้ — โปรแกรมบอล + ราคาแฮนดิแคปจาก API ตรง ๆ จัดกลุ่มตามลีก
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

  // จัดกลุ่มตามลีก — เรียงกลุ่มตามเวลาเตะคู่แรกของลีกนั้น
  const groups = new Map<string, LiteFixture[]>();
  for (const f of active) {
    const key = `${f.leagueName}__${f.leagueCountry}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  const sections = sortSectionsByImportance(
    [...groups.values()].map((list) =>
      list.sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    )
  );

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
          ใน {sections.length} ลีก พร้อมราคาแฮนดิแคปจากตลาด — คู่ที่จบแล้วดูได้ที่ผลบอลย้อนหลัง
        </p>

        {sections.length === 0 ? (
          <div className="glass p-12 text-center text-[13px] text-[var(--text-muted)]">
            ไม่มีคู่ที่รอแข่งแล้ววันนี้ — ดูผลที่ผลบอลย้อนหลัง
          </div>
        ) : (
          sections.map((list) => <LeagueSection key={list[0].id} list={list} />)
        )}

        <Disclaimer />
      </div>
    </main>
  );
}

function LeagueSection({ list }: { list: LiteFixture[] }) {
  const first = list[0];
  return (
    <section className="glass overflow-hidden">
      {/* หัวลีก */}
      <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5">
        {first.leagueLogo && (
          <img
            src={first.leagueLogo}
            alt=""
            width={18}
            height={18}
            loading="lazy"
            className="shrink-0 rounded-full bg-white/10"
          />
        )}
        <span className="text-[13px] font-bold">{first.leagueName}</span>
        <span className="text-[11px] text-[var(--text-muted)]">{first.leagueCountry}</span>
        <span className="tabular ml-auto text-[11px] text-[var(--text-muted)]">{list.length} คู่</span>
      </div>

      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <th className="w-20 px-4 py-2 font-semibold">เวลา</th>
            <th className="px-3 py-2 font-semibold">คู่แข่งขัน</th>
            <th className="w-24 px-3 py-2 font-semibold">แฮนดิแคป</th>
            <th className="w-32 px-3 py-2 font-semibold">ราคาน้ำ (ต่อ/รอง)</th>
            <th className="w-40 px-3 py-2 font-semibold">1X2</th>
          </tr>
        </thead>
        <tbody>
          {list.map((f) => (
            <tr key={f.id} className="border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-elevated)]">
              <td className="tabular px-4 py-2.5 font-semibold">
                {f.status === "LIVE" ? (
                  <span className="flex items-center gap-1 text-[var(--danger)]">
                    <Radio size={11} className="animate-pulse" />
                    {f.homeGoals ?? 0}-{f.awayGoals ?? 0}
                  </span>
                ) : (
                  f.kickoffLabel
                )}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    {f.homeLogo && <img src={f.homeLogo} alt="" width={14} height={14} loading="lazy" className="shrink-0" />}
                    <span className="font-semibold">{f.homeName}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {f.awayLogo && <img src={f.awayLogo} alt="" width={14} height={14} loading="lazy" className="shrink-0" />}
                    <span className="text-[var(--text-secondary)]">{f.awayName}</span>
                  </span>
                </div>
              </td>
              <td className="tabular px-3 py-2.5 font-bold text-[var(--soft-purple)]">
                {f.ahLine !== null ? (f.ahLine > 0 ? `+${f.ahLine}` : f.ahLine) : (
                  <span className="font-normal text-[var(--text-muted)]">—</span>
                )}
              </td>
              <td className="tabular px-3 py-2.5">
                {f.ahHome !== null && f.ahAway !== null ? (
                  <>
                    {f.ahHome.toFixed(2)} <span className="text-[var(--text-muted)]">/</span> {f.ahAway.toFixed(2)}
                  </>
                ) : (
                  <span className="text-[var(--text-muted)]">—</span>
                )}
              </td>
              <td className="tabular px-3 py-2.5 text-[11px] text-[var(--text-secondary)]">
                {f.mwHome !== null
                  ? `${f.mwHome.toFixed(2)} / ${f.mwDraw?.toFixed(2)} / ${f.mwAway?.toFixed(2)}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
