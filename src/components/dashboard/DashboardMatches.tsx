"use client";

import { useRef, useState } from "react";
import { Fixture } from "@/lib/types";
import { MatchOfTheDay } from "./MatchOfTheDay";
import { MatchScanner } from "./MatchScanner";
import { MatchDetailPanel } from "./MatchDetailPanel";

/**
 * Interactive dashboard block — click any row in the scanner and the big
 * hero card (+ right detail panel) switches to that match.
 */
export function DashboardMatches({
  fixtures,
  newDayLabel,
}: {
  fixtures: Fixture[];
  newDayLabel: string;
}) {
  const motd = fixtures.find((f) => f.isMatchOfTheDay) ?? fixtures[0];
  const [selected, setSelected] = useState<Fixture>(motd);
  const heroRef = useRef<HTMLDivElement>(null);

  const handleSelect = (f: Fixture) => {
    setSelected(f);
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <div ref={heroRef} className="scroll-mt-24">
          <MatchOfTheDay fixture={selected} />
        </div>
        <div>
          <p className="mb-2 text-[12px] font-bold tracking-wide text-[var(--text-secondary)]">
            TOP {fixtures.length} บอลเด่นที่ AI วิเคราะห์{" "}
            <span className="font-normal text-[var(--text-muted)]">
              (คืนนี้–{newDayLabel}) · เรียงตาม AI Score — กดที่คู่ไหนเพื่อดูบนแถบใหญ่ด้านบน
            </span>
          </p>
          <MatchScanner
            fixtures={fixtures}
            onSelect={handleSelect}
            selectedId={selected.id}
          />
        </div>
      </div>
      <div className="hidden xl:block">
        <MatchDetailPanel fixture={selected} />
      </div>
    </div>
  );
}
