"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Star, Filter, ExternalLink } from "lucide-react";
import { Fixture } from "@/lib/types";
import { TeamLogo } from "../ui/TeamLogo";
import { ScoreRing } from "../ui/ScoreRing";
import { Badge } from "../ui/Badge";
import {
  confidenceLabel,
  confidenceTone,
  riskLabel,
  riskTone,
  valueLabel,
  valueTone,
} from "@/lib/engine/labels";

const tabs = [
  { id: "all", label: "ทั้งหมด" },
  { id: "ai", label: "AI แนะนำ" },
  { id: "confidence", label: "ความมั่นใจสูง" },
  { id: "value", label: "Value Bet" },
  { id: "handicap", label: "แฮนดิแคปเด่น" },
  { id: "corners", label: "เล่นลูกมุม" },
  { id: "ou", label: "สูง / ต่ำ" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function applyFilter(fixtures: Fixture[], tab: TabId): Fixture[] {
  switch (tab) {
    case "ai":
      return fixtures.filter((f) => f.prediction.aiScore >= 75);
    case "confidence":
      return fixtures.filter((f) =>
        ["HIGH", "VERY_HIGH"].includes(f.prediction.confidence)
      );
    case "value":
      return fixtures.filter((f) =>
        ["STRONG_VALUE", "ELITE_VALUE"].includes(f.prediction.value)
      );
    case "handicap":
      return fixtures.filter((f) => f.prediction.handicapLine !== null && Math.abs(f.prediction.handicapLine) <= 1);
    case "corners":
      return fixtures.filter((f) => f.corners.confidencePct >= 65);
    case "ou":
      return fixtures.filter((f) => f.prediction.overUnderPick === "OVER");
    default:
      return fixtures;
  }
}

export type ScannerMarket = "handicap" | "ou" | "corner";

/** คอลัมน์ตลาดของตาราง — เปลี่ยนตามหน้าที่ใช้ (สูง/ต่ำ และเตะมุม ต้องเห็นคำทายของตลาดตัวเอง) */
const MARKET_HEADER: Record<ScannerMarket, string> = {
  handicap: "แฮนดิแคป",
  ou: "สูง/ต่ำ (AI ทาย)",
  corner: "เตะมุม (AI ทาย)",
};

function marketCell(p: Fixture["prediction"], market: ScannerMarket) {
  if (market === "ou") {
    if (p.overUnderPick == null || p.overUnderLine == null)
      return <span className="text-[var(--text-muted)]" title="ไม่มีข้อมูลสูงต่ำ">—</span>;
    return (
      <span className={p.overUnderPick === "OVER" ? "text-[var(--neon-green)]" : "text-[var(--neon-blue)]"}>
        {p.overUnderPick === "OVER" ? "Over" : "Under"} {p.overUnderLine}
      </span>
    );
  }
  if (market === "corner") {
    if (p.cornerPick == null || p.cornerLine == null)
      return <span className="text-[var(--text-muted)]" title="ไม่มีข้อมูลเตะมุม">—</span>;
    return (
      <span className={p.cornerPick === "OVER" ? "text-[var(--neon-green)]" : "text-[var(--neon-blue)]"}>
        {p.cornerPick === "OVER" ? "Over" : "Under"} {p.cornerLine}
      </span>
    );
  }
  return p.handicapLine ?? (
    <span className="text-[var(--text-muted)]" title="ไม่มีข้อมูลแฮนดิแคป">—</span>
  );
}

export function MatchScanner({
  fixtures,
  onSelect,
  selectedId,
  market = "handicap",
}: {
  fixtures: Fixture[];
  /** เมื่อกำหนด: กดแถวเพื่อเลือกโชว์บนการ์ดใหญ่ แทนการนำทางไปหน้ารายละเอียด */
  onSelect?: (f: Fixture) => void;
  selectedId?: string;
  /** ตลาดของคอลัมน์ที่ 4 — หน้าสูง/ต่ำ และเตะมุม ส่งค่าของตัวเอง */
  market?: ScannerMarket;
}) {
  const [tab, setTab] = useState<TabId>("all");
  const rows = useMemo(() => applyFilter(fixtures, tab), [fixtures, tab]);

  return (
    <section className="glass overflow-hidden">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border-subtle)] px-3 pt-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 pb-2 pt-1 text-[12px] transition-colors ${
              tab === t.id
                ? "border-[var(--neon-blue)] font-semibold text-[var(--neon-blue)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1 pb-2 text-[11px] text-[var(--text-muted)] sm:flex">
          <Filter size={12} /> ตัวกรอง
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              {["เวลา", "ลีก", "คู่แข่งขัน", MARKET_HEADER[market], "AI Score", "Win Probability", "Prediction", "Confidence", "Risk", "Value", ""].map(
                (h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => {
              const { homeTeam: home, awayTeam: away } = f;
              const p = f.prediction;
              return (
                <tr
                  key={f.id}
                  onClick={onSelect ? () => onSelect(f) : undefined}
                  className={`border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-elevated)] ${
                    onSelect ? "cursor-pointer" : ""
                  } ${
                    selectedId === f.id
                      ? "bg-[var(--neon-blue-soft)] shadow-[inset_3px_0_0_var(--neon-blue)]"
                      : f.isMatchOfTheDay
                        ? "bg-[var(--neon-green-soft)]"
                        : ""
                  }`}
                >
                  <td className="tabular px-3 py-3 font-semibold">
                    {f.status === "LIVE" ? (
                      <span className="font-black text-[var(--danger)]">
                        {f.homeGoals ?? 0}-{f.awayGoals ?? 0}{" "}
                        <span className="animate-pulse text-[9px]">
                          ●{f.elapsed != null ? ` ${f.elapsed}'` : ""}
                        </span>
                      </span>
                    ) : f.status === "FINISHED" ? (
                      <span className="font-black">
                        {f.homeGoals ?? "-"}-{f.awayGoals ?? "-"}{" "}
                        <span className="text-[9px] font-normal text-[var(--text-muted)]">จบ</span>
                      </span>
                    ) : (
                      f.kickoffLabel
                    )}
                  </td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">
                    {f.league.name}
                  </td>
                  <td className="px-3 py-3">
                    {onSelect ? (
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5">
                          <TeamLogo teamId={home.id} shortName={home.shortName} logo={home.logo} size={16} />
                          <span className="font-semibold">{home.shortName}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <TeamLogo teamId={away.id} shortName={away.shortName} logo={away.logo} size={16} />
                          <span className="text-[var(--text-secondary)]">{away.shortName}</span>
                        </span>
                      </div>
                    ) : (
                      <Link href={`/match/${f.id}`} className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5">
                          <TeamLogo teamId={home.id} shortName={home.shortName} logo={home.logo} size={16} />
                          <span className="font-semibold">{home.shortName}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <TeamLogo teamId={away.id} shortName={away.shortName} logo={away.logo} size={16} />
                          <span className="text-[var(--text-secondary)]">{away.shortName}</span>
                        </span>
                      </Link>
                    )}
                  </td>
                  <td className="tabular px-3 py-3 font-semibold">{marketCell(p, market)}</td>
                  <td className="px-3 py-3">
                    <ScoreRing score={p.aiScore} size={40} label="" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2 text-[11px]">
                      <span className="tabular font-semibold text-[var(--neon-green)]">
                        {p.winProbability.home}%
                      </span>
                      <span className="tabular text-[var(--neon-blue)]">{p.winProbability.draw}%</span>
                      <span className="tabular text-[var(--text-muted)]">{p.winProbability.away}%</span>
                    </div>
                    <div className="mt-1 flex w-24 gap-0.5">
                      <span className="h-1 rounded-full bg-[var(--neon-green)]" style={{ width: `${p.winProbability.home}%` }} />
                      <span className="h-1 rounded-full bg-[var(--neon-blue)]" style={{ width: `${p.winProbability.draw}%` }} />
                      <span className="h-1 rounded-full bg-[rgba(120,150,200,0.35)]" style={{ width: `${p.winProbability.away}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {/* Always the team name — never bare "Home Win" */}
                    <p className="font-semibold">
                      {p.pick === "DRAW" ? "เสมอ" : `${p.pickTeamName} Win`}
                    </p>
                    <p className="tabular text-[11px] text-[var(--text-secondary)]">
                      {p.expectedScore.home}-{p.expectedScore.away}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={confidenceTone[p.confidence]}>{confidenceLabel[p.confidence]}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={riskTone[p.risk]}>{riskLabel[p.risk]}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={valueTone[p.value]}>{valueLabel[p.value]}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      <Star
                        size={15}
                        className={
                          f.isMatchOfTheDay
                            ? "fill-[var(--gold)] text-[var(--gold)]"
                            : "text-[var(--text-muted)]"
                        }
                      />
                      {onSelect && (
                        <Link
                          href={`/match/${f.id}`}
                          onClick={(e) => e.stopPropagation()}
                          title="เปิดหน้าวิเคราะห์เต็ม"
                          className="text-[var(--text-muted)] transition-colors hover:text-[var(--neon-blue)]"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 p-3 md:hidden">
        {rows.map((f) => {
          const { homeTeam: home, awayTeam: away } = f;
          const p = f.prediction;
          const CardTag = onSelect ? "div" : Link;
          return (
            <CardTag
              key={f.id}
              href={`/match/${f.id}`}
              onClick={onSelect ? () => onSelect(f) : undefined}
              className={`glass glass-hover block p-3 ${onSelect ? "cursor-pointer" : ""} ${
                selectedId === f.id ? "border-[var(--border-glow-blue)]" : ""
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>
                  {f.status === "LIVE" ? (
                    <span className="font-bold text-[var(--danger)]">
                      {f.homeGoals ?? 0}-{f.awayGoals ?? 0} LIVE{f.elapsed != null ? ` ${f.elapsed}'` : ""}
                    </span>
                  ) : f.status === "FINISHED" ? (
                    <span className="font-bold text-[var(--text-primary)]">จบ {f.homeGoals ?? "-"}-{f.awayGoals ?? "-"}</span>
                  ) : (
                    f.kickoffLabel
                  )}{" "}· {f.league.name}
                </span>
                <ScoreRing score={p.aiScore} size={36} label="" />
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[13px] font-bold">
                <span className="flex min-w-0 items-center gap-1.5">
                  <TeamLogo teamId={home.id} shortName={home.shortName} logo={home.logo} size={20} />
                  <span className="truncate">{home.shortName}</span>
                </span>
                <span className="shrink-0 text-[11px] font-normal text-[var(--text-muted)]">vs</span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <TeamLogo teamId={away.id} shortName={away.shortName} logo={away.logo} size={20} />
                  <span className="truncate">{away.shortName}</span>
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--neon-green)]">
                {market === "ou" && p.overUnderPick != null && p.overUnderLine != null
                  ? `สูง/ต่ำ: ${p.overUnderPick === "OVER" ? "Over" : "Under"} ${p.overUnderLine} · `
                  : market === "corner" && p.cornerPick != null && p.cornerLine != null
                    ? `เตะมุม: ${p.cornerPick === "OVER" ? "Over" : "Under"} ${p.cornerLine} · `
                    : ""}
                AI PICK: {p.pick === "DRAW" ? "เสมอ" : `${p.pickTeamName} Win`}{" "}
                <span className="tabular text-[var(--text-secondary)]">
                  ({p.expectedScore.home}-{p.expectedScore.away})
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone={confidenceTone[p.confidence]}>{confidenceLabel[p.confidence]}</Badge>
                <Badge tone={riskTone[p.risk]}>RISK {riskLabel[p.risk]}</Badge>
                <Badge tone={valueTone[p.value]}>{valueLabel[p.value]}</Badge>
                {onSelect && (
                  <Link
                    href={`/match/${f.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="ml-auto text-[11px] text-[var(--neon-blue)]"
                  >
                    วิเคราะห์เต็ม →
                  </Link>
                )}
              </div>
            </CardTag>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div className="p-8 text-center text-[12px] text-[var(--text-muted)]">
          ไม่มีคู่ที่ตรงเงื่อนไขตัวกรองนี้
        </div>
      )}
    </section>
  );
}
