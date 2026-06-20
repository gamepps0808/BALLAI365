/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Radio, Search, CheckCircle2, XCircle, X } from "lucide-react";
import { LiteFixture } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { leagueRank } from "@/lib/league-priority";

export type AiResult = {
  pick: "HOME" | "DRAW" | "AWAY";
  pickTeam: string | null;
  expHome: number;
  expAway: number;
  correct: boolean;
  exact: boolean;
  graded: boolean;
};

type Variant = "matches" | "live" | "results";

/**
 * รายการบอลแบบค้นหา + กรองลีกได้ (client) — ใช้ร่วม 3 หน้า: แมตช์วันนี้ / สด / ย้อนหลัง
 * กรองในหน่วยความจำจากข้อมูลที่โหลดมาแล้ว — ไม่ยิง API เพิ่ม
 */
export function FixtureBrowser({
  fixtures,
  variant,
  aiResults,
  emptyText,
}: {
  fixtures: LiteFixture[];
  variant: Variant;
  aiResults?: Record<string, AiResult>;
  emptyText?: string;
}) {
  const [q, setQ] = useState("");
  const [league, setLeague] = useState<string | null>(null);

  const leagues = useMemo(() => {
    const m = new Map<string, { key: string; name: string; country: string; count: number }>();
    for (const f of fixtures) {
      const key = `${f.leagueName}__${f.leagueCountry}`;
      const e = m.get(key) ?? { key, name: f.leagueName, country: f.leagueCountry, count: 0 };
      e.count++;
      m.set(key, e);
    }
    return [...m.values()].sort(
      (a, b) => leagueRank(a.name, a.country) - leagueRank(b.name, b.country)
    );
  }, [fixtures]);

  const sections = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = fixtures.filter((f) => {
      if (league && `${f.leagueName}__${f.leagueCountry}` !== league) return false;
      if (term && !`${f.homeName} ${f.awayName}`.toLowerCase().includes(term)) return false;
      return true;
    });
    const groups = new Map<string, LiteFixture[]>();
    for (const f of rows) {
      const key = `${f.leagueName}__${f.leagueCountry}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    }
    return [...groups.values()]
      .map((list) => list.sort((a, b) => a.kickoff.localeCompare(b.kickoff)))
      .sort((a, b) => leagueRank(a[0].leagueName, a[0].leagueCountry) - leagueRank(b[0].leagueName, b[0].leagueCountry));
  }, [fixtures, q, league]);

  return (
    <div className="space-y-3">
      {/* ค้นหาทีม + กรองลีก */}
      <div className="glass space-y-2.5 p-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาทีม เช่น Liverpool, Brazil, ไทย..."
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] py-2 pl-9 pr-9 text-[13px] outline-none focus:border-[var(--border-glow-blue)]"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="ล้างคำค้นหา"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={league === null} onClick={() => setLeague(null)} label={`ทั้งหมด (${fixtures.length})`} />
          {leagues.map((l) => (
            <Chip
              key={l.key}
              active={league === l.key}
              onClick={() => setLeague(league === l.key ? null : l.key)}
              label={`${l.name} (${l.count})`}
            />
          ))}
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="glass p-10 text-center text-[12px] text-[var(--text-muted)]">
          {q || league ? "ไม่พบทีม/ลีกที่ค้นหา — ลองคำอื่น หรือกด ทั้งหมด" : emptyText ?? "ไม่มีรายการ"}
        </div>
      ) : (
        sections.map((list) => (
          <Section key={list[0].id} list={list} variant={variant} aiResults={aiResults} />
        ))
      )}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
        active
          ? "border-[var(--neon-blue)] bg-[var(--neon-blue-soft)] text-[var(--neon-blue)]"
          : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
      }`}
    >
      {label}
    </button>
  );
}

function Section({
  list,
  variant,
  aiResults,
}: {
  list: LiteFixture[];
  variant: Variant;
  aiResults?: Record<string, AiResult>;
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
        {list.map((f) => (
          <Row key={f.id} f={f} variant={variant} ai={aiResults?.[f.id]} />
        ))}
      </div>
    </section>
  );
}

function Row({ f, variant, ai }: { f: LiteFixture; variant: Variant; ai?: AiResult }) {
  const clickable = variant !== "matches" && (variant === "live" || !!ai);
  const inner = (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
      {/* เวลา / นาที / สกอร์ */}
      <span className="tabular w-14 shrink-0 text-[12px] font-semibold">
        {f.status === "LIVE" ? (
          <span className="flex items-center gap-1 text-[var(--danger)]">
            <Radio size={11} className="animate-pulse" />
            {f.elapsed != null ? `${f.elapsed}'` : "LIVE"}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">{f.kickoffLabel}</span>
        )}
      </span>

      {/* ทีม + สกอร์ */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-[13px] font-semibold">{f.homeName}</span>
          {f.homeLogo && <img src={f.homeLogo} alt="" width={18} height={18} loading="lazy" className="shrink-0" />}
        </span>
        {f.status === "LIVE" ? (
          <span className="tabular shrink-0 rounded-lg bg-[var(--danger-soft)] px-3 py-1 text-[15px] font-black text-[var(--danger)]">
            {f.homeGoals ?? 0} - {f.awayGoals ?? 0}
          </span>
        ) : f.status === "FINISHED" ? (
          <span className="tabular shrink-0 rounded-lg bg-[var(--bg-elevated)] px-3 py-1 text-[15px] font-black">
            {f.homeGoals ?? "-"} - {f.awayGoals ?? "-"}
          </span>
        ) : f.status === "CANCELLED" || f.status === "POSTPONED" ? (
          <span className="shrink-0 rounded-lg bg-[var(--danger-soft)] px-3 py-1 text-[11px] font-bold text-[var(--danger)]">
            {f.status === "CANCELLED" ? "ยกเลิก" : "เลื่อน"}
          </span>
        ) : (
          <span className="shrink-0 text-[12px] font-bold text-[var(--text-muted)]">vs</span>
        )}
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {f.awayLogo && <img src={f.awayLogo} alt="" width={18} height={18} loading="lazy" className="shrink-0" />}
          <span className="truncate text-[13px] font-semibold">{f.awayName}</span>
        </span>
      </div>

      {/* คอลัมน์ขวาตาม variant */}
      {variant === "matches" && (
        <div className="hidden w-40 shrink-0 text-right text-[11px] sm:block">
          <span className="tabular font-bold text-[var(--soft-purple)]">
            {f.ahLine !== null ? `AH ${f.ahLine > 0 ? "+" : ""}${f.ahLine}` : "—"}
          </span>
          <span className="tabular block text-[var(--text-secondary)]">
            {f.mwHome !== null ? `${f.mwHome.toFixed(2)} / ${f.mwDraw?.toFixed(2)} / ${f.mwAway?.toFixed(2)}` : ""}
          </span>
        </div>
      )}
      {variant === "live" && (
        <span className="tabular hidden w-16 shrink-0 text-right text-[11px] text-[var(--text-muted)] sm:block">
          {f.ahLine !== null ? `AH ${f.ahLine > 0 ? "+" : ""}${f.ahLine}` : ""}
        </span>
      )}
      {variant === "results" && ai && (
        <div className="text-right text-[11px]">
          <p className="text-[var(--text-muted)]">
            AI:{" "}
            <span className="font-semibold text-[var(--text-secondary)]">
              {ai.pick === "DRAW" ? "เสมอ" : `${ai.pickTeam} ชนะ`}
            </span>{" "}
            ({ai.expHome}-{ai.expAway})
          </p>
          <div className="mt-0.5 flex justify-end gap-1.5">
            {!ai.graded ? (
              <Badge tone="muted">ไม่นับผล</Badge>
            ) : ai.correct ? (
              <Badge tone="green">
                <CheckCircle2 size={11} /> ทายถูก
              </Badge>
            ) : (
              <Badge tone="red">
                <XCircle size={11} /> ทายผิด
              </Badge>
            )}
            {ai.graded && ai.exact && <Badge tone="gold">สกอร์เป๊ะ</Badge>}
          </div>
        </div>
      )}
    </div>
  );

  return clickable ? (
    <Link href={`/match/${f.id}`} className="block transition-colors hover:bg-[var(--bg-elevated)]">
      {inner}
    </Link>
  ) : (
    <div className="transition-colors hover:bg-[var(--bg-elevated)]">{inner}</div>
  );
}
