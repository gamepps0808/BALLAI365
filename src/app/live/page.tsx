/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Radio } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { fetchLiteFixtures, footballToday, footballNewDay } from "@/lib/service";
import { LiteFixture } from "@/lib/types";
import { sortSectionsByImportance } from "@/lib/league-priority";

export const dynamic = "force-dynamic";

/**
 * แมตช์สด — ทุกคู่ที่กำลังแข่งตอนนี้ สกอร์+นาทีเรียลไทม์จาก API
 * (ดึงทั้งสองวันบอลเพราะเกมหลังเที่ยงคืนคาบเกี่ยววันปฏิทิน)
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

  // จัดกลุ่มตามลีก
  const groups = new Map<string, LiteFixture[]>();
  for (const f of live) {
    const key = `${f.leagueName}__${f.leagueCountry}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  const sections = sortSectionsByImportance([...groups.values()]);

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

        {sections.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 p-14 text-center">
            <Radio size={36} className="text-[var(--text-muted)]" />
            <p className="text-[13px] text-[var(--text-secondary)]">
              ยังไม่มีบอลกำลังแข่งในขณะนี้
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              ดูโปรแกรมที่กำลังจะเตะได้ที่หน้าแมตช์วันนี้
            </p>
          </div>
        ) : (
          sections.map((list) => <LiveSection key={list[0].id} list={list} />)
        )}

        <Disclaimer />
      </div>
    </main>
  );
}

function LiveSection({ list }: { list: LiteFixture[] }) {
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

      <div className="divide-y divide-[var(--border-subtle)]">
        {list.map((f) => (
          <Link
            key={f.id}
            href={`/match/${f.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)] lg:gap-4"
          >
            {/* นาทีแข่ง */}
            <span className="flex w-14 shrink-0 items-center gap-1 text-[12px] font-bold text-[var(--danger)]">
              <Radio size={11} className="animate-pulse" />
              {f.elapsed != null ? `${f.elapsed}'` : "LIVE"}
            </span>

            {/* ทีม + สกอร์สด */}
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
              <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <span className="truncate text-[13px] font-semibold">{f.homeName}</span>
                {f.homeLogo && <img src={f.homeLogo} alt="" width={20} height={20} loading="lazy" className="shrink-0" />}
              </span>
              <span className="tabular shrink-0 rounded-lg bg-[var(--danger-soft)] px-3.5 py-1 text-[17px] font-black text-[var(--danger)]">
                {f.homeGoals ?? 0} - {f.awayGoals ?? 0}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {f.awayLogo && <img src={f.awayLogo} alt="" width={20} height={20} loading="lazy" className="shrink-0" />}
                <span className="truncate text-[13px] font-semibold">{f.awayName}</span>
              </span>
            </div>

            {/* แฮนดิแคปเปิด (อ้างอิง) */}
            <span className="tabular hidden w-20 shrink-0 text-right text-[11px] text-[var(--text-muted)] sm:block">
              {f.ahLine !== null ? `AH ${f.ahLine > 0 ? "+" : ""}${f.ahLine}` : ""}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
