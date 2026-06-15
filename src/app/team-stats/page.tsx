/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Search } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { FormBadges } from "@/components/ui/FormBadges";
import { searchTeams, getTeamInfo, getTeamLastFixtures, getTeamNextFixtures } from "@/lib/api-football";
import { AfFixtureRaw, AfTeamSearchResult } from "@/types/football";
import { FormResult } from "@/lib/types";

export const dynamic = "force-dynamic";

/** ทีมยอดนิยมสำหรับกดดูเร็ว */
const POPULAR = [
  "Manchester City", "Liverpool", "Arsenal", "Real Madrid", "Barcelona",
  "Bayern Munich", "Mexico", "South Korea", "Brazil", "Argentina",
];

/**
 * สถิติทีม — ค้นหาทีมจาก API แล้วสรุปสถิติจากผลแข่งจริง 10 นัดล่าสุด
 * (ใช้ได้ทั้งสโมสรและทีมชาติ ไม่ผูกกับลีกใดลีกหนึ่ง)
 */
export default async function TeamStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; team?: string }>;
}) {
  const { q, team } = await searchParams;
  const teamId = team ? Number(team) : null;

  let results: AfTeamSearchResult[] = [];
  let searchError: string | null = null;
  if (q && q.trim().length >= 3 && !teamId) {
    try {
      results = (await searchTeams(q.trim())).slice(0, 12);
    } catch (err) {
      searchError = (err as Error).message;
    }
  }

  return (
    <main>
      <Topbar title="สถิติทีม" />
      <div className="space-y-4 p-4 lg:p-6">
        {/* ค้นหา */}
        <form method="GET" className="glass flex flex-wrap items-center gap-3 p-4">
          <Search size={16} className="shrink-0 text-[var(--neon-blue)]" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="พิมพ์ชื่อทีมภาษาอังกฤษ อย่างน้อย 3 ตัวอักษร เช่น Liverpool, Mexico..."
            className="min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-glow-blue)]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--neon-blue)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            ค้นหาทีม
          </button>
        </form>

        {/* ทีมยอดนิยม */}
        {!teamId && !q && (
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-[var(--text-muted)]">ทีมยอดนิยม:</span>
            {POPULAR.map((name) => (
              <Link
                key={name}
                href={`/team-stats?q=${encodeURIComponent(name)}`}
                className="glass px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {name}
              </Link>
            ))}
          </div>
        )}

        {searchError && (
          <div className="glass border-[rgba(255,77,94,0.4)] bg-[var(--danger-soft)] p-3.5 text-[12px] text-[var(--danger)]">
            ค้นหาไม่สำเร็จ: {searchError}
          </div>
        )}

        {/* ผลค้นหา */}
        {!teamId && results.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((r) => (
              <Link
                key={r.team.id}
                href={`/team-stats?team=${r.team.id}`}
                className="glass glass-hover flex items-center gap-2.5 p-3"
              >
                {r.team.logo && <img src={r.team.logo} alt="" width={26} height={26} loading="lazy" className="shrink-0" />}
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{r.team.name}</span>
                  <span className="block text-[10px] text-[var(--text-muted)]">
                    {r.team.country ?? ""}{r.team.national ? " · ทีมชาติ" : ""}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
        {!teamId && q && q.trim().length >= 3 && results.length === 0 && !searchError && (
          <div className="glass p-10 text-center text-[13px] text-[var(--text-muted)]">
            ไม่พบทีมชื่อ &ldquo;{q}&rdquo; — ลองสะกดภาษาอังกฤษแบบอื่น
          </div>
        )}

        {/* สถิติทีมที่เลือก */}
        {teamId && <TeamStats teamId={teamId} />}

        <Disclaimer />
      </div>
    </main>
  );
}

async function TeamStats({ teamId }: { teamId: number }) {
  let info: AfTeamSearchResult | undefined;
  let fixtures: AfFixtureRaw[] = [];
  let upcoming: AfFixtureRaw[] = [];
  let error: string | null = null;
  try {
    [info, fixtures, upcoming] = await Promise.all([
      getTeamInfo(teamId).then((r) => r[0]),
      getTeamLastFixtures(teamId, 10),
      getTeamNextFixtures(teamId, 5).catch(() => []),
    ]);
  } catch (err) {
    error = (err as Error).message;
  }

  if (error || !info) {
    return (
      <div className="glass border-[rgba(255,77,94,0.4)] bg-[var(--danger-soft)] p-3.5 text-[12px] text-[var(--danger)]">
        ดึงข้อมูลทีมไม่สำเร็จ: {error ?? "ไม่พบทีมนี้"}
      </div>
    );
  }

  // สรุปสถิติจากผลจริง 10 นัด
  const rows = fixtures.map((m) => {
    const isHome = m.teams.home.id === teamId;
    const gf = (isHome ? m.goals?.home : m.goals?.away) ?? 0;
    const ga = (isHome ? m.goals?.away : m.goals?.home) ?? 0;
    const opp = isHome ? m.teams.away : m.teams.home;
    return {
      date: m.fixture.date,
      league: m.league.name,
      opp,
      isHome,
      gf,
      ga,
      result: (gf > ga ? "W" : gf === ga ? "D" : "L") as FormResult,
    };
  });
  const n = rows.length || 1;
  const wins = rows.filter((r) => r.result === "W").length;
  const draws = rows.filter((r) => r.result === "D").length;
  const losses = rows.filter((r) => r.result === "L").length;
  const gf = rows.reduce((s, r) => s + r.gf, 0);
  const ga = rows.reduce((s, r) => s + r.ga, 0);
  const cleanSheets = rows.filter((r) => r.ga === 0).length;
  const failedToScore = rows.filter((r) => r.gf === 0).length;
  const form = rows.slice(0, 5).map((r) => r.result);

  return (
    <div className="space-y-4">
      {/* หัวทีม */}
      <section className="glass flex flex-wrap items-center gap-4 p-4">
        {info.team.logo && <img src={info.team.logo} alt="" width={52} height={52} className="shrink-0" />}
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold">{info.team.name}</h2>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {info.team.country ?? ""}{info.team.national ? " · ทีมชาติ" : ""} · สถิติจากผลจริง {rows.length} นัดล่าสุด
          </p>
        </div>
        <div className="ml-auto">
          <FormBadges form={form} />
        </div>
        <Link
          href="/team-stats"
          className="glass shrink-0 px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ← ค้นหาทีมอื่น
        </Link>
      </section>

      {/* การ์ดสถิติ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { l: "ชนะ / เสมอ / แพ้", v: `${wins} / ${draws} / ${losses}`, c: "var(--neon-green)" },
          { l: "ประตูได้เฉลี่ย", v: (gf / n).toFixed(2), c: "var(--neon-blue)" },
          { l: "ประตูเสียเฉลี่ย", v: (ga / n).toFixed(2), c: "var(--danger)" },
          { l: "ได้-เสียรวม", v: `${gf}-${ga}`, c: "var(--soft-purple)" },
          { l: "คลีนชีต", v: `${cleanSheets}/${rows.length}`, c: "var(--neon-green)" },
          { l: "ไม่ได้ยิง", v: `${failedToScore}/${rows.length}`, c: "var(--warning)" },
        ].map((s) => (
          <div key={s.l} className="glass p-3.5">
            <p className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)]">{s.l}</p>
            <p className="tabular mt-1 text-lg font-bold" style={{ color: s.c }}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* โปรแกรมนัดถัดไป */}
      <section className="glass overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-[13px] font-bold">
          โปรแกรม {upcoming.length > 0 ? upcoming.length : ""} นัดถัดไป
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {upcoming.map((m) => {
            const isHome = m.teams.home.id === teamId;
            const opp = isHome ? m.teams.away : m.teams.home;
            return (
              <Link
                key={m.fixture.id}
                href={`/match/af-${m.fixture.id}`}
                className="flex items-center gap-3 px-4 py-2.5 text-[12px] transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <span className="w-28 shrink-0 text-[11px] text-[var(--text-muted)]">
                  {new Date(m.fixture.date).toLocaleString("th-TH", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
                  })}{" "}น.
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="text-[var(--text-muted)]">{isHome ? "vs" : "@"}</span>
                  {opp.logo && <img src={opp.logo} alt="" width={16} height={16} loading="lazy" className="shrink-0" />}
                  <span className="truncate font-semibold">{opp.name}</span>
                </span>
                <span className="ml-auto hidden truncate text-[11px] text-[var(--text-muted)] sm:block">
                  {m.league.name}
                </span>
              </Link>
            );
          })}
          {upcoming.length === 0 && (
            <p className="p-8 text-center text-[12px] text-[var(--text-muted)]">
              ยังไม่มีโปรแกรมนัดถัดไป (Missing Data)
            </p>
          )}
        </div>
      </section>

      {/* ผลแข่งล่าสุด */}
      <section className="glass overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-[13px] font-bold">
          ผลการแข่งขัน {rows.length} นัดล่าสุด
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-[12px]">
              <span className="w-20 shrink-0 text-[11px] text-[var(--text-muted)]">
                {new Date(r.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" })}
              </span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                  r.result === "W"
                    ? "bg-[var(--neon-green-soft)] text-[var(--neon-green)]"
                    : r.result === "D"
                      ? "bg-[rgba(91,108,140,0.25)] text-[var(--text-secondary)]"
                      : "bg-[var(--danger-soft)] text-[var(--danger)]"
                }`}
              >
                {r.result}
              </span>
              <span className="tabular w-12 shrink-0 font-black">{r.gf}-{r.ga}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="text-[var(--text-muted)]">{r.isHome ? "vs" : "@"}</span>
                {r.opp.logo && <img src={r.opp.logo} alt="" width={16} height={16} loading="lazy" className="shrink-0" />}
                <span className="truncate font-semibold">{r.opp.name}</span>
              </span>
              <span className="ml-auto hidden truncate text-[11px] text-[var(--text-muted)] sm:block">{r.league}</span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="p-8 text-center text-[12px] text-[var(--text-muted)]">ไม่มีผลการแข่งขันล่าสุด (Missing Data)</p>
          )}
        </div>
      </section>
    </div>
  );
}
