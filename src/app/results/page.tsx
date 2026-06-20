import { History, CalendarDays } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ProviderBanner } from "@/components/ui/ProviderBanner";
import { fetchFixtures, fetchLiteFixtures } from "@/lib/service";
import { Fixture, LiteFixture, PickSide } from "@/lib/types";
import { FixtureBrowser, AiResult } from "@/components/match/FixtureBrowser";

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

  const [lite, deep] = await Promise.all([
    fetchLiteFixtures(selected),
    fetchFixtures(selected),
  ]);
  const predById = new Map<string, Fixture>(deep.fixtures.map((f) => [f.id, f]));

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

  // ผลทาย AI ต่อคู่ (serializable) ส่งให้ FixtureBrowser
  const aiResults: Record<string, AiResult> = {};
  for (const f of doneRows) {
    const p = predById.get(f.id)?.prediction;
    if (!p) continue;
    const graded = f.status === "FINISHED";
    const outcome = actualOutcome(f.homeGoals, f.awayGoals);
    aiResults[f.id] = {
      pick: p.pick,
      pickTeam: p.pickTeamName ?? null,
      expHome: p.expectedScore.home,
      expAway: p.expectedScore.away,
      correct: graded && outcome !== null && outcome === p.pick,
      exact: graded && f.homeGoals === p.expectedScore.home && f.awayGoals === p.expectedScore.away,
      graded,
    };
  }

  const finishedCount = doneRows.filter((f) => f.status === "FINISHED").length;
  const judged = Object.values(aiResults).filter((a) => a.graded);
  const correctCount = judged.filter((a) => a.correct).length;
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
            <span className="tabular font-bold text-[var(--text-primary)]">{finishedCount} คู่</span>
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

        {doneRows.length === 0 ? (
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
          <FixtureBrowser fixtures={doneRows} variant="results" aiResults={aiResults} />
        )}

        <Disclaimer />
      </div>
    </main>
  );
}
