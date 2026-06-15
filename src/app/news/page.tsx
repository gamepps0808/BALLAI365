/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Newspaper, CalendarX2, ClipboardList, Cross, CloudRain } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import {
  fetchFixtures,
  fetchLiteFixtures,
  footballToday,
  footballNewDay,
} from "@/lib/service";
import { Fixture } from "@/lib/types";

export const dynamic = "force-dynamic";

interface NewsItem {
  kind: "cancelled" | "lineup" | "injury" | "weather";
  kickoff: string;
  matchId: string;
  matchLabel: string;
  leagueName: string;
  logo?: string;
  title: string;
  detail: string;
}

/**
 * ข่าวสาร — รวมเหตุการณ์จริงจาก API ของวันบอลนี้+วันถัดไป
 * (เลื่อน/ยกเลิกแข่ง · ตัวจริงประกาศ · บาดเจ็บ-แบน · สภาพอากาศ)
 * อ่านจากข้อมูลที่ดึงไว้แล้ว — ไม่เรียก Claude (0 token)
 */
export default async function NewsPage() {
  const [liteToday, liteNew, deepToday, deepNew] = await Promise.all([
    fetchLiteFixtures(footballToday()),
    fetchLiteFixtures(footballNewDay()),
    fetchFixtures(footballToday()),
    fetchFixtures(footballNewDay()),
  ]);

  const items: NewsItem[] = [];

  // 1) เลื่อน/ยกเลิกแข่ง — จากโปรแกรมทุกคู่ของทั้งสองวัน
  const seenLite = new Set<string>();
  for (const f of [...liteToday.fixtures, ...liteNew.fixtures]) {
    if (seenLite.has(f.id)) continue;
    seenLite.add(f.id);
    if (f.status === "CANCELLED" || f.status === "POSTPONED") {
      items.push({
        kind: "cancelled",
        kickoff: f.kickoff,
        matchId: f.id,
        matchLabel: `${f.homeName} vs ${f.awayName}`,
        leagueName: f.leagueName,
        logo: f.leagueLogo,
        title: f.status === "CANCELLED" ? "ยกเลิกการแข่งขัน" : "เลื่อนการแข่งขัน",
        detail: `${f.homeName} vs ${f.awayName} (เดิมเตะ ${f.kickoffLabel} น.) ${
          f.status === "CANCELLED" ? "ถูกยกเลิก" : "ถูกเลื่อนออกไป ยังไม่ประกาศวันใหม่"
        }`,
      });
    }
  }

  // 2-4) ตัวจริง / บาดเจ็บ / อากาศ — จากคู่ที่ระบบดึงข้อมูลเชิงลึกไว้แล้ว
  const seenDeep = new Set<string>();
  for (const f of [...deepToday.fixtures, ...deepNew.fixtures]) {
    if (seenDeep.has(f.id)) continue;
    seenDeep.add(f.id);
    collectFixtureNews(f, items);
  }

  const sections: { kind: NewsItem["kind"]; titleTh: string; icon: typeof CalendarX2; color: string }[] = [
    { kind: "cancelled", titleTh: "เลื่อน / ยกเลิกแข่ง", icon: CalendarX2, color: "var(--danger)" },
    { kind: "lineup", titleTh: "ประกาศตัวจริงแล้ว", icon: ClipboardList, color: "var(--neon-green)" },
    { kind: "injury", titleTh: "บาดเจ็บ / ติดโทษแบน", icon: Cross, color: "var(--warning)" },
    { kind: "weather", titleTh: "สภาพอากาศที่อาจมีผล", icon: CloudRain, color: "var(--neon-blue)" },
  ];
  const total = items.length;

  return (
    <main>
      <Topbar title="ข่าวสาร" />
      <div className="space-y-4 p-4 lg:p-6">
        <p className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
          <Newspaper size={15} className="text-[var(--neon-blue)]" />
          เหตุการณ์จริงจาก API ของโปรแกรมวันนี้และวันพรุ่งนี้{" "}
          <span className="tabular font-bold text-[var(--text-primary)]">{total} รายการ</span>
          — อัปเดตพร้อมรอบรีเฟรชข้อมูล
        </p>

        {total === 0 && (
          <div className="glass flex flex-col items-center gap-3 p-14 text-center">
            <Newspaper size={36} className="text-[var(--text-muted)]" />
            <p className="text-[13px] text-[var(--text-secondary)]">ยังไม่มีข่าวจากข้อมูลรอบล่าสุด</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              ตัวจริงมักประกาศก่อนเตะ ~1 ชั่วโมง ลองกลับมาดูใกล้เวลาแข่ง
            </p>
          </div>
        )}

        {sections.map(({ kind, titleTh, icon: Icon, color }) => {
          const list = items
            .filter((i) => i.kind === kind)
            .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
          if (list.length === 0) return null;
          return (
            <section key={kind} className="glass overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5">
                <Icon size={16} style={{ color }} />
                <span className="text-[13px] font-bold">{titleTh}</span>
                <span className="tabular ml-auto text-[11px] text-[var(--text-muted)]">{list.length} รายการ</span>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {list.map((item, i) => (
                  <Link
                    key={`${item.matchId}-${i}`}
                    href={`/match/${item.matchId}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
                  >
                    {item.logo && (
                      <img src={item.logo} alt="" width={20} height={20} loading="lazy" className="mt-0.5 shrink-0 rounded-full bg-white/10" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold">{item.title}</span>
                      <span className="block text-[12px] leading-relaxed text-[var(--text-secondary)]">{item.detail}</span>
                      <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                        {item.leagueName} · เตะ{" "}
                        {new Date(item.kickoff).toLocaleString("th-TH", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
                        })}{" "}น.
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <p className="text-[11px] text-[var(--text-muted)]">
          * ข่าวสร้างจากข้อมูลจริงของ API (ตัวจริง, บาดเจ็บ, สถานะแมตช์, พยากรณ์อากาศ) เฉพาะคู่ที่ระบบติดตามเชิงลึก
          — ไม่ใช่ข่าวลือหรือบทความ
        </p>
        <Disclaimer />
      </div>
    </main>
  );
}

function collectFixtureNews(f: Fixture, items: NewsItem[]) {
  const matchLabel = `${f.homeTeam.name} vs ${f.awayTeam.name}`;
  const base = {
    kickoff: f.kickoff,
    matchId: f.id,
    matchLabel,
    leagueName: f.league.name,
    logo: f.league.logo,
  };

  // ตัวจริงประกาศ (เฉพาะคู่ที่ยังไม่จบ)
  if (f.status !== "FINISHED") {
    const lineups = [
      { team: f.homeTeam.name, lu: f.homeLineup },
      { team: f.awayTeam.name, lu: f.awayLineup },
    ].filter((x) => x.lu?.confirmed && x.lu.startXI.length > 0);
    if (lineups.length > 0) {
      items.push({
        ...base,
        kind: "lineup",
        title: `${matchLabel} — ตัวจริงมาแล้ว`,
        detail: lineups
          .map((x) => `${x.team} จัด ${x.lu!.formation ?? "ไม่ระบุแผน"}${x.lu!.coach ? ` (กุนซือ ${x.lu!.coach})` : ""}`)
          .join(" · "),
      });
    }
  }

  // บาดเจ็บ / แบน
  for (const side of [
    { team: f.homeTeam.name, list: f.homeInjuries },
    { team: f.awayTeam.name, list: f.awayInjuries },
  ]) {
    if (!side.list?.length) continue;
    const names = side.list
      .slice(0, 4)
      .map((p) => `${p.name}${p.status === "suspended" ? " (โทษแบน)" : p.status === "doubtful" ? " (ไม่แน่)" : ""}`)
      .join(", ");
    items.push({
      ...base,
      kind: "injury",
      title: `${side.team} ขาดผู้เล่น ${side.list.length} คน`,
      detail: `${names}${side.list.length > 4 ? ` และอีก ${side.list.length - 4} คน` : ""} — คู่ ${matchLabel}`,
    });
  }

  // อากาศกระทบเกม (เฉพาะที่มีข้อมูลจริงและ impact สูงพอ)
  if (f.status === "SCHEDULED" && f.weather.hasData && f.weather.impactScore >= 40) {
    items.push({
      ...base,
      kind: "weather",
      title: `${matchLabel} — อากาศอาจมีผลต่อเกม`,
      detail: `${f.weather.impactNote} (ฝน ${f.weather.rainProbability}% · ลม ${f.weather.windKmh} กม./ชม. · ${f.weather.temperatureC}°C)`,
    });
  }
}
