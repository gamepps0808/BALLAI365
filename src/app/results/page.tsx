/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { History, CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ProviderBanner } from "@/components/ui/ProviderBanner";
import { Badge } from "@/components/ui/Badge";
import { fetchFixtures, fetchLiteFixtures } from "@/lib/service";
import { Fixture, LiteFixture, PickSide } from "@/lib/types";
import { sortSectionsByImportance } from "@/lib/league-priority";

export const dynamic = "force-dynamic";

function todayInBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

function actualOutcome(home: number | null | undefined, away: number | null | undefined): PickSide | null {
  if (home == null || away == null) return null;
  if (home > away) return "HOME";
  if (home < away) return "AWAY";
  return "DRAW";
}

const DONE = ["FINISHED", "CANCELLED", "POSTPONED"];

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const today = todayInBangkok();
  const selected = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today ? date : today;

  // รายการบอลทั้งวัน (ทุกลีกที่ตลาดเปิดราคา) + ผลวิเคราะห์ที่เซฟไว้ของคู่ที่ระบบวิเคราะห์
  const [lite, deep] = await Promise.all([
    fetchLiteFixtures(selected),
    fetchFixtures(selected),
  ]);
  const predById = new Map<string, Fixture>(deep.fixtures.map((f) => [f.id, f]));

  // คู่ที่จบ/ยกเลิก/เลื่อน จากรายการรวม + เติมคู่จากลีกวิเคราะห์ที่ไม่อยู่ในรายการรวม
  const liteIds = new Set(lite.fixtures.map((f) => f.id));
  const doneRows: LiteFixture[] = [
    ...lite.fixtures.filter((f) => DONE.includes(f.status)),
    ...deep.fixtures
      .filter((f) => DONE.includes(f.status) && !liteIds.has(f.id))
      .map(
        (f): LiteFixture => ({
          id: f.id,
          afId: Number(f.id.replace("af-", "")),
          kickoff: f.kickoff,
          kickoffLabel: f.kickoffLabel,
          status: f.status,
          leagueName: f.league.name,
          leagueCountry: f.league.country,
          leagueLogo: f.league.logo,
          homeName: f.homeTeam.name,
          awayName: f.awayTeam.name,
          homeLogo: f.homeTeam.logo,
          awayLogo: f.awayTeam.logo,
          homeGoals: f.homeGoals,
          awayGoals: f.awayGoals,
          ahLine: f.prediction.handicapLine,
          ahHome: null,
          ahAway: null,
          mwHome: null,
          mwDraw: null,
          mwAway: null,
          isBig: false,
        })
      ),
  ];

  // สรุปผลทาย AI (เฉพาะคู่ที่มีผลวิเคราะห์และจบจริง)
  const judged = doneRows.filter((f) => f.status === "FINISHED" && predById.has(f.id));
  const correctCount = judged.filter(
    (f) => actualOutcome(f.homeGoals, f.awayGoals) === predById.get(f.id)!.prediction.pick
  ).length;

  // จัดกลุ่มตามลีก — เรียงกลุ่มตามเวลาเตะคู่แรก
  const groups = new Map<string, LiteFixture[]>();
  for (const f of doneRows) {
    const key = `${f.leagueName}__${f.leagueCountry}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  const sections = sortSectionsByImportance(
    [...groups.values()].map((list) =>
      list.sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    )
  );

  const dateLabel = new Date(`${selected}T12:00:00`).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main>
      <Topbar title="ผลบอลย้อนหลัง" />
      <div className="space-y-4 p-4 lg:p-6">
        <ProviderBanner provider={deep.provider} fallback={deep.fallback} error={deep.error} />

        {/* เลือกวันที่ */}
        <form method="GET" className="glass flex flex-wrap items-center gap-3 p-4">
          <span className="flex items-center gap-2 text-[13px] font-bold">
            <CalendarDays size={16} className="text-[var(--neon-blue)]" />
            เลือกวันที่
          </span>
          <input
            type="date"
            name="date"
            defaultValue={selected}
            max={today}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none [color-scheme:dark] focus:border-[var(--border-glow-blue)]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--neon-blue)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            ดูผลบอล
          </button>
          <span className="ml-auto text-[12px] text-[var(--text-secondary)]">
            {dateLabel} · จบแล้ว{" "}
            <span className="tabular font-bold text-[var(--text-primary)]">
              {doneRows.filter((f) => f.status === "FINISHED").length} คู่
            </span>
            {judged.length > 0 && (
              <>
                {" "}· AI ทายถูก{" "}
                <span className="tabular font-bold text-[var(--neon-green)]">
                  {correctCount}/{judged.length}
                </span>
              </>
            )}
          </span>
        </form>

        {sections.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 p-14 text-center">
            <History size={36} className="text-[var(--text-muted)]" />
            <p className="text-[13px] text-[var(--text-secondary)]">
              ยังไม่มีแมตช์ที่จบแล้วในวันที่เลือก
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              ลองเลือกวันอื่น หรือแมตช์ของวันนี้อาจยังแข่งไม่จบ
            </p>
          </div>
        ) : (
          sections.map((list) => (
            <LeagueSection key={list[0].id} list={list} predById={predById} />
          ))
        )}

        <Disclaimer />
      </div>
    </main>
  );
}

function LeagueSection({
  list,
  predById,
}: {
  list: LiteFixture[];
  predById: Map<string, Fixture>;
}) {
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
        {list.map((f) => {
          const deep = predById.get(f.id);
          const p = deep?.prediction;
          const outcome = actualOutcome(f.homeGoals, f.awayGoals);
          const aiCorrect = p && outcome !== null && outcome === p.pick;
          const exactScore =
            p && f.homeGoals === p.expectedScore.home && f.awayGoals === p.expectedScore.away;

          const row = (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:gap-4">
              <span className="tabular w-12 text-[12px] text-[var(--text-muted)]">{f.kickoffLabel}</span>

              {/* ทีม + สกอร์ */}
              <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
                <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                  <span className="truncate text-[13px] font-semibold">{f.homeName}</span>
                  {f.homeLogo && <img src={f.homeLogo} alt="" width={18} height={18} loading="lazy" className="shrink-0" />}
                </span>
                {f.status === "FINISHED" ? (
                  <span className="tabular shrink-0 rounded-lg bg-[var(--bg-elevated)] px-3 py-1 text-[15px] font-black">
                    {f.homeGoals} - {f.awayGoals}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-lg bg-[var(--danger-soft)] px-3 py-1 text-[12px] font-bold text-[var(--danger)]">
                    {f.status === "CANCELLED" ? "ยกเลิกแข่ง" : "เลื่อนแข่ง"}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {f.awayLogo && <img src={f.awayLogo} alt="" width={18} height={18} loading="lazy" className="shrink-0" />}
                  <span className="truncate text-[13px] font-semibold">{f.awayName}</span>
                </span>
              </div>

              {/* ผลทาย AI (เฉพาะคู่ที่วิเคราะห์ไว้) */}
              {p && (
                <div className="text-right text-[11px]">
                  <p className="text-[var(--text-muted)]">
                    AI ทาย:{" "}
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {p.pick === "DRAW" ? "เสมอ" : `${p.pickTeamName} ชนะ`}
                    </span>{" "}
                    ({p.expectedScore.home}-{p.expectedScore.away})
                  </p>
                  <div className="mt-0.5 flex justify-end gap-1.5">
                    {f.status !== "FINISHED" ? (
                      <Badge tone="muted">ไม่นับผล</Badge>
                    ) : aiCorrect ? (
                      <Badge tone="green">
                        <CheckCircle2 size={11} /> AI ทายถูก
                      </Badge>
                    ) : (
                      <Badge tone="red">
                        <XCircle size={11} /> AI ทายผิด
                      </Badge>
                    )}
                    {f.status === "FINISHED" && exactScore && <Badge tone="gold">สกอร์เป๊ะ</Badge>}
                  </div>
                </div>
              )}
            </div>
          );

          // คู่ที่มีผลวิเคราะห์ → กดเข้าดูรายละเอียดได้
          return p ? (
            <Link key={f.id} href={`/match/${f.id}`} className="block transition-colors hover:bg-[var(--bg-elevated)]">
              {row}
            </Link>
          ) : (
            <div key={f.id}>{row}</div>
          );
        })}
      </div>
    </section>
  );
}
