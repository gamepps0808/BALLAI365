/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { FormBadges } from "@/components/ui/FormBadges";
import { getStandingsGroups, getTopScorers, todayInBangkok, seasonFor } from "@/lib/api-football";
import { AfStandingRow, AfTopScorerRow } from "@/types/football";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { FormResult } from "@/lib/types";

export const dynamic = "force-dynamic";

/** ลีกที่เปิดดูตารางคะแนนได้ (season: ทัวร์นาเมนต์ = ปีปัจจุบัน, ลีก = ฤดูกาลล่าสุด) */
const LEAGUE_OPTIONS: { key: string; afId: number; nameTh: string; tournament?: boolean }[] = [
  { key: "worldcup", afId: 1, nameTh: "ฟุตบอลโลก 2026", tournament: true },
  { key: "epl", afId: 39, nameTh: "พรีเมียร์ลีก" },
  { key: "laliga", afId: 140, nameTh: "ลาลีกา" },
  { key: "bundesliga", afId: 78, nameTh: "บุนเดสลีกา" },
  { key: "seriea", afId: 135, nameTh: "เซเรีย อา" },
  { key: "ligue1", afId: 61, nameTh: "ลีกเอิง" },
  { key: "championship", afId: 40, nameTh: "แชมเปียนชิพ" },
];

export default async function LeaguesPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; view?: string }>;
}) {
  const { league, view } = await searchParams;
  const selected =
    LEAGUE_OPTIONS.find((l) => l.key === league) ?? LEAGUE_OPTIONS[0];
  const showScorers = view === "scorers";
  const today = todayInBangkok();
  const season = selected.tournament ? new Date(today).getFullYear() : seasonFor(today);

  let groups: AfStandingRow[][] = [];
  let scorers: AfTopScorerRow[] = [];
  let error: string | null = null;
  try {
    if (showScorers) scorers = await getTopScorers(selected.afId, season);
    else groups = await getStandingsGroups(selected.afId, season);
  } catch (err) {
    error = (err as Error).message;
  }

  return (
    <main>
      <Topbar title="ตารางคะแนน" />
      <div className="space-y-4 p-4 lg:p-6">
        {/* ตัวเลือกลีก */}
        <div className="flex flex-wrap gap-2">
          {LEAGUE_OPTIONS.map((l) => (
            <Link
              key={l.key}
              href={`/leagues?league=${l.key}${showScorers ? "&view=scorers" : ""}`}
              className={`rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-colors ${
                l.key === selected.key
                  ? "bg-[var(--neon-blue)] text-white shadow-[0_0_14px_rgba(47,129,247,0.4)]"
                  : "glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {l.nameTh}
            </Link>
          ))}
        </div>

        {/* สลับมุมมอง */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: false, label: "ตารางคะแนน", href: `/leagues?league=${selected.key}` },
            { key: true, label: "ดาวซัลโว", href: `/leagues?league=${selected.key}&view=scorers` },
          ].map((v) => (
            <Link
              key={v.label}
              href={v.href}
              className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                v.key === showScorers
                  ? "bg-[var(--neon-green)] text-black"
                  : "glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {v.label}
            </Link>
          ))}
        </div>

        <p className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
          <BarChart3 size={14} className="text-[var(--neon-blue)]" />
          {showScorers ? "ดาวซัลโว" : "ตารางคะแนน"} {selected.nameTh} ฤดูกาล {season}
          {selected.tournament ? "" : `-${(season + 1) % 100}`} — ข้อมูลจริงจาก API
        </p>

        {error && (
          <div className="glass border-[rgba(255,77,94,0.4)] bg-[var(--danger-soft)] p-3.5 text-[12px] text-[var(--danger)]">
            ดึงตารางคะแนนไม่สำเร็จ: {error}
          </div>
        )}

        {!error && !showScorers && groups.length === 0 && (
          <div className="glass p-12 text-center text-[13px] text-[var(--text-muted)]">
            ยังไม่มีตารางคะแนนของรายการนี้ (Missing Data)
          </div>
        )}
        {!error && showScorers && scorers.length === 0 && (
          <div className="glass p-12 text-center text-[13px] text-[var(--text-muted)]">
            ยังไม่มีข้อมูลดาวซัลโวของรายการนี้ (Missing Data) — ทัวร์นาเมนต์ที่เพิ่งเริ่มอาจยังไม่มีสถิติ
          </div>
        )}

        {!showScorers &&
          groups.map((rows, i) => (
            <StandingsTable key={i} rows={rows} showGroup={groups.length > 1} />
          ))}
        {showScorers && scorers.length > 0 && <ScorersTable rows={scorers} />}

        <Disclaimer />
      </div>
    </main>
  );
}

function StandingsTable({ rows, showGroup }: { rows: AfStandingRow[]; showGroup: boolean }) {
  if (rows.length === 0) return null;
  return (
    <section className="glass overflow-x-auto">
      {showGroup && rows[0].group && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-[13px] font-bold">
          {rows[0].group}
        </div>
      )}
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <th className="w-10 px-3 py-2.5 font-semibold">#</th>
            <th className="px-3 py-2.5 font-semibold">ทีม</th>
            <th className="tabular w-12 px-2 py-2.5 text-center font-semibold">แข่ง</th>
            <th className="tabular w-10 px-2 py-2.5 text-center font-semibold">ชนะ</th>
            <th className="tabular w-10 px-2 py-2.5 text-center font-semibold">เสมอ</th>
            <th className="tabular w-10 px-2 py-2.5 text-center font-semibold">แพ้</th>
            <th className="tabular w-16 px-2 py-2.5 text-center font-semibold">ได้-เสีย</th>
            <th className="tabular w-12 px-2 py-2.5 text-center font-semibold">+/-</th>
            <th className="tabular w-12 px-2 py-2.5 text-center font-semibold">แต้ม</th>
            <th className="w-32 px-3 py-2.5 font-semibold">ฟอร์ม</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const diff = r.goalsDiff ?? r.all.goals.for - r.all.goals.against;
            const form = (r.form ?? "")
              .split("")
              .filter((c): c is FormResult => "WDL".includes(c))
              .reverse()
              .slice(0, 5);
            // โซนสี: หัวตาราง (เขียว) / ท้ายตาราง (แดง) — เฉพาะลีกที่มีทีมเยอะ
            const zone =
              rows.length >= 18
                ? r.rank <= 4
                  ? "shadow-[inset_3px_0_0_var(--neon-green)]"
                  : r.rank > rows.length - 3
                    ? "shadow-[inset_3px_0_0_var(--danger)]"
                    : ""
                : rows.length === 4 && r.rank <= 2
                  ? "shadow-[inset_3px_0_0_var(--neon-green)]" // เข้ารอบ (กลุ่มทัวร์นาเมนต์)
                  : "";
            return (
              <tr
                key={r.team.id}
                className={`border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-elevated)] ${zone}`}
              >
                <td className="tabular px-3 py-2.5 font-bold">{r.rank}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    {r.team.logo && (
                      <img src={r.team.logo} alt="" width={18} height={18} loading="lazy" className="shrink-0" />
                    )}
                    <span className="font-semibold">{r.team.name}</span>
                  </span>
                </td>
                <td className="tabular px-2 py-2.5 text-center">{r.all.played}</td>
                <td className="tabular px-2 py-2.5 text-center text-[var(--neon-green)]">{r.all.win}</td>
                <td className="tabular px-2 py-2.5 text-center text-[var(--text-secondary)]">{r.all.draw}</td>
                <td className="tabular px-2 py-2.5 text-center text-[var(--danger)]">{r.all.lose}</td>
                <td className="tabular px-2 py-2.5 text-center text-[var(--text-secondary)]">
                  {r.all.goals.for}-{r.all.goals.against}
                </td>
                <td className={`tabular px-2 py-2.5 text-center font-semibold ${diff > 0 ? "text-[var(--neon-green)]" : diff < 0 ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>
                  {diff > 0 ? `+${diff}` : diff}
                </td>
                <td className="tabular px-2 py-2.5 text-center text-[13px] font-black">{r.points}</td>
                <td className="px-3 py-2.5">
                  {form.length > 0 ? (
                    <FormBadges form={form} />
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function ScorersTable({ rows }: { rows: AfTopScorerRow[] }) {
  return (
    <section className="glass overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <th className="w-10 px-3 py-2.5 font-semibold">#</th>
            <th className="px-3 py-2.5 font-semibold">นักเตะ</th>
            <th className="px-3 py-2.5 font-semibold">ทีม</th>
            <th className="tabular w-14 px-2 py-2.5 text-center font-semibold">ประตู</th>
            <th className="tabular w-16 px-2 py-2.5 text-center font-semibold">จุดโทษ</th>
            <th className="tabular w-16 px-2 py-2.5 text-center font-semibold">แอสซิสต์</th>
            <th className="tabular w-14 px-2 py-2.5 text-center font-semibold">ลงเล่น</th>
            <th className="tabular w-20 px-2 py-2.5 text-center font-semibold">นาที/ประตู</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const st = r.statistics[0];
            const goals = st?.goals?.total ?? 0;
            const minutes = st?.games?.minutes ?? null;
            const perGoal = goals > 0 && minutes ? Math.round(minutes / goals) : null;
            return (
              <tr
                key={r.player.id}
                className={`border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-elevated)] ${
                  i === 0 ? "shadow-[inset_3px_0_0_var(--gold)]" : ""
                }`}
              >
                <td className="tabular px-3 py-2.5 font-bold">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <PlayerPhoto photo={r.player.photo} name={r.player.name} size={28} />
                    <span className="font-semibold">{r.player.name}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    {st?.team?.logo && (
                       
                      <img src={st.team.logo} alt="" width={16} height={16} loading="lazy" className="shrink-0" />
                    )}
                    <span className="text-[var(--text-secondary)]">{st?.team?.name ?? "-"}</span>
                  </span>
                </td>
                <td className="tabular px-2 py-2.5 text-center text-[14px] font-black text-[var(--neon-green)]">{goals}</td>
                <td className="tabular px-2 py-2.5 text-center text-[var(--text-muted)]">{st?.penalty?.scored ?? 0}</td>
                <td className="tabular px-2 py-2.5 text-center">{st?.goals?.assists ?? 0}</td>
                <td className="tabular px-2 py-2.5 text-center text-[var(--text-secondary)]">{st?.games?.appearences ?? "-"}</td>
                <td className="tabular px-2 py-2.5 text-center">{perGoal ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
