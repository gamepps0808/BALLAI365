import Link from "next/link";
import { Flame, ChevronRight } from "lucide-react";
import { Fixture } from "@/lib/types";
import { Badge } from "../ui/Badge";
import { confidenceLabel, confidenceTone } from "@/lib/engine/labels";

/**
 * "ทีเด็ดวันนี้" — ท็อป 5 คู่ที่ AI น่าสนใจสุด ที่ยังไม่เตะ
 * เห็นแถวเดียวรู้เลยว่า "เล่นอะไร · มั่นใจแค่ไหน · เตะกี่โมง" ไม่ต้องคลิกเข้าทีละคู่
 */
export function TopPicks({ fixtures }: { fixtures: Fixture[] }) {
  const picks = fixtures
    .filter((f) => f.status === "SCHEDULED" && f.prediction.dataQuality >= 40)
    .sort((a, b) => b.prediction.aiScore - a.prediction.aiScore)
    .slice(0, 5);
  if (picks.length === 0) return null;

  return (
    <section className="glass p-4">
      <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-[var(--text-primary)]">
        <Flame size={16} className="text-[var(--warning)]" /> ทีเด็ดวันนี้
        <span className="ml-auto text-[10px] font-normal text-[var(--text-muted)]">
          เรียงตามความน่าสนใจ
        </span>
      </h2>
      <div className="mt-3 space-y-2">
        {picks.map((f, i) => {
          const p = f.prediction;
          const bet = p.handicapPickTeam
            ? `เล่น ${p.handicapPickTeam}`
            : p.pickTeamName
              ? `${p.pickTeamName} ชนะ`
              : "—";
          return (
            <Link
              key={f.id}
              href={`/match/${f.id}`}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-2.5 transition hover:border-[var(--border-glow-green)]"
            >
              <span className="tabular w-4 shrink-0 text-center text-[13px] font-extrabold text-[var(--text-muted)]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-[var(--text-primary)]">
                  {f.homeTeam.shortName} <span className="text-[var(--text-muted)]">vs</span>{" "}
                  {f.awayTeam.shortName}
                </p>
                <p className="truncate text-[10.5px] text-[var(--text-muted)]">
                  {f.kickoffLabel} · {f.league.nameTh}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[12px] font-extrabold text-[var(--neon-green)]">{bet}</p>
                <span className="mt-0.5 inline-block">
                  <Badge tone={confidenceTone[p.confidence]}>{confidenceLabel[p.confidence]}</Badge>
                </span>
              </div>
              <ChevronRight size={15} className="shrink-0 text-[var(--text-muted)]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
