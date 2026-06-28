import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { matchJsonLd } from "@/lib/jsonld";
import { FavoriteStar } from "@/components/ui/FavoriteStar";
import {
  ArrowLeft,
  CheckCircle2,
  TriangleAlert,
  CloudRain,
  Database,
  Globe,
  Link2,
  Scale,
  Radio,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ProbBar } from "@/components/ui/ProbBar";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/ui/Stars";
import { RadarCompare } from "@/components/match/RadarCompare";
import { OddsMovementChart } from "@/components/match/OddsMovementChart";
import { ProviderBanner } from "@/components/ui/ProviderBanner";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { StartingXI } from "@/components/match/StartingXI";
import { LiveCenter } from "@/components/match/LiveCenter";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { DevDebugPanel } from "@/components/dev/DevDebugPanel";
import { fetchFixture } from "@/lib/service";
import { loadLiveRead } from "@/lib/live-store";
import { LiveRead } from "@/lib/claude-live";
import { AiFactors } from "@/components/match/AiFactors";
import {
  confidenceLabel,
  confidenceTone,
  riskLabel,
  riskTone,
  valueLabel,
  valueTone,
  statusLabel,
  statusTone,
} from "@/lib/engine/labels";

export const dynamic = "force-dynamic";

/**
 * title/description เฉพาะรายคู่ เพื่อ SEO + การ์ดสวยตอนแชร์ social
 * ใช้ fetchFixture(id) ตัวเดียวกับหน้าเพจ — cache ร่วมกัน ไม่ยิง API เพิ่ม
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const { fixture } = await fetchFixture(id);
    if (!fixture?.homeTeam || !fixture.awayTeam)
      return { title: "วิเคราะห์คู่การแข่งขัน" };
    const h = fixture.homeTeam.name;
    const a = fixture.awayTeam.name;
    const p = fixture.prediction;
    const league = fixture.league?.name ? ` · ${fixture.league.name}` : "";
    const title = `${h} vs ${a} วิเคราะห์โดย AI`;
    const desc = `วิเคราะห์ ${h} พบ ${a}${league} ด้วย AI — ทาย ${p.pickLabel} สกอร์ ${p.expectedScore.home}-${p.expectedScore.away}${p.handicapPickTeam ? ` · แฮนดิแคป ${p.handicapPickTeam}` : ""}`;
    return {
      title: `${h} vs ${a}`,
      description: desc,
      openGraph: { title, description: desc },
      twitter: { title, description: desc },
    };
  } catch {
    return { title: "วิเคราะห์คู่การแข่งขัน" };
  }
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { fixture, provider, fallback, error } = await fetchFixture(id);
  if (!fixture) notFound();

  const { homeTeam: home, awayTeam: away, league } = fixture;
  const p = fixture.prediction;
  // ทรรศนะสด (เฉพาะแมตช์ที่กำลังเตะ) — สร้างโดย cron/live ด้วย Haiku
  const liveRead = fixture.status === "LIVE" ? loadLiveRead<LiveRead>(fixture.id) : null;

  return (
    <main>
      <JsonLd data={matchJsonLd(fixture)} />
      {fixture.status === "LIVE" && <AutoRefresh seconds={60} />}
      <Topbar title={`${home.shortName} vs ${away.shortName}`} />
      <div className="space-y-4 p-4 lg:p-6">
        <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={14} /> กลับหน้าหลัก
        </Link>
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

        <ProviderBanner provider={provider} fallback={fallback} error={error} />

        {/* ============ LIVE AI — ทรรศนะสด (Haiku) ============ */}
        {liveRead && (
          <section className="glass border-[rgba(255,77,94,0.4)] p-4">
            <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-wider text-[var(--danger)]">
              <Radio size={13} className="animate-pulse" /> LIVE AI — อัปเดตสด
              <span className="tabular ml-auto text-[10px] font-normal text-[var(--text-muted)]">
                {liveRead.phase ?? `นาที ${liveRead.minute ?? "-"}`} · {liveRead.score}
              </span>
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {liveRead.readTh}
            </p>
            {liveRead.leanTh && (
              <p className="mt-2 rounded-lg bg-[var(--neon-blue-soft)] px-3 py-2 text-[12px] leading-relaxed text-[var(--neon-blue)]">
                แนวโน้ม: {liveRead.leanTh}
              </p>
            )}
          </section>
        )}

        {/* ============ 1. AI SUMMARY ============ */}
        <section className="glass glow-green p-4 lg:p-5">
          <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {league.nameTh} · {fixture.kickoffLabel} ·{" "}
                {new Date(fixture.kickoff).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  timeZone: "Asia/Bangkok",
                })}
                {fixture.status === "LIVE" && (
                  <span className="ml-2 animate-pulse font-bold text-[var(--danger)]">
                    ● สด {fixture.homeGoals ?? 0}-{fixture.awayGoals ?? 0}
                    {fixture.elapsed != null ? ` นาทีที่ ${fixture.elapsed}` : ""}
                  </span>
                )}
                {fixture.status === "FINISHED" && (
                  <span className="ml-2 font-bold text-[var(--text-primary)]">
                    จบแล้ว {fixture.homeGoals ?? "-"}-{fixture.awayGoals ?? "-"}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {fixture.round && <>รอบ: {fixture.round} · </>}
                🏟️ {fixture.venueName ?? "ไม่มีข้อมูลสนาม"}
                {fixture.venueCity ? ` (${fixture.venueCity})` : ""} · ผู้ตัดสิน:{" "}
                {fixture.referee ?? "ยังไม่ประกาศ"}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <TeamLogo teamId={home.id} shortName={home.shortName} logo={home.logo} size={44} />
                <span className="text-lg font-extrabold lg:text-xl">{home.name}</span>
                <span className="text-[var(--text-muted)]">vs</span>
                <span className="text-lg font-extrabold lg:text-xl">{away.name}</span>
                <TeamLogo teamId={away.id} shortName={away.shortName} logo={away.logo} size={44} />
              </div>
              <p className="text-glow-green mt-3 text-2xl font-black text-[var(--neon-green)]">
                AI PICK: {p.pickLabel}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={confidenceTone[p.confidence]}>
                  CONFIDENCE {confidenceLabel[p.confidence]}
                </Badge>
                <Badge tone={riskTone[p.risk]}>RISK {riskLabel[p.risk]}</Badge>
                <Badge tone={valueTone[p.value]}>{valueLabel[p.value]}</Badge>
                <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                <Stars count={p.valueStars} />
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <ScoreRing score={p.aiScore} size={104} />
                <p className="mt-1 text-[10px] tracking-wider text-[var(--text-muted)]">AI SCORE</p>
              </div>
              <div className="text-center">
                <ScoreRing score={p.dataQuality} size={104} />
                <p className="mt-1 text-[10px] tracking-wider text-[var(--text-muted)]">DATA QUALITY</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { l: "WIN PROBABILITY", v: `${p.winProbability.home}/${p.winProbability.draw}/${p.winProbability.away}`, s: `${home.shortName}/เสมอ/${away.shortName} (%)` },
              { l: "EXPECTED SCORE", v: `${p.expectedScore.home} - ${p.expectedScore.away}`, s: "สกอร์ที่คาด" },
              p.handicapPickTeam !== null
                ? { l: "HANDICAP PICK", v: `แนะนำเล่น ${p.handicapPickTeam}`, s: "แต้มต่อ (Asian Handicap)" }
                : { l: "HANDICAP PICK", v: "ไม่มีข้อมูลแฮนดิแคป", s: "Missing Data", muted: true },
              p.overUnderPick !== null
                ? { l: "OVER/UNDER PICK", v: `${p.overUnderPick === "OVER" ? "Over" : "Under"} ${p.overUnderLine}`, s: p.overUnderNote ?? "สกอร์รวม" }
                : { l: "OVER/UNDER PICK", v: "ไม่มีข้อมูลสูงต่ำ", s: "Missing Data", muted: true },
              p.cornerPick !== null
                ? { l: "CORNER PICK", v: `${p.cornerPick === "OVER" ? "Over" : "Under"} ${p.cornerLine}`, s: "เตะมุมรวม" }
                : { l: "CORNER PICK", v: "ไม่มีข้อมูลเตะมุม", s: "มีเฉพาะแมตช์ที่เริ่มแล้ว", muted: true },
              fixture.odds.history.length > 0
                ? { l: "EDGE", v: `${p.edgePct >= 0 ? "+" : ""}${p.edgePct}%`, s: p.edgePct >= 0 ? "AI ให้โอกาสสูงกว่าตลาด" : "ตลาดให้โอกาสสูงกว่า AI" }
                : { l: "EDGE", v: "ไม่มีข้อมูลราคา", s: "Missing Data", muted: true },
            ].map((x) => (
              <div key={x.l} className="glass p-3">
                <p className="text-[10px] tracking-wider text-[var(--text-muted)]">{x.l}</p>
                <p className={`tabular mt-0.5 truncate text-[15px] font-bold ${"muted" in x && x.muted ? "text-[var(--text-muted)]" : "text-[var(--soft-purple)]"}`}>{x.v}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{x.s}</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <ProbBar {...p.winProbability} height={8} />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ============ 1b. LIVE CENTER ============ */}
          <LiveCenter fixture={fixture} />

          {/* ============ 2. TEAM COMPARISON ============ */}
          <section className="glass p-4">
            <h2 className="text-[13px] font-extrabold tracking-wider">
              <span className="mr-1 text-[var(--neon-blue)]">▎</span>TEAM COMPARISON
            </h2>
            <RadarCompare home={home} away={away} />
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              * แสดงเฉพาะแกนที่มีข้อมูลจริง — Attack/Defense จากประตูเฉลี่ย · Form จากผล 5 นัดล่าสุด ·
              Possession/Shots/Corners มีเฉพาะทีมลีก (ทีมชาติไม่มีสถิติส่วนนี้)
            </p>
          </section>

          {/* ============ 3. FORM ANALYSIS ============ */}
          <section className="glass p-4">
            <h2 className="text-[13px] font-extrabold tracking-wider">
              <span className="mr-1 text-[var(--neon-blue)]">▎</span>FORM ANALYSIS
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {[
                { team: home, recent: fixture.homeRecent, side: "เหย้า" },
                { team: away, recent: fixture.awayRecent, side: "เยือน" },
              ].map(({ team, recent, side }) => (
                <div key={team.id}>
                  <div className="flex items-center gap-2">
                    <TeamLogo teamId={team.id} shortName={team.shortName} logo={team.logo} size={24} />
                    <p className="text-[12px] font-bold">{team.shortName}</p>
                  </div>
                  <dl className="mt-2 space-y-1.5 text-[11px]">
                    <Row k="5 นัดล่าสุด" v={team.form.join(" ")} />
                    <Row k={`ฟอร์ม${side}`} v={`${side === "เหย้า" ? team.power.homeStrength : team.power.awayStrength}/100`} />
                    <Row k="ประตูได้เฉลี่ย" v={`${team.statsAvg.goalsFor}`} />
                    <Row k="ประตูเสียเฉลี่ย" v={`${team.statsAvg.goalsAgainst}`} />
                    <Row k="คลีนชีต (10 นัด)" v={team.statsAvg.goalsAgainst < 1 ? "5" : "3"} />
                    <Row k="ไม่ได้ยิง (10 นัด)" v={team.statsAvg.goalsFor > 2 ? "1" : "2"} />
                  </dl>
                  <div className="mt-2 space-y-1">
                    {recent.map((m, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded bg-[var(--bg-elevated)] px-2 py-1 text-[10px]">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded font-bold ${
                            m.result === "W"
                              ? "bg-[var(--neon-green-soft)] text-[var(--neon-green)]"
                              : m.result === "D"
                                ? "bg-[rgba(91,108,140,0.25)] text-[var(--text-secondary)]"
                                : "bg-[var(--danger-soft)] text-[var(--danger)]"
                          }`}
                        >
                          {m.result}
                        </span>
                        <span className="tabular font-semibold">{m.score}</span>
                        <span className="ml-auto text-[var(--text-muted)]">{m.opponentShort}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ============ 4. PLAYER IMPACT ============ */}
          <section className="glass p-4">
            <h2 className="text-[13px] font-extrabold tracking-wider">
              <span className="mr-1 text-[var(--neon-blue)]">▎</span>PLAYER IMPACT
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {[
                { team: home, kp: fixture.homeKeyPlayer, injured: fixture.homeInjuries, lineup: fixture.homeLineup },
                { team: away, kp: fixture.awayKeyPlayer, injured: fixture.awayInjuries, lineup: fixture.awayLineup },
              ].map(({ team, kp, injured, lineup }) => {
                return (
                  <div key={team.id}>
                    <p className="text-[12px] font-bold">{team.shortName}</p>
                    {kp ? (
                      <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-[var(--bg-elevated)] p-2.5">
                        <PlayerPhoto photo={kp.photo} name={kp.name} size={40} />
                        <div className="text-[11px]">
                          <p className="font-bold">{kp.name}</p>
                          {kp.rating > 0 ? (
                            <>
                              <p className="text-[var(--text-muted)]">
                                {kp.positionTh} · Rating {kp.rating}
                              </p>
                              <p>
                                {kp.goals} ประตู {kp.assists} แอสซิสต์ · ฟิต{" "}
                                <span className="font-bold text-[var(--neon-green)]">{kp.fitness}%</span>
                              </p>
                            </>
                          ) : (
                            <p className="text-[var(--text-muted)]">
                              {kp.positionTh} · <span className="text-[var(--soft-purple)]">เลือกโดย Claude AI</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 rounded-lg bg-[var(--bg-elevated)] p-2.5 text-[11px] text-[var(--text-muted)]">
                        ยังไม่มีข้อมูลนักเตะเด่น (Missing Data)
                      </p>
                    )}
                    <dl className="mt-2 space-y-1.5 text-[11px]">
                      <Row k="Squad Depth" v={`${team.power.squadDepth}/100`} />
                      <Row k="Fitness รวม" v={`${team.power.fitness}%`} />
                      <Row k="Injury Impact" v={`${team.power.injuryImpact}/100`} warn={team.power.injuryImpact > 25} />
                      <Row
                        k="ตัวเจ็บ/โดนแบน"
                        v={injured.length > 0 ? injured.map((i) => i.name).join(", ") : "ไม่มีรายงาน"}
                        warn={injured.length > 0}
                      />
                      {lineup?.confirmed ? (
                        <Row k="ตัวจริง" v={`${lineup.formation ?? "-"}${lineup.coach ? ` · โค้ช ${lineup.coach}` : ""}`} />
                      ) : (
                        <Row k="ตัวจริงที่คาด" v="ยังไม่ประกาศ (Missing Data)" warn />
                      )}
                    </dl>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ============ 4b. STARTING XI ============ */}
          <StartingXI
            home={home}
            away={away}
            homeLineup={fixture.homeLineup}
            awayLineup={fixture.awayLineup}
          />

          {/* ============ 5. CORNER ANALYSIS ============ */}
          <section className="glass p-4">
            <h2 className="text-[13px] font-extrabold tracking-wider">
              <span className="mr-1 text-[var(--neon-blue)]">▎</span>CORNER ANALYSIS
            </h2>
            {!fixture.corners.hasData && (
              <p className="mt-3 rounded-lg bg-[var(--warning-soft)] p-3 text-[12px] text-[var(--warning)]">
                ไม่มีข้อมูลเตะมุม — สถิติเตะมุมจาก API มีเฉพาะแมตช์ที่เริ่มแข่งแล้ว (Missing Data)
              </p>
            )}
            <div className={`mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] ${!fixture.corners.hasData ? "opacity-40" : ""}`}>
              <Row k={`${home.shortName} ได้เตะมุมเฉลี่ย`} v={`${fixture.corners.homeForAvg}`} />
              <Row k={`${away.shortName} ได้เตะมุมเฉลี่ย`} v={`${fixture.corners.awayForAvg}`} />
              <Row k={`${home.shortName} เสียเตะมุมเฉลี่ย`} v={`${fixture.corners.homeAgainstAvg}`} />
              <Row k={`${away.shortName} เสียเตะมุมเฉลี่ย`} v={`${fixture.corners.awayAgainstAvg}`} />
              <Row k="ครึ่งแรกเฉลี่ย" v={`${fixture.corners.firstHalfAvg}`} />
              <Row k="ครึ่งหลังเฉลี่ย" v={`${fixture.corners.secondHalfAvg}`} />
              <Row k="ค่าเฉลี่ยลีก" v={`${fixture.corners.leagueAvg}`} />
              <Row k="Projection รวม" v={`${fixture.corners.totalProjection}`} />
            </div>
            {fixture.corners.hasData ? (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--neon-green-soft)] p-3">
                <p className="text-[13px] font-bold text-[var(--neon-green)]">
                  CORNER PICK: {fixture.corners.pick === "OVER" ? "Over" : "Under"} {fixture.corners.line}
                </p>
                <p className="tabular text-[12px] text-[var(--text-secondary)]">
                  Confidence {fixture.corners.confidencePct}%
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-lg bg-[var(--bg-elevated)] p-3 text-center text-[12px] text-[var(--text-muted)]">
                CORNER PICK: ไม่มีข้อมูลเตะมุม
              </div>
            )}
          </section>

          {/* ============ 6. ODDS ANALYSIS ============ */}
          <section className="glass p-4">
            <h2 className="text-[13px] font-extrabold tracking-wider">
              <span className="mr-1 text-[var(--neon-blue)]">▎</span>ODDS ANALYSIS
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center text-[11px]">
              <div className="glass p-2.5">
                <p className="text-[var(--text-muted)]">ราคาเปิด (เจ้าบ้าน)</p>
                <p className="tabular text-base font-bold">{fixture.odds.opening.home}</p>
              </div>
              <div className="glass p-2.5">
                <p className="text-[var(--text-muted)]">ราคาปัจจุบัน</p>
                <p className="tabular text-base font-bold text-[var(--neon-green)]">{fixture.odds.current.home}</p>
              </div>
              <div className="glass p-2.5">
                <p className="text-[var(--text-muted)]">Edge</p>
                <p className="tabular text-base font-bold text-[var(--gold)]">{p.edgePct >= 0 ? "+" : ""}{p.edgePct}%</p>
              </div>
            </div>
            {/* ราคาจริงของแต่ละตลาดจาก API */}
            <div className="mt-3 space-y-1.5 text-[12px]">
              {fixture.odds.markets?.overUnder ? (
                <div className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                  <span className="text-[var(--text-secondary)]">
                    สูง/ต่ำ {fixture.odds.markets.overUnder.line}
                    <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">({fixture.odds.markets.overUnder.bookmaker})</span>
                  </span>
                  <span className="tabular font-bold">
                    <span className={p.overUnderPick === "OVER" ? "text-[var(--neon-green)]" : ""}>Over {fixture.odds.markets.overUnder.overOdd.toFixed(2)}</span>
                    <span className="mx-1.5 text-[var(--text-muted)]">/</span>
                    <span className={p.overUnderPick === "UNDER" ? "text-[var(--neon-green)]" : ""}>Under {fixture.odds.markets.overUnder.underOdd.toFixed(2)}</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-muted)]">
                  <span>สูง/ต่ำ</span><span>ไม่มีข้อมูลสูงต่ำ</span>
                </div>
              )}
              {fixture.odds.markets?.asianHandicap ? (
                <div className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                  <span className="text-[var(--text-secondary)]">
                    แฮนดิแคป {fixture.odds.markets.asianHandicap.line}
                    <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">({fixture.odds.markets.asianHandicap.bookmaker})</span>
                  </span>
                  <span className="tabular font-bold">
                    {home.shortName} {fixture.odds.markets.asianHandicap.homeOdd.toFixed(2)}
                    <span className="mx-1.5 text-[var(--text-muted)]">/</span>
                    {away.shortName} {fixture.odds.markets.asianHandicap.awayOdd.toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-muted)]">
                  <span>แฮนดิแคป</span><span>ไม่มีข้อมูลแฮนดิแคป</span>
                </div>
              )}
              {fixture.odds.markets?.btts && (
                <div className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                  <span className="text-[var(--text-secondary)]">
                    ยิงทั้งสองทีม (BTTS)
                    <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">({fixture.odds.markets.btts.bookmaker})</span>
                  </span>
                  <span className="tabular font-bold">
                    Yes {fixture.odds.markets.btts.yes.toFixed(2)}
                    <span className="mx-1.5 text-[var(--text-muted)]">/</span>
                    No {fixture.odds.markets.btts.no.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {fixture.odds.history.length > 1 ? (
              <div className="mt-3">
                <OddsMovementChart history={fixture.odds.history} />
              </div>
            ) : (
              <div className="mt-3 flex h-[180px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border-subtle)] text-center">
                <p className="text-[12px] font-bold text-[var(--soft-purple)]">ODDS MOVEMENT GRAPH — Future Feature</p>
                <p className="max-w-md px-4 text-[11px] text-[var(--text-muted)]">
                  กราฟการไหลของราคาจะเปิดใช้เมื่อระบบสะสม snapshot ราคาเป็นระยะ (รอเชื่อมต่อข้อมูล)
                </p>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {fixture.odds.steamMove ? (
                <Badge tone="gold">STEAM MOVE</Badge>
              ) : (
                <Badge tone="muted">STEAM MOVE — COMING SOON</Badge>
              )}
              {fixture.odds.sharpMoney ? (
                <Badge tone="gold">SHARP MONEY</Badge>
              ) : (
                <Badge tone="muted">SHARP MONEY — COMING SOON</Badge>
              )}
              <Badge tone="muted">CLV — FUTURE FEATURE</Badge>
              {fixture.odds.history.length > 0 && (
                <Badge tone="blue">
                  MARKET {fixture.odds.marketProbability.home.toFixed(1)}% vs AI {p.winProbability.home}%
                </Badge>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-secondary)]">{fixture.odds.movementNote}</p>
          </section>

          {/* ============ 7. WEATHER IMPACT ============ */}
          <section className="glass p-4">
            <h2 className="text-[13px] font-extrabold tracking-wider">
              <span className="mr-1 text-[var(--neon-blue)]">▎</span>WEATHER IMPACT
            </h2>
            <div className="mt-3 flex items-center gap-4">
              <CloudRain size={40} className="text-[var(--neon-blue)]" />
              <p className="text-3xl font-bold text-[var(--neon-blue)]">{fixture.weather.temperatureC}°C</p>
              <dl className="ml-auto space-y-1 text-right text-[11px] text-[var(--text-secondary)]">
                <div>โอกาสฝน {fixture.weather.rainProbability}%</div>
                <div>ลม {fixture.weather.windKmh} km/h</div>
                <div>ความชื้น {fixture.weather.humidity}%</div>
              </dl>
            </div>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <Row k="Weather Impact Score" v={`${fixture.weather.impactScore}/100`} />
              <Row k="ผลกระทบต่อเกมรุก" v={fixture.weather.impactScore < 35 ? "ต่ำ" : "ปานกลาง"} />
              <Row k="ผลกระทบต่อเตะมุม" v="ต่ำ — ลมไม่แรงพอจะเปลี่ยนวิถีบอล" />
              <Row k="ผลกระทบต่อ Over/Under" v={fixture.weather.rainProbability > 60 ? "ฝนหนักกดสกอร์ลง" : "ไม่มีนัยสำคัญ"} />
            </dl>
          </section>

          {/* ============ 8. AI EXPLANATION ============ */}
          <section className="glass p-4 lg:col-span-2">
            <h2 className="text-[13px] font-extrabold tracking-wider">
              <span className="mr-1 text-[var(--neon-green)]">▎</span>AI EXPLANATION
            </h2>

            {/* บทวิเคราะห์ราคาต่อรอง — มุมมองเซียน (เด่นที่สุดของแถบนี้) */}
            {(p.handicapAssessmentTh || p.underdogAssessmentTh || p.drawAssessmentTh) && (
              <div className="mt-3 rounded-xl border border-[var(--border-glow-blue)] bg-[var(--neon-blue-soft)] p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-[var(--neon-blue)]">
                  <Scale size={13} /> วิเคราะห์ราคาต่อรอง — มุมมองมืออาชีพ
                </p>
                <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
                  {p.handicapAssessmentTh && (
                    <div>
                      <p className="text-[10px] font-bold text-[var(--neon-green)]">บอลต่อ — ชนะกินราคาได้ไหม</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{p.handicapAssessmentTh}</p>
                    </div>
                  )}
                  {p.underdogAssessmentTh && (
                    <div>
                      <p className="text-[10px] font-bold text-[var(--warning)]">บอลรอง — รับลูกกินราคาไหม</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{p.underdogAssessmentTh}</p>
                    </div>
                  )}
                  {p.drawAssessmentTh && (
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-muted)]">เสมอ — ยันกันได้ไหม</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{p.drawAssessmentTh}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {p.factors && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold tracking-wider text-[var(--neon-green)]">
                  AI วิเคราะห์ — 6 ปัจจัย <span className="font-normal text-[var(--text-muted)]">(คะแนน 0-10 ยิ่งสูงยิ่งหนุนฝั่งที่ทาย)</span>
                </p>
                <AiFactors factors={p.factors} />
              </div>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold text-[var(--neon-green)]">TOP 5 REASONS — ทำไม AI เลือก {p.pickTeamName}</p>
                <ul className="mt-2 space-y-1.5">
                  {p.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--neon-green)]" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--danger)]">RISK WARNING — ความเสี่ยงที่ต้องรู้</p>
                <ul className="mt-2 space-y-1.5">
                  {p.riskFactors.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                      <TriangleAlert size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" />
                      {r}
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-[12px] text-[var(--text-muted)]">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                    Risk Score {p.riskScore}/100
                  </li>
                </ul>
                <p className="mt-3 text-[11px] font-bold text-[var(--text-secondary)]">MODEL CONSENSUS</p>
                <ul className="mt-1.5 space-y-1 text-[11px] text-[var(--text-muted)]">
                  {p.modelOutputs.map((m) => (
                    <li key={m.model} className="flex justify-between">
                      <span>{m.modelTh}</span>
                      <span className="tabular">
                        {m.homeProb}% / {m.drawProb}% / {m.awayProb}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--neon-blue)]">
                  <Database size={13} /> DATA RELIABILITY — แหล่งข้อมูล
                </p>
                <ul className="mt-2 space-y-1.5">
                  {fixture.dataSources.map((d) => (
                    <li key={d.source} className="flex items-center justify-between text-[12px]">
                      <span className="text-[var(--text-secondary)]">{d.sourceTh}</span>
                      {d.available ? (
                        <Badge tone="green">มีข้อมูล</Badge>
                      ) : (
                        <Badge tone="orange">MISSING DATA</Badge>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 rounded-lg bg-[var(--warning-soft)] p-2.5 text-[11px] text-[var(--warning)]">
                  ข้อมูลบางส่วนยังไม่ครบ (รายชื่อตัวจริง) — AI จำกัดระดับความมั่นใจตามคุณภาพข้อมูล
                </p>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-[var(--text-muted)]">{p.warning}</p>
          </section>

          {/* ============ 9. ทรรศนะจากเว็บต่างประเทศ (เฉพาะคู่หน้าหลัก เมื่อเปิด web search) ============ */}
          {p.externalResearch && (
            <section className="glass p-4 lg:col-span-2">
              <h2 className="flex items-center gap-1.5 text-[13px] font-extrabold tracking-wider">
                <span className="text-[var(--neon-green)]">▎</span>
                <Globe size={14} className="text-[var(--neon-green)]" /> ทรรศนะจากเว็บต่างประเทศ
              </h2>
              <p className="mt-3 whitespace-pre-line text-[12px] leading-relaxed text-[var(--text-secondary)]">
                {p.externalResearch.summaryTh}
              </p>
              {p.externalResearch.sources.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">แหล่งอ้างอิง</p>
                  <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                    {p.externalResearch.sources.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-[var(--neon-blue)] hover:underline"
                        >
                          <Link2 size={11} className="shrink-0" />
                          <span className="truncate">{s.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-2.5 text-[10px] text-[var(--text-muted)]">
                ทรรศนะเป็นข้อมูลเสริม — AI ยึดข้อมูลจริง (ฟอร์ม/ราคา/สถิติ) เป็นหลัก
              </p>
            </section>
          )}
        </div>

        <DevDebugPanel status={fixture.endpointStatus} />

        <Disclaimer />
      </div>
    </main>
  );
}

function Row({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[var(--text-muted)]">{k}</dt>
      <dd className={`tabular text-right font-semibold ${warn ? "text-[var(--warning)]" : ""}`}>{v}</dd>
    </div>
  );
}
