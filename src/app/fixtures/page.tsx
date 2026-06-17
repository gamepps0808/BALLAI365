/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Radio, Sparkles, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { fetchLiteFixtures, footballToday } from "@/lib/service";
import { LiteFixture } from "@/lib/types";
import { sortSectionsByImportance } from "@/lib/league-priority";

export const dynamic = "force-dynamic";

/**
 * โปรแกรมบอลล่วงหน้า — รายการบอล 7 วันข้างหน้า เลือกดูตามวัน
 * โปรแกรม + ราคาแฮนดิแคป/1X2 จากตลาด · ไม่มีการวิเคราะห์ AI ในหน้านี้ (0 token)
 * คู่ที่ AI วิเคราะห์ลึกแล้วติดป้าย "AI" และคลิกเข้าดูหน้าวิเคราะห์ได้
 */

const DAYS_AHEAD = 7;

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayLabel(ymd: string): { num: string; wd: string } {
  const d = new Date(`${ymd}T00:00:00+07:00`);
  return {
    num: new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" }).format(d),
    wd: new Intl.DateTimeFormat("th-TH", { weekday: "short", timeZone: "Asia/Bangkok" }).format(d),
  };
}

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const base = footballToday();
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(base, i));
  const { date } = await searchParams;
  const selected = date && days.includes(date) ? date : base;

  const res = await fetchLiteFixtures(selected, { includeScheduled: true });

  // จัดกลุ่มตามลีก เรียงตามความสำคัญ + เวลาเตะ
  const groups = new Map<string, LiteFixture[]>();
  for (const f of res.fixtures) {
    const key = `${f.leagueName}__${f.leagueCountry}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  const sections = sortSectionsByImportance(
    [...groups.values()].map((list) => list.sort((a, b) => a.kickoff.localeCompare(b.kickoff)))
  );
  const bigCount = res.fixtures.filter((f) => f.isBig).length;

  return (
    <main>
      <Topbar title="โปรแกรมล่วงหน้า" />
      <div className="space-y-4 p-4 lg:p-6">
        {/* แท็บเลือกวัน */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => {
            const { num, wd } = dayLabel(d);
            const active = d === selected;
            const isToday = d === base;
            return (
              <Link
                key={d}
                href={`/fixtures?date=${d}`}
                className={`flex shrink-0 flex-col items-center rounded-xl border px-3.5 py-2 transition-colors ${
                  active
                    ? "border-[var(--neon-green)] bg-[var(--neon-blue-soft)]"
                    : "border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <span className={`text-[10px] ${active ? "text-[var(--neon-green)]" : "text-[var(--text-muted)]"}`}>
                  {isToday ? "วันนี้" : wd}
                </span>
                <span className={`text-[13px] font-bold ${active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                  {num}
                </span>
              </Link>
            );
          })}
        </div>

        <p className="text-[12px] text-[var(--text-secondary)]">
          โปรแกรมบอล{" "}
          <span className="tabular font-bold text-[var(--text-primary)]">{res.fixtures.length} คู่</span>{" "}
          ใน {sections.length} ลีก พร้อมราคาแฮนดิแคปจากตลาด
          {bigCount > 0 && (
            <>
              {" · "}
              <span className="font-bold text-[var(--neon-green)]">{bigCount} คู่</span> AI วิเคราะห์ลึกแล้ว
            </>
          )}
        </p>

        {sections.length === 0 ? (
          <div className="glass p-12 text-center text-[13px] text-[var(--text-muted)]">
            {res.fallback ? `ดึงโปรแกรมไม่สำเร็จ: ${res.error}` : "ยังไม่มีโปรแกรมบอลในวันนี้"}
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
      <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5">
        {first.leagueLogo && (
          <img src={first.leagueLogo} alt="" width={18} height={18} loading="lazy" className="shrink-0 rounded-full bg-white/10" />
        )}
        <span className="text-[13px] font-bold">{first.leagueName}</span>
        <span className="text-[11px] text-[var(--text-muted)]">{first.leagueCountry}</span>
        <span className="tabular ml-auto text-[11px] text-[var(--text-muted)]">{list.length} คู่</span>
      </div>

      <div>
        {list.map((f) => (
          <Link
            key={f.id}
            href={`/match/${f.id}`}
            className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-4 py-2.5 transition-colors first:border-t-0 hover:bg-[var(--bg-elevated)]"
          >
            {/* เวลา / สกอร์ */}
            <div className="tabular w-14 shrink-0 text-[12px] font-semibold">
              {f.status === "LIVE" ? (
                <span className="flex items-center gap-1 text-[var(--danger)]">
                  <Radio size={11} className="animate-pulse" />
                  {f.homeGoals ?? 0}-{f.awayGoals ?? 0}
                </span>
              ) : f.status === "FINISHED" ? (
                <span className="text-[var(--text-muted)]">
                  {f.homeGoals ?? 0}-{f.awayGoals ?? 0}
                </span>
              ) : (
                f.kickoffLabel
              )}
            </div>

            {/* คู่แข่งขัน */}
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[12px]">
                {f.homeLogo && <img src={f.homeLogo} alt="" width={14} height={14} loading="lazy" className="shrink-0" />}
                <span className="truncate font-semibold">{f.homeName}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[12px]">
                {f.awayLogo && <img src={f.awayLogo} alt="" width={14} height={14} loading="lazy" className="shrink-0" />}
                <span className="truncate text-[var(--text-secondary)]">{f.awayName}</span>
              </span>
            </div>

            {/* แฮนดิแคป */}
            <div className="tabular hidden w-16 shrink-0 text-right text-[12px] font-bold text-[var(--soft-purple)] sm:block">
              {f.ahLine !== null ? (f.ahLine > 0 ? `+${f.ahLine}` : f.ahLine) : <span className="font-normal text-[var(--text-muted)]">—</span>}
            </div>

            {/* 1X2 */}
            <div className="tabular hidden w-28 shrink-0 text-right text-[11px] text-[var(--text-secondary)] md:block">
              {f.mwHome !== null ? `${f.mwHome.toFixed(2)} / ${f.mwDraw?.toFixed(2)} / ${f.mwAway?.toFixed(2)}` : "—"}
            </div>

            {/* ป้าย AI + ลูกศร */}
            <div className="flex w-16 shrink-0 items-center justify-end gap-1">
              {f.isBig && (
                <span className="flex items-center gap-0.5 rounded-full bg-[var(--neon-blue-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--neon-green)]">
                  <Sparkles size={9} /> AI
                </span>
              )}
              <ChevronRight size={14} className="text-[var(--text-muted)]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
