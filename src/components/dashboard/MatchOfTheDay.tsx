import Link from "next/link";
import { Star, Trophy, CheckCircle2, UserRound, Radio } from "lucide-react";
import { Fixture } from "@/lib/types";
import type { LiveRead } from "@/lib/claude-live";
import { AiFactors } from "../match/AiFactors";
import { CountUp } from "../ui/CountUp";
import { KickoffCountdown } from "../ui/KickoffCountdown";
import { ShareButtons } from "../match/ShareButtons";
import { FavoriteStar } from "../ui/FavoriteStar";
import { TeamLogo } from "../ui/TeamLogo";
import { PlayerPhoto } from "../ui/PlayerPhoto";
import { FormBadges } from "../ui/FormBadges";
import { ScoreRing } from "../ui/ScoreRing";
import { ProbBar } from "../ui/ProbBar";
import { Stars } from "../ui/Stars";
import { Badge } from "../ui/Badge";
import {
  confidenceLabel,
  confidenceTone,
  riskLabel,
  riskTone,
  valueLabel,
  valueTone,
} from "@/lib/engine/labels";

export function MatchOfTheDay({
  fixture,
  liveRead,
}: {
  fixture: Fixture;
  liveRead?: LiveRead | null;
}) {
  const { homeTeam: home, awayTeam: away, league } = fixture;
  const p = fixture.prediction;
  const keyPlayers = [fixture.homeKeyPlayer, fixture.awayKeyPlayer].filter(
    (kp) => kp !== undefined
  );

  return (
    <section className="glass glow-green animate-fade-up p-4 lg:p-5">
      {/* LIVE AI — ทรรศนะสด (เฉพาะตอนกำลังเตะ + มีผลจาก cron) */}
      {fixture.status === "LIVE" && liveRead && (
        <div className="mb-3 rounded-xl border border-[rgba(255,77,94,0.4)] bg-[rgba(255,77,94,0.06)] p-3">
          <h3 className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-[var(--danger)]">
            <Radio size={12} className="animate-pulse" /> LIVE AI — อัปเดตสด
            <span className="tabular ml-auto text-[10px] font-normal text-[var(--text-muted)]">
              {liveRead.phase ?? `นาที ${liveRead.minute ?? "-"}`} · {liveRead.score}
            </span>
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">
            {liveRead.readTh}
          </p>
          {liveRead.leanTh && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--neon-blue)]">
              แนวโน้ม: {liveRead.leanTh}
            </p>
          )}
        </div>
      )}
      {/* Header — มือถือ: ปุ่มแชร์ wrap ลงบรรทัดใหม่ (ไม่เบียดชื่อ) · จอใหญ่: ปุ่มชิดขวา */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <div className="flex shrink-0 items-center gap-2">
          <Star size={16} className="shrink-0 fill-[var(--neon-green)] text-[var(--neon-green)]" />
          <h2 className="whitespace-nowrap text-sm font-extrabold text-[var(--neon-green)]">
            {fixture.isMatchOfTheDay ? "บอลเด่นวันนี้ (AI)" : "คู่ที่เลือกดู"}
          </h2>
          {!fixture.isMatchOfTheDay && (
            <span className="rounded bg-[var(--neon-blue-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--neon-blue)]">
              SELECTED
            </span>
          )}
        </div>
        {/* แชร์ + ติดตาม คู่นี้ได้จากหน้าแรกเลย ไม่ต้องกดเข้าหน้าวิเคราะห์ */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <ShareButtons
            title={`AI ทาย ${home.name} vs ${away.name} — BALLAI365`}
            path={`/match/${fixture.id}`}
          />
          <FavoriteStar
            match={{
              id: fixture.id,
              home: home.name,
              away: away.name,
              kickoff: fixture.kickoff,
              kickoffLabel: fixture.kickoffLabel,
              league: league.nameTh,
            }}
          />
        </div>
      </div>

      {/* Teams */}
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-3">
          <TeamLogo teamId={home.id} shortName={home.shortName} logo={home.logo} size={56} />
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold lg:text-lg">{home.name.toUpperCase()}</p>
            <FormBadges form={home.form} />
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {home.fifaRank
                ? `อันดับโลก ${home.fifaRank}`
                : home.rank > 0
                  ? `อันดับ ${home.rank} | ${home.points} แต้ม`
                  : "ไม่มีข้อมูลอันดับ"}
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] text-[var(--text-secondary)]">{league.nameTh}</p>
          <p className="text-[13px] font-semibold text-[var(--neon-blue)]">
            {fixture.kickoffLabel}{" "}
            <span className="text-[var(--text-muted)]">{kickoffDateLabel(fixture.kickoff)}</span>
          </p>
          {fixture.status === "SCHEDULED" && <KickoffCountdown kickoff={fixture.kickoff} />}
          {fixture.status === "LIVE" ? (
            <>
              <p className="tabular text-2xl font-black tracking-widest text-[var(--danger)] lg:text-3xl">
                {fixture.homeGoals ?? 0} - {fixture.awayGoals ?? 0}
              </p>
              <p className="animate-pulse text-[10px] font-bold tracking-widest text-[var(--danger)]">
                ● LIVE{fixture.elapsed != null ? ` ${fixture.elapsed}'` : ""}
              </p>
            </>
          ) : fixture.status === "FINISHED" ? (
            <>
              <p className="tabular text-2xl font-black tracking-widest lg:text-3xl">
                {fixture.homeGoals ?? "-"} - {fixture.awayGoals ?? "-"}
              </p>
              <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)]">จบแล้ว</p>
            </>
          ) : (
            <p className="text-2xl font-black tracking-widest lg:text-3xl">VS</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 text-right">
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold lg:text-lg">{away.name.toUpperCase()}</p>
            <div className="flex justify-end">
              <FormBadges form={away.form} />
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {away.fifaRank
                ? `อันดับโลก ${away.fifaRank}`
                : away.rank > 0
                  ? `อันดับ ${away.rank} | ${away.points} แต้ม`
                  : "ไม่มีข้อมูลอันดับ"}
            </p>
          </div>
          <TeamLogo teamId={away.id} shortName={away.shortName} logo={away.logo} size={56} />
        </div>
      </div>

      {/* AI Pick row */}
      <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr_auto_auto]">
        {/* Pick */}
        <div className="rounded-xl border border-[var(--border-glow-green)] bg-[var(--neon-green-soft)] p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[var(--gold)]">
            <Trophy size={13} /> AI เลือก
          </p>
          <p className="text-glow-green mt-1 text-xl font-black text-[var(--neon-green)] lg:text-2xl">
            {p.pickLabel}
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            AI เลือก: {p.pickTeamName} ชนะ
          </p>
          {(() => {
            // ทายผลชนะ (1X2) กับคำแนะนำราคาต่อรอง อาจคนละทีม —
            // ตัวเต็งชนะแต่ "ชนะไม่ขาด" จึงไม่ผ่านราคาต่อรอง → แนะนำรับลูกทีมรอง
            const pickTeam = p.pick === "HOME" ? home : p.pick === "AWAY" ? away : null;
            // กรณีราคาเสมอ (push เส้นเต็มพอดี ของคู่ที่ไม่มีคำตัดสิน Claude) — ไม่ขึ้นเตือน ไม่รบกวน
            if (p.handicapPickTeam?.includes("เสมอราคา") || p.handicapPickTeam?.includes("ก้ำกึ่ง")) {
              return null;
            }
            const hcDiffers =
              !!pickTeam &&
              !!p.handicapPickTeam &&
              !p.handicapPickTeam.includes(pickTeam.shortName) &&
              !p.handicapPickTeam.includes(pickTeam.name);
            if (!hcDiffers) return null;
            return (
              <p className="mt-2 rounded-lg bg-[var(--warning-soft)] px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--warning)]">
                ⚠️ {pickTeam!.shortName} ชนะแต่ <b>ไม่ผ่านราคาต่อรอง</b> (ชนะไม่ขาด) —
                ถ้าจะเล่นแฮนดิแคป AI แนะนำให้มอง <b>{p.handicapPickTeam}</b>
              </p>
            );
          })()}
        </div>

        {/* Win probability */}
        <div className="glass p-4">
          <p className="text-[11px] font-bold tracking-wider text-[var(--text-secondary)]">
            โอกาสชนะ
          </p>
          {/* grid 3 คอลัมน์เท่ากัน — ตัวเลขตรงแนวเดียวกันเสมอ ชื่อทีมยาวถูกตัดด้วย … */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { v: p.winProbability.home, l: home.shortName, c: "var(--neon-green)" },
              { v: p.winProbability.draw, l: "เสมอ", c: "var(--neon-blue)" },
              { v: p.winProbability.away, l: away.shortName, c: "var(--text-secondary)" },
            ].map(({ v, l, c }) => (
              <div key={l} className="min-w-0 text-center">
                <p className="tabular text-xl font-extrabold leading-none" style={{ color: c }}>
                  <CountUp value={v} />%
                </p>
                <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]" title={l}>
                  {l}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <ProbBar {...p.winProbability} />
          </div>
        </div>

        {/* มือถือ: AI Score + Confidence/Risk/Value อยู่ 2 คอลัมน์ในแถวเดียว (ลดความยาว)
            จอใหญ่: lg:contents ทำให้ 2 กล่องนี้กลับไปเรียงในกริดหลักเหมือนเดิม */}
        <div className="grid grid-cols-2 gap-3 lg:contents">
          {/* AI Score */}
          <div className="glass flex flex-col items-center justify-center p-4">
            <p className="text-[11px] font-bold tracking-wider text-[var(--text-secondary)]">
              คะแนน AI
            </p>
            <ScoreRing score={p.aiScore} size={88} />
          </div>

          {/* Confidence / Risk / Value */}
          <div className="glass flex flex-col justify-center gap-2.5 p-4 text-[12px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-muted)]">ความมั่นใจ</span>
              <Badge tone={confidenceTone[p.confidence]}>{confidenceLabel[p.confidence]}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-muted)]">ความเสี่ยง</span>
              <Badge tone={riskTone[p.risk]}>{riskLabel[p.risk]}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-muted)]">ความคุ้ม</span>
              <Badge tone={valueTone[p.value]}>{valueLabel[p.value]}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* มือถือ: คำทายหลัก 3 อัน แถวเดียวกระชับ (สกอร์ · แฮนดิแคป · สูง/ต่ำ) */}
      <div className="mt-3 grid grid-cols-3 gap-2 lg:hidden">
        <div className="glass p-2.5 text-center">
          <p className="text-[9px] font-semibold tracking-wider text-[var(--text-muted)]">สกอร์ทาย</p>
          <p className="tabular mt-1 text-[15px] font-bold leading-none">
            {p.expectedScore.home}-{p.expectedScore.away}
          </p>
        </div>
        <div className="glass p-2.5 text-center">
          <p className="text-[9px] font-semibold tracking-wider text-[var(--text-muted)]">แนะนำเล่น</p>
          <p className="mt-1 text-[11px] font-bold leading-tight text-[var(--soft-purple)]">
            {p.handicapPickTeam ?? "—"}
          </p>
        </div>
        <div className="glass p-2.5 text-center">
          <p className="text-[9px] font-semibold tracking-wider text-[var(--text-muted)]">สูง / ต่ำ</p>
          <p className="mt-1 text-[11px] font-bold leading-tight text-[var(--soft-purple)]">
            {p.overUnderPick != null && p.overUnderLine != null
              ? `${p.overUnderPick === "OVER" ? "สูง" : "ต่ำ"} ${p.overUnderLine}`
              : "—"}
          </p>
        </div>
      </div>

      {/* Stat strip — ซ่อนบนมือถือ (ดูครบในหน้าวิเคราะห์เต็ม) โชว์เฉพาะคอม */}
      <div className="mt-3 hidden gap-3 lg:grid lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "สกอร์ที่ทาย", value: `${p.expectedScore.home} - ${p.expectedScore.away}`, sub: "AI ทาย · อัปเดตล่าสุดก่อนเตะ" },
          p.handicapPickTeam !== null
            ? { label: "แฮนดิแคป", value: `แนะนำเล่น ${p.handicapPickTeam}`, sub: `แต้มต่อ ${p.handicapLine}`, accent: "var(--soft-purple)" }
            : { label: "แฮนดิแคป", value: "ไม่มีข้อมูลแฮนดิแคป", sub: "ไม่มีข้อมูล", accent: "var(--text-muted)" },
          p.overUnderPick !== null
            ? { label: "สูง / ต่ำ", value: `${p.overUnderPick === "OVER" ? "สูง" : "ต่ำ"} ${p.overUnderLine}`, sub: p.overUnderNote ?? `สกอร์รวม ${p.overUnderLine}`, accent: "var(--soft-purple)" }
            : { label: "สูง / ต่ำ", value: "ไม่มีข้อมูลสูงต่ำ", sub: "ไม่มีข้อมูล", accent: "var(--text-muted)" },
          p.cornerPick !== null
            ? { label: "เตะมุม", value: `${p.cornerPick === "OVER" ? "สูง" : "ต่ำ"} ${p.cornerLine}`, sub: `เตะมุมรวม ${p.cornerLine}`, accent: "var(--soft-purple)" }
            : { label: "เตะมุม", value: "ไม่มีข้อมูลเตะมุม", sub: "ไม่มีข้อมูล", accent: "var(--text-muted)" },
          { label: "ความคุ้มค่า", value: "", sub: "ดาวความคุ้ม", stars: p.valueStars },
          { label: "คุณภาพข้อมูล", value: `${p.dataQuality}/100`, sub: p.dataQuality >= 70 ? "ข้อมูลค่อนข้างสมบูรณ์" : "ข้อมูลยังไม่ครบ", accent: p.dataQuality >= 70 ? "var(--neon-green)" : "var(--warning)" },
        ].map((s) => (
          <div key={s.label} className="glass p-3">
            <p className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)]">{s.label}</p>
            {s.stars ? (
              <div className="mt-1.5">
                <Stars count={s.stars} />
              </div>
            ) : (
              <p className="tabular mt-1 text-[14px] font-bold leading-tight break-words" style={{ color: s.accent }}>
                {s.value}
              </p>
            )}
            <p className="text-[10px] leading-tight text-[var(--text-secondary)]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* AI Reason (6 ปัจจัย) + Key Players — ซ่อนบนมือถือ (อยู่ในหน้าวิเคราะห์เต็ม) โชว์เฉพาะคอม */}
      <div className="mt-3 hidden space-y-3 lg:block">
        <div className="glass p-4">
          <p className="text-[11px] font-bold tracking-wider text-[var(--neon-green)]">
            เหตุผล AI{" "}
            <span className="font-normal text-[var(--text-muted)]">
              {p.factors ? "(6 ปัจจัย · คะแนน 0-10)" : "(เหตุผลที่เลือก)"}
            </span>
          </p>
          {p.factors ? (
            <div className="mt-2.5">
              <AiFactors factors={p.factors} />
            </div>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {p.reasons.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--neon-green)]" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[var(--text-secondary)]">
            <UserRound size={13} /> ผู้เล่นคนสำคัญ
          </p>
          {keyPlayers.length === 0 && (
            <p className="mt-3 text-[11px] text-[var(--text-muted)]">
              ยังไม่มีข้อมูลนักเตะสำหรับคู่นี้ (Missing Data)
            </p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-3">
            {keyPlayers.map((kp) => (
              <div key={kp.id} className="flex items-start gap-2.5">
                <PlayerPhoto photo={kp.photo} name={kp.name} size={44} />
                <div className="min-w-0 text-[11px]">
                  <p className="flex items-center gap-1 truncate text-[12px] font-bold">
                    {kp.name}
                    <Star size={11} className="shrink-0 fill-[var(--gold)] text-[var(--gold)]" />
                  </p>
                  <p className="text-[var(--text-muted)]">{kp.positionTh}</p>
                  {kp.rating > 0 ? (
                    <>
                      <p>
                        Rating <span className="font-bold text-[var(--neon-blue)]">{kp.rating}</span>
                      </p>
                      <p className="text-[var(--text-secondary)]">
                        {kp.goals} ประตู {kp.assists} แอสซิสต์
                      </p>
                      {kp.fitness > 0 && (
                        <p>
                          ความฟิต <span className="font-bold text-[var(--neon-green)]">{kp.fitness}%</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[var(--soft-purple)]">เลือกโดย Claude AI</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* มือถือ: ปุ่ม "ดูวิเคราะห์เต็ม" เต็มแถวเป็น CTA ชัด ๆ (คอม: วางขวาเหมือนเดิม) */}
      <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <p className="order-2 text-[10px] text-[var(--text-muted)] lg:order-1">{p.warning}</p>
        <Link
          href={`/match/${fixture.id}`}
          className="order-1 rounded-lg bg-[var(--neon-green)] px-4 py-2.5 text-center text-[12px] font-bold text-black transition-opacity hover:opacity-90 lg:order-2 lg:shrink-0 lg:py-2"
        >
          ดูวิเคราะห์เต็ม (สกอร์ · แฮนดิแคป · สูง/ต่ำ · เหตุผล) →
        </Link>
      </div>
    </section>
  );
}

function kickoffDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });
}
