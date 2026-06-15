/* eslint-disable @next/next/no-img-element */
import { LineupInfo, Team } from "@/lib/types";

const POS_TH: Record<string, { th: string; color: string }> = {
  G: { th: "GK", color: "var(--gold)" },
  D: { th: "DF", color: "var(--neon-blue)" },
  M: { th: "MF", color: "var(--neon-green)" },
  F: { th: "FW", color: "var(--danger)" },
};

/**
 * รายชื่อ 11 ตัวจริงทั้งสองทีม — ข้อมูลจริงจาก API (เบอร์เสื้อ + ตำแหน่ง)
 * ฝั่งที่ยังไม่ประกาศขึ้น "ยังไม่ประกาศ" ตรงๆ ไม่เดารายชื่อ
 */
export function StartingXI({
  home,
  away,
  homeLineup,
  awayLineup,
}: {
  home: Team;
  away: Team;
  homeLineup?: LineupInfo;
  awayLineup?: LineupInfo;
}) {
  return (
    <section className="glass p-4">
      <h2 className="text-[13px] font-extrabold tracking-wider">
        <span className="mr-1 text-[var(--neon-blue)]">▎</span>STARTING XI — 11 ตัวจริง
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <TeamXI team={home} lineup={homeLineup} />
        <TeamXI team={away} lineup={awayLineup} />
      </div>
      <p className="mt-3 text-[10px] text-[var(--text-muted)]">
        * รายชื่อจริงจาก API — โดยปกติประกาศก่อนเริ่มเตะราว 1 ชั่วโมง
      </p>
    </section>
  );
}

function TeamXI({ team, lineup }: { team: Team; lineup?: LineupInfo }) {
  const players = lineup?.startXIDetail ?? [];
  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
        {team.logo && <img src={team.logo} alt="" width={20} height={20} loading="lazy" className="shrink-0" />}
        <span className="min-w-0 truncate text-[12px] font-bold">{team.name}</span>
        {lineup?.confirmed && (
          <span className="tabular ml-auto shrink-0 text-[11px] text-[var(--text-secondary)]">
            {lineup.formation ?? ""}
            {lineup.coach ? ` · ${lineup.coach}` : ""}
          </span>
        )}
      </div>

      {lineup?.confirmed && players.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {players.map((p, i) => {
            const pos = p.pos ? POS_TH[p.pos] : undefined;
            return (
              <li
                key={`${p.name}-${i}`}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevated)] text-[10px] font-black text-[var(--text-secondary)]">
                  {p.number ?? "-"}
                </span>
                <span className="min-w-0 truncate font-semibold">{p.name}</span>
                {pos && (
                  <span
                    className="ml-auto shrink-0 text-[10px] font-bold tracking-wider"
                    style={{ color: pos.color }}
                  >
                    {pos.th}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 rounded-lg bg-[var(--bg-elevated)] p-3 text-center text-[11px] text-[var(--text-muted)]">
          ยังไม่ประกาศตัวจริง (Missing Data)
        </p>
      )}
    </div>
  );
}
