"use client";

import { useRef, useState } from "react";
import { Fixture } from "@/lib/types";
import type { LiveRead } from "@/lib/claude-live";
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
  liveReads,
}: {
  fixtures: Fixture[];
  newDayLabel: string;
  liveReads?: Record<string, LiveRead>;
}) {
  const motd = fixtures.find((f) => f.isMatchOfTheDay) ?? fixtures[0];
  // เก็บแค่ id ที่เลือก แล้ว derive fixture สดจาก props เสมอ —
  // ตอน AutoRefresh ดึงข้อมูลใหม่ (สกอร์/นาทีสด) การ์ดจะอัปเดตตาม ไม่ค้าง object เก่า
  const [selectedId, setSelectedId] = useState<string>(motd.id);
  const selected = fixtures.find((f) => f.id === selectedId) ?? motd;
  const heroRef = useRef<HTMLDivElement>(null);

  const handleSelect = (f: Fixture) => {
    setSelectedId(f.id);
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <div ref={heroRef} className="scroll-mt-24">
          <MatchOfTheDay fixture={selected} liveRead={liveReads?.[selected.id]} />
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
