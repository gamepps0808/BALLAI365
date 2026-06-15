import { Fixture } from "@/lib/types";

/**
 * TACTICAL OVERVIEW — สนามแนวนอน + จุดยืนผู้เล่นตามแผนการเล่นจริงจาก API
 * (formation จาก /fixtures/lineups เช่น "4-2-3-1") — ทีมแรกสีฟ้า บุกไปขวา,
 * ทีมที่สองสีแดง บุกมาซ้าย | ยังไม่ประกาศตัวจริง = แจ้ง Missing Data
 */

/** "4-2-3-1" → แถวผู้เล่น [GK,4,2,3,1] */
function parseFormation(formation: string | null): number[] | null {
  if (!formation) return null;
  const rows = formation.split("-").map(Number).filter((n) => n > 0 && n <= 6);
  if (rows.length < 2 || rows.reduce((s, n) => s + n, 0) !== 10) return null;
  return [1, ...rows];
}

/** พิกัดจุดผู้เล่นครึ่งสนามซ้าย (mirror สำหรับฝั่งขวา) — viewBox 420x220 */
function dots(rows: number[], mirror: boolean): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const X0 = 30, X1 = 188; // GK → แดนหน้า
  rows.forEach((count, i) => {
    const x = rows.length === 1 ? X0 : X0 + (i * (X1 - X0)) / (rows.length - 1);
    for (let j = 0; j < count; j++) {
      const span = Math.min(44 * (count - 1), 168);
      const y = 110 + (count === 1 ? 0 : (j - (count - 1) / 2) * (span / Math.max(count - 1, 1)));
      out.push({ x: mirror ? 420 - x : x, y });
    }
  });
  return out;
}

export function TacticalOverview({ fixture }: { fixture: Fixture }) {
  const homeRows = parseFormation(fixture.homeLineup?.formation ?? null);
  const awayRows = parseFormation(fixture.awayLineup?.formation ?? null);

  return (
    <section className="glass p-4">
      <h3 className="text-[12px] font-extrabold tracking-wider">TACTICAL OVERVIEW</h3>

      {/* ป้ายแผนการเล่น */}
      <div className="mt-2 flex items-center justify-between text-[12px] font-bold">
        <span className="text-[var(--neon-blue)]">
          {fixture.homeLineup?.formation ?? "ยังไม่ประกาศ"}
        </span>
        <span className="text-[10px] font-normal text-[var(--text-muted)]">
          {fixture.homeTeam.shortName} · {fixture.awayTeam.shortName}
        </span>
        <span className="text-[var(--danger)]">
          {fixture.awayLineup?.formation ?? "ยังไม่ประกาศ"}
        </span>
      </div>

      {!homeRows && !awayRows ? (
        <p className="mt-3 rounded-lg bg-[var(--bg-elevated)] p-3 text-center text-[11px] text-[var(--text-muted)]">
          ยังไม่ประกาศแผนการเล่น — จะแสดงอัตโนมัติเมื่อ API ประกาศตัวจริง
          (ปกติ ~1 ชม.ก่อนเตะ)
        </p>
      ) : (
        <svg viewBox="0 0 420 220" className="mt-2 w-full" role="img" aria-label="แผนการเล่น">
          {/* สนาม */}
          <rect x="4" y="4" width="412" height="212" rx="8" fill="rgba(30,90,50,0.35)" stroke="rgba(180,220,190,0.35)" />
          <line x1="210" y1="4" x2="210" y2="216" stroke="rgba(180,220,190,0.3)" />
          <circle cx="210" cy="110" r="26" fill="none" stroke="rgba(180,220,190,0.3)" />
          {/* เขตโทษ */}
          <rect x="4" y="58" width="44" height="104" fill="none" stroke="rgba(180,220,190,0.3)" />
          <rect x="372" y="58" width="44" height="104" fill="none" stroke="rgba(180,220,190,0.3)" />
          <rect x="4" y="86" width="16" height="48" fill="none" stroke="rgba(180,220,190,0.3)" />
          <rect x="400" y="86" width="16" height="48" fill="none" stroke="rgba(180,220,190,0.3)" />

          {/* ผู้เล่น */}
          {homeRows ? (
            dots(homeRows, false).map((d, i) => (
              <circle key={`h${i}`} cx={d.x} cy={d.y} r="7" fill="var(--neon-blue)" stroke="rgba(255,255,255,0.55)" />
            ))
          ) : (
            <text x="105" y="114" textAnchor="middle" fontSize="11" fill="rgba(200,210,230,0.6)">
              ยังไม่ประกาศ
            </text>
          )}
          {awayRows ? (
            dots(awayRows, true).map((d, i) => (
              <circle key={`a${i}`} cx={d.x} cy={d.y} r="7" fill="var(--danger)" stroke="rgba(255,255,255,0.55)" />
            ))
          ) : (
            <text x="315" y="114" textAnchor="middle" fontSize="11" fill="rgba(200,210,230,0.6)">
              ยังไม่ประกาศ
            </text>
          )}
        </svg>
      )}
    </section>
  );
}
