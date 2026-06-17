"use client";

import { useState } from "react";
import Link from "next/link";
import { CloudRain, BellRing, UserRound, Newspaper, Ban } from "lucide-react";
import { Fixture } from "@/lib/types";
import { TeamLogo } from "../ui/TeamLogo";
import { PlayerPhoto } from "../ui/PlayerPhoto";
import { TacticalOverview } from "../match/TacticalOverview";
import { MatchStatsPanel } from "../match/MatchStatsPanel";

const tabs = ["สถิติ", "ฟอร์ม", "H2H", "ผู้เล่น", "ข่าวสาร"] as const;

/** Right-hand panel — details of the selected match. */
export function MatchDetailPanel({ fixture }: { fixture: Fixture }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("สถิติ");

  return (
    <aside className="space-y-3">
      <section className="glass p-4">
        <h3 className="text-[12px] font-extrabold tracking-wider">
          <span className="mr-1 text-[var(--neon-blue)]">▎</span>MATCH DETAIL
        </h3>

        <div className="mt-2 flex gap-1 border-b border-[var(--border-subtle)]">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-2.5 pb-1.5 text-[11px] transition-colors ${
                tab === t
                  ? "border-[var(--neon-blue)] font-semibold text-[var(--neon-blue)]"
                  : "border-transparent text-[var(--text-secondary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "สถิติ" && <StatsTab fixture={fixture} />}
        {tab === "ฟอร์ม" && <FormTab fixture={fixture} />}
        {tab === "H2H" && <H2HTab fixture={fixture} />}
        {tab === "ผู้เล่น" && <PlayersTab fixture={fixture} />}
        {tab === "ข่าวสาร" && <NewsTab fixture={fixture} />}
      </section>

      {/* สถิติในเกม — เฉพาะเมื่อบอลเริ่มเตะแล้ว (LIVE/FINISHED) */}
      <MatchStatsPanel fixture={fixture} />

      {/* แผนการเล่นจาก lineups จริง */}
      <TacticalOverview fixture={fixture} />

      {/* Weather */}
      <section className="glass p-4">
        <h3 className="text-[12px] font-extrabold tracking-wider">WEATHER</h3>
        <div className="mt-2 flex items-center gap-3">
          <CloudRain size={32} className="text-[var(--neon-blue)]" />
          <span className="text-2xl font-bold text-[var(--neon-blue)]">
            {fixture.weather.temperatureC}°C
          </span>
          <dl className="ml-auto space-y-0.5 text-right text-[11px] text-[var(--text-secondary)]">
            <div>ฝน {fixture.weather.rainProbability}%</div>
            <div>ลม {fixture.weather.windKmh} km/h</div>
            <div>ความชื้น {fixture.weather.humidity}%</div>
          </dl>
        </div>
        <p className="mt-2 text-center text-[11px] text-[var(--neon-blue)]">
          {fixture.weather.impactNote} (Impact {fixture.weather.impactScore}/100)
        </p>
      </section>

      {/* AI Alert */}
      {fixture.alert && (
        <section className="glass border-[rgba(245,197,66,0.3)] p-4">
          <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-wider text-[var(--gold)]">
            <BellRing size={14} /> AI ALERT
          </h3>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
            {fixture.alert}
          </p>
          <Link
            href={`/match/${fixture.id}`}
            className="mt-3 block rounded-lg bg-[var(--neon-green)] py-2 text-center text-[12px] font-bold text-black transition-opacity hover:opacity-90"
          >
            ดูรายละเอียด
          </Link>
        </section>
      )}
    </aside>
  );
}

function StatsTab({ fixture }: { fixture: Fixture }) {
  const { homeTeam: home, awayTeam: away } = fixture;
  const rows: { label: string; h: number; a: number; pct?: boolean }[] = [
    { label: "ประตูได้", h: home.statsAvg.goalsFor, a: away.statsAvg.goalsFor },
    { label: "ประตูเสีย", h: home.statsAvg.goalsAgainst, a: away.statsAvg.goalsAgainst },
    { label: "ครองบอล", h: home.statsAvg.possession, a: away.statsAvg.possession, pct: true },
    { label: "ยิงประตู", h: home.statsAvg.shots, a: away.statsAvg.shots },
    { label: "เตะมุม", h: home.statsAvg.corners, a: away.statsAvg.corners },
  ];

  return (
    <>
      <H2HTab fixture={fixture} compact />
      <p className="mt-4 text-[10px] font-bold tracking-wider text-[var(--text-muted)]">
        TEAM STATS (AVG)
      </p>
      <div className="mt-1.5 space-y-2">
        {rows.map((r) => {
          const max = Math.max(r.h, r.a) || 1;
          const noData = r.h === 0 && r.a === 0;
          if (noData)
            return (
              <div key={r.label} className="grid grid-cols-[2.5rem_1fr_4rem_1fr_2.5rem] items-center gap-1.5 text-[11px]">
                <span className="text-[var(--text-muted)]">—</span>
                <span />
                <span className="text-center text-[var(--text-muted)]">{r.label}</span>
                <span />
                <span className="text-right text-[var(--text-muted)]">—</span>
              </div>
            );
          return (
            <div key={r.label} className="grid grid-cols-[2.5rem_1fr_4rem_1fr_2.5rem] items-center gap-1.5 text-[11px]">
              <span className="tabular font-semibold">{r.h}{r.pct ? "%" : ""}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-[rgba(120,150,200,0.15)]">
                <span className="block h-full rounded-full bg-[var(--neon-blue)]" style={{ width: `${(r.h / max) * 100}%`, marginLeft: "auto" }} />
              </span>
              <span className="text-center text-[var(--text-muted)]">{r.label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-[rgba(120,150,200,0.15)]">
                <span className="block h-full rounded-full bg-[var(--danger)]" style={{ width: `${(r.a / max) * 100}%` }} />
              </span>
              <span className="tabular text-right font-semibold">{r.a}{r.pct ? "%" : ""}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function H2HTab({ fixture, compact }: { fixture: Fixture; compact?: boolean }) {
  const { homeTeam: home, awayTeam: away } = fixture;
  const hasH2H =
    fixture.h2h.homeWins + fixture.h2h.draws + fixture.h2h.awayWins > 0;
  if (!hasH2H) {
    return (
      <>
        <p className="mt-3 text-[10px] font-bold tracking-wider text-[var(--text-muted)]">
          HEAD TO HEAD
        </p>
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
          ยังไม่มีข้อมูลการเจอกัน (ดูเพิ่มในหน้ารายละเอียดคู่)
        </p>
        {!compact && <FormTab fixture={fixture} />}
      </>
    );
  }
  return (
    <>
      <p className="mt-3 text-[10px] font-bold tracking-wider text-[var(--text-muted)]">
        HEAD TO HEAD
      </p>
      <div className="mt-2 flex items-center justify-between">
        <TeamLogo teamId={home.id} shortName={home.shortName} logo={home.logo} size={30} />
        <div className="flex items-center gap-3 text-center">
          <div>
            <p className="tabular text-base font-bold text-[var(--neon-green)]">{fixture.h2h.homeWins}</p>
            <p className="text-[9px] text-[var(--text-muted)]">{home.shortName} ชนะ</p>
          </div>
          <div>
            <p className="tabular text-base font-bold text-[var(--neon-blue)]">{fixture.h2h.draws}</p>
            <p className="text-[9px] text-[var(--text-muted)]">เสมอ</p>
          </div>
          <div>
            <p className="tabular text-base font-bold text-[var(--text-secondary)]">{fixture.h2h.awayWins}</p>
            <p className="text-[9px] text-[var(--text-muted)]">{away.shortName} ชนะ</p>
          </div>
        </div>
        <TeamLogo teamId={away.id} shortName={away.shortName} logo={away.logo} size={30} />
      </div>
      {!compact && <FormTab fixture={fixture} />}
    </>
  );
}

function FormTab({ fixture }: { fixture: Fixture }) {
  const resultStyle = {
    W: "bg-[var(--neon-green-soft)] text-[var(--neon-green)]",
    D: "bg-[rgba(91,108,140,0.25)] text-[var(--text-secondary)]",
    L: "bg-[var(--danger-soft)] text-[var(--danger)]",
  } as const;

  return (
    <>
      <p className="mt-4 text-[10px] font-bold tracking-wider text-[var(--text-muted)]">
        LAST 5 MATCHES
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {[fixture.homeRecent, fixture.awayRecent].map((recent, col) => (
          <div key={col} className="space-y-1">
            {recent.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-md bg-[var(--bg-elevated)] px-2 py-1 text-[10px]"
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded font-bold ${resultStyle[m.result]}`}>
                  {m.result}
                </span>
                <span className="tabular font-semibold">{m.score}</span>
                <span className="ml-auto text-[var(--text-muted)]">{m.opponentShort}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function PlayersTab({ fixture }: { fixture: Fixture }) {
  const kps = [fixture.homeKeyPlayer, fixture.awayKeyPlayer].filter(
    (kp) => kp !== undefined
  );
  if (kps.length === 0) {
    return (
      <p className="mt-3 text-[11px] text-[var(--text-muted)]">
        ยังไม่มีข้อมูลนักเตะสำหรับคู่นี้ (Missing Data)
      </p>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {kps.map((p) => (
        <div key={p.id} className="flex items-center gap-2.5 rounded-lg bg-[var(--bg-elevated)] p-2.5">
          <PlayerPhoto photo={p.photo} name={p.name} size={36} />
          <div className="text-[11px]">
            <p className="font-bold">{p.name}</p>
            <p className="text-[var(--text-muted)]">
              {p.positionTh}
              {p.rating > 0 ? ` · Rating ${p.rating}` : " · เลือกโดย Claude AI"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** ข่าวทีมจากข้อมูล API จริง: ตัวจริง / บาดเจ็บ-แบน / อากาศ / สถานะแมตช์ */
function NewsTab({ fixture }: { fixture: Fixture }) {
  const items: { icon: "lineup" | "injury" | "weather" | "status"; text: string }[] = [];

  for (const side of ["home", "away"] as const) {
    const team = side === "home" ? fixture.homeTeam : fixture.awayTeam;
    const lineup = side === "home" ? fixture.homeLineup : fixture.awayLineup;
    const injuries = side === "home" ? fixture.homeInjuries : fixture.awayInjuries;
    if (lineup?.confirmed) {
      items.push({
        icon: "lineup",
        text: `${team.shortName} ประกาศตัวจริงแล้ว (${lineup.formation ?? "-"}${lineup.coach ? ` · โค้ช ${lineup.coach}` : ""})`,
      });
    }
    for (const pl of injuries) {
      items.push({
        icon: "injury",
        text: `${pl.name} (${team.shortName}) ${pl.status === "suspended" ? "ติดโทษแบน" : "มีปัญหาบาดเจ็บ"}`,
      });
    }
  }
  if (fixture.weather.hasData && fixture.weather.impactScore >= 35) {
    items.push({ icon: "weather", text: `สภาพอากาศ: ${fixture.weather.impactNote} (โอกาสฝน ${fixture.weather.rainProbability}%)` });
  }
  if (fixture.status === "CANCELLED") items.push({ icon: "status", text: "แมตช์นี้ถูกยกเลิกการแข่งขัน" });
  if (fixture.status === "POSTPONED") items.push({ icon: "status", text: "แมตช์นี้ถูกเลื่อนการแข่งขัน" });

  if (items.length === 0) {
    return (
      <p className="mt-3 text-[11px] text-[var(--text-muted)]">
        ยังไม่มีข่าวจาก API สำหรับคู่นี้ (ตัวจริง/อาการบาดเจ็บจะอัปเดตใกล้เวลาแข่ง)
      </p>
    );
  }
  return (
    <ul className="mt-3 space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 rounded-lg bg-[var(--bg-elevated)] px-2.5 py-2 text-[11px] text-[var(--text-secondary)]">
          {it.icon === "lineup" && <UserRound size={13} className="mt-0.5 shrink-0 text-[var(--neon-green)]" />}
          {it.icon === "injury" && <Newspaper size={13} className="mt-0.5 shrink-0 text-[var(--warning)]" />}
          {it.icon === "weather" && <CloudRain size={13} className="mt-0.5 shrink-0 text-[var(--neon-blue)]" />}
          {it.icon === "status" && <Ban size={13} className="mt-0.5 shrink-0 text-[var(--danger)]" />}
          {it.text}
        </li>
      ))}
    </ul>
  );
}
