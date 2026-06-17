import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { cached } from "./cache";
import { loadSavedAnalysis, saveAnalysis } from "./claude-store";
import { buildSelfReview } from "./accuracy";
import { computeValue } from "./football-calculator";
import { researchExternalViews, loadResearch } from "./claude-research";
import { Fixture, PickSide, ExternalResearch } from "./types";

/**
 * Claude AI Analyst — ส่งข้อมูลจริงทั้งหมดของแมตช์ (ฟอร์ม สถิติ H2H ราคา
 * อาการบาดเจ็บ ตัวจริง predictions) ให้ Claude วิเคราะห์และทายสกอร์
 *
 * - ปิดอัตโนมัติเมื่อไม่มี ANTHROPIC_API_KEY (engine เดิมทำงานตามปกติ)
 * - ผล cache 6 ชม. ต่อคู่ — โหลดซ้ำไม่เสียค่า API
 * - กฎความสอดคล้อง: สกอร์ที่ Claude ทายต้องตรงกับฝั่งที่ Claude เลือก
 */

const AnalysisSchema = z.object({
  pick: z.enum(["HOME", "DRAW", "AWAY"]),
  expectedScore: z.object({
    home: z.number().int(),
    away: z.number().int(),
  }),
  winProbability: z.object({
    home: z.number().int(),
    draw: z.number().int(),
    away: z.number().int(),
  }),
  reasonsTh: z
    .array(z.string())
    .describe("เหตุผล 3-5 ข้อ ภาษาไทย อิงข้อมูลที่ให้เท่านั้น"),
  scoreRationaleTh: z.string().describe("เหตุผลของสกอร์ที่ทาย 1 ประโยค ภาษาไทย"),
  overUnderPick: z
    .enum(["OVER", "UNDER"])
    .nullable()
    .describe("ต้องตอบ OVER หรือ UNDER เสมอเมื่อข้อมูลมี odds.overUnder — ตอบ null ได้เฉพาะกรณีไม่มีตลาดสูงต่ำเท่านั้น"),
  keyPlayers: z
    .object({
      home: z.object({ name: z.string(), positionTh: z.string() }).nullable(),
      away: z.object({ name: z.string(), positionTh: z.string() }).nullable(),
    })
    .describe(
      "นักเตะตัวความหวังของแต่ละทีมจากความรู้ทั่วไป (ชื่อจริงเท่านั้น) — ใช้เมื่อข้อมูลนักเตะจาก API ขาด ถ้าไม่มั่นใจให้ null"
    ),
  fifaRanks: z
    .object({
      home: z.number().int().nullable(),
      away: z.number().int().nullable(),
    })
    .describe("อันดับโลก FIFA ล่าสุดที่รู้ (เฉพาะทีมชาติ) — null ถ้าเป็นสโมสรหรือไม่มั่นใจ"),
  handicapAssessmentTh: z
    .string()
    .nullable()
    .describe(
      "วิเคราะห์ฝั่งบอลต่อ (ตัวเต็ง) แบบเซียนราคา 1-2 ประโยค: ตัวเต็งจะ 'ชนะกินราคาต่อรอง' ได้ไหม — ต้องชนะขาดกี่ลูกถึงกินเส้น โอกาสกินราคาจริงแค่ไหน อ้างฟอร์ม/สถิติ/เส้นจริง — null ถ้าไม่มีตลาดแฮนดิแคป"
    ),
  underdogAssessmentTh: z
    .string()
    .nullable()
    .describe(
      "วิเคราะห์ฝั่งบอลรองแบบเซียนราคา 1-2 ประโยค: บอลรอง 'รับลูกต่อแล้วกินราคา' ได้ไหม (แพ้ไม่เกินเส้น/เสมอ/ชนะ) คุ้มกว่าแทงตัวเต็งไหม value อยู่ฝั่งนี้หรือเปล่า — null ถ้าฝั่งรองไม่มีลุ้นจริง"
    ),
  drawAssessmentTh: z
    .string()
    .nullable()
    .describe("ประเมินโอกาสยันเสมอ 1 ประโยค: เกมนี้มีลุ้นจบเสมอแค่ไหน เพราะอะไร — null ถ้าโอกาสเสมอต่ำมาก"),
});

export type ClaudeAnalysis = z.infer<typeof AnalysisSchema>;

const SYSTEM_PROMPT = `คุณคือนักวิเคราะห์ฟุตบอลมืออาชีพ วิเคราะห์จากข้อมูลที่ได้รับเท่านั้น ห้ามเดาข้อมูลที่ไม่มี

กฎสำคัญ:
1. expectedScore ต้องสอดคล้องกับ pick เสมอ — ถ้า pick=HOME สกอร์เจ้าบ้านต้องมากกว่า, pick=AWAY ทีมเยือนต้องมากกว่า, pick=DRAW ต้องเท่ากัน
2. winProbability ทั้งสามค่าต้องรวมกันได้ 100 พอดี
3. ใช้ราคาตลาดเป็น "ฐานอ้างอิง" ของโอกาสจริง แต่ห้ามตามตลาดเชียร์ตัวเต็งเสมอ — งานของคุณคือหา "ความคุ้มราคา (value)" ไม่ใช่ทายว่าใครชนะอย่างเดียว
3ก. บอลรอง (underdog) ต้องได้รับการพิจารณาอย่างเป็นธรรมทุกคู่ — เลือกฝั่งรองได้เมื่อมีเหตุผลรองรับ เช่น ฟอร์มดีกว่า, เจอกันในอดีตสูสี/ได้เปรียบ, ตัวเต็งราคาแพงเกินจริง, ตัวหลักตัวเต็งเจ็บ/แบน หรือตัวเต็งเล่นเกมรับแน่น คุณไม่จำเป็นต้องเลือกตัวเต็งเป็น pick หลัก
3ข. แฮนดิแคป (Asian Handicap) ต่างจาก 1X2 — ตัวเต็งที่ "ต่อ" ลูกต้องชนะขาดพอกินลูกต่อ ไม่ใช่แค่ชนะ ถ้าประเมินว่าตัวเต็งน่าจะชนะหวุดหวิด การพิจารณาบอลรอง+ลูกต่ออาจคุ้มกว่า — ตัดสิน expectedScore ตามจริง ไม่ใช่เผื่อให้ตัวเต็งชนะขาดเสมอ
3ค. เมื่อสองทีมสูสีจริง (ฟอร์ม/ราคา/สถิติใกล้กัน) DRAW เป็นตัวเลือกที่ถูกต้อง — อย่าฝืนเลือกฝั่งใดฝั่งหนึ่ง
4. ทีมข้อมูลน้อย (บอลถ้วย/ทีมชาติ) ให้ระวังและอย่ามั่นใจเกินข้อมูล
5. เหตุผลต้องอ้างอิงตัวเลขจริงจากข้อมูลที่ให้ ห้ามใช้คำว่า แน่นอน/การันตี/ชัวร์
6. ดู field "venue" — ถ้าเป็นสนามกลาง ห้ามให้เหตุผลเรื่องความได้เปรียบเจ้าบ้าน/เจ้าภาพกับทีมแรกเด็ดขาด และห้ามเรียกทีมแรกว่า "เจ้าบ้าน" หรือทีมที่สองว่า "ทีมเยือน" — ให้เรียกชื่อทีมตรง ๆ แทน
7. keyPlayers: ระบุนักเตะตัวความหวังของแต่ละทีมเฉพาะที่คุณรู้จริงว่าอยู่ทีมชุดปัจจุบัน — ไม่มั่นใจให้ตอบ null ห้ามเดาชื่อ
8. overUnderPick: ถ้าข้อมูลมี odds.overUnder ต้องเลือก OVER หรือ UNDER เสมอ (ห้าม null) โดยตัดสินจาก "แนวโน้มประตูรวมทั้งเกม" — ค่าเฉลี่ยประตูได้/เสียของสองทีม ราคาตลาด สภาพอากาศ ไม่ใช่แค่ผลรวมของสกอร์ที่ทาย
9. fifaRanks: ทีมชาติให้ระบุอันดับโลก FIFA ล่าสุดที่คุณรู้ (ประมาณต้นปี 2026 ได้) — สโมสรหรือไม่มั่นใจให้ null
10. handicapAssessmentTh / underdogAssessmentTh / drawAssessmentTh: เขียนแบบ "เซียนวิเคราะห์ราคา" มืออาชีพ ตอบให้ตรงคำถามที่นักเดิมพันอยากรู้ — บอลต่อ(ตัวเต็ง)ชนะกินราคาต่อรองได้ไหม, บอลรองรับลูกแล้วกินราคาได้ไหม/คุ้มกว่าไหม, ยันเสมอได้ไหม — อ้างเส้นจริง+สถิติ ไม่เชียร์ฝั่งใด ตอบ null เฉพาะเมื่อไม่มีประเด็นนั้นจริง
11. ถ้ามี field "externalResearch" (ทรรศนะที่ค้นจากเว็บต่างประเทศ) ให้ใช้เป็น "ข้อมูลเสริม" ประกอบ โดยเฉพาะข่าวเจ็บ/แบนล่าสุดและมุมมองแท็กติก — แต่ห้ามให้ทรรศนะเว็บลบล้างข้อมูลตัวเลขจริง (ฟอร์ม/ราคา/สถิติ) ถ้าขัดกันให้ยึดตัวเลขจริงเป็นหลักและระบุไว้ในเหตุผล`;

export function claudeEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function analyzeFixtureWithClaude(
  fixture: Fixture,
  opts?: { force?: boolean; research?: boolean }
): Promise<ClaudeAnalysis | null> {
  if (!claudeEnabled()) return null;

  const cacheKey = `claude:analysis:${fixture.id}${opts?.force ? ":final" : ""}`;
  return cached(cacheKey, opts?.force ? 1800 : 6 * 3600, async () => {
    // วิเคราะห์แล้วเซฟถาวร — รีเฟรช/รีสตาร์ทกี่ครั้งก็ไม่หาย และไม่เรียก API ซ้ำ
    // force = รอบสุดท้ายก่อนเตะ: ข้ามของเดิม วิเคราะห์ใหม่ด้วยข้อมูลล่าสุด (ตัวจริง/ราคา)
    const saved = opts?.force ? null : loadSavedAnalysis<ClaudeAnalysis>(fixture.id);
    if (saved) return saved;

    try {
      // เฟส 1 (เฉพาะคู่หน้าหลัก): ค้นทรรศนะจากเว็บต่างประเทศมาประกอบ
      // แยกจากเฟสวิเคราะห์เพราะ citations ชนกับ structured output
      const research = opts?.research ? await researchExternalViews(fixture) : null;

      const client = new Anthropic();
      // ป้อนผลงานย้อนหลังกลับเข้า prompt — Claude เห็นจุดอ่อนตัวเองแล้วปรับ
      // (คืน null เมื่อข้อมูลยังไม่พอ — ไม่เสี่ยง over-correct จากฐานเล็ก)
      const selfReview = buildSelfReview();
      const response = await client.messages.parse({
        model: "claude-opus-4-8",
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${
              fixture.neutralVenue
                ? `⚠️ แมตช์นี้เตะที่สนามกลาง — field "home"/"away" ในข้อมูลเป็นเพียงลำดับทีมในโปรแกรม ไม่ใช่เจ้าบ้านจริง ห้ามใช้คำว่า "เจ้าบ้าน" "ทีมเยือน" "เหย้า" "เยือน" ในเหตุผลเด็ดขาด ให้เรียกชื่อทีม "${fixture.homeTeam.name}" และ "${fixture.awayTeam.name}" ตรง ๆ\n\n`
                : ""
            }${selfReview ? `${selfReview}\n\n` : ""}วิเคราะห์แมตช์นี้และทายสกอร์:\n${JSON.stringify(buildMatchFacts(fixture, research), null, 1)}`,
          },
        ],
        output_config: { format: zodOutputFormat(AnalysisSchema) },
      });

      const analysis = response.parsed_output;
      if (!analysis) {
        console.error(`[claude-analyst] ${fixture.id}: ไม่มี parsed_output`);
        return null;
      }
      const invalid = validationError(analysis);
      if (invalid) {
        console.error(`[claude-analyst] ${fixture.id} validate fail: ${invalid}`, JSON.stringify({ pick: analysis.pick, score: analysis.expectedScore, prob: analysis.winProbability }));
        return null;
      }
      saveAnalysis(fixture.id, analysis);
      return analysis;
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        console.error(`[claude-analyst] API error ${err.status}: ${err.message}`);
      } else {
        console.error("[claude-analyst]", (err as Error).message);
      }
      return null;
    }
  });
}

/** consistency rules — คืน null = ผ่าน, คืน string = เหตุผลที่ตก (เพื่อ log) */
function validationError(a: ClaudeAnalysis): string | null {
  const margin = a.expectedScore.home - a.expectedScore.away;
  const consistent =
    (a.pick === "HOME" && margin > 0) ||
    (a.pick === "AWAY" && margin < 0) ||
    (a.pick === "DRAW" && margin === 0);
  if (!consistent) return `pick=${a.pick} ขัดกับสกอร์ ${a.expectedScore.home}-${a.expectedScore.away}`;
  if (a.expectedScore.home < 0 || a.expectedScore.home > 9 || a.expectedScore.away < 0 || a.expectedScore.away > 9)
    return `สกอร์นอกช่วง 0-9`;
  const probSum = a.winProbability.home + a.winProbability.draw + a.winProbability.away;
  if (Math.abs(probSum - 100) > 2) return `winProbability รวม ${probSum} (ต้อง ~100)`;
  // ความสอดคล้องของ pick กับ prob:
  //  HOME → โอกาสเจ้าบ้านต้อง ≥ ทีมเยือน · AWAY → กลับกัน
  //  DRAW → สองฝั่งต้องสูสีกันจริง (ห่างกัน ≤15%) — เสมอไม่ต้องเป็นค่าสูงสุด
  //         (ในฟุตบอลโอกาสเสมอแทบไม่เคยสูงสุด การบังคับ argmax จะบล็อกการทายเสมอ)
  const { home: ph, draw: pd, away: pa } = a.winProbability;
  if (a.pick === "HOME" && ph < pa) return `pick=HOME แต่โอกาสเยือน (${pa}) สูงกว่าเจ้าบ้าน (${ph})`;
  if (a.pick === "AWAY" && pa < ph) return `pick=AWAY แต่โอกาสเจ้าบ้าน (${ph}) สูงกว่าเยือน (${pa})`;
  if (a.pick === "DRAW") {
    if (Math.abs(ph - pa) > 15) return `pick=DRAW แต่สองทีมห่างกันเกินไป (${ph} vs ${pa})`;
    if (pd < 22) return `pick=DRAW แต่โอกาสเสมอต่ำเกิน (${pd}%)`;
  }
  return null;
}

/** compact, factual payload — only data we actually have */
function buildMatchFacts(f: Fixture, research?: ExternalResearch | null) {
  const p = f.prediction;
  return {
    league: f.league.name,
    externalResearch: research
      ? `ทรรศนะ/ข่าวจากเว็บต่างประเทศ (ข้อมูลเสริม ห้ามลบล้างตัวเลขจริง): ${research.summaryTh}`
      : undefined,
    venue: f.neutralVenue
      ? `สนามกลาง — ${f.homeTeam.name} ไม่ใช่เจ้าบ้านจริง ไม่มีความได้เปรียบเจ้าภาพ`
      : `${f.homeTeam.name} เป็นเจ้าบ้าน`,
    kickoff: f.kickoff,
    home: teamFacts(f, "home"),
    away: teamFacts(f, "away"),
    headToHead: f.h2h,
    odds: f.odds.history.length
      ? {
          matchWinner: {
            home: f.odds.current.home,
            draw: f.odds.current.draw,
            away: f.odds.current.away,
          },
          marketProbabilityPct: f.odds.marketProbability,
          asianHandicapLine: p.handicapLine,
          overUnder: f.odds.markets?.overUnder
            ? {
                line: f.odds.markets.overUnder.line,
                overOdd: f.odds.markets.overUnder.overOdd,
                underOdd: f.odds.markets.overUnder.underOdd,
              }
            : p.overUnderLine,
        }
      : "ไม่มีข้อมูลราคา",
    cornersMarketLine: f.corners.hasData ? f.corners.line : "ไม่มีข้อมูล",
    weatherAtKickoff: f.weather.hasData
      ? {
          temperatureC: f.weather.temperatureC,
          rainProbabilityPct: f.weather.rainProbability,
          windKmh: f.weather.windKmh,
          humidityPct: f.weather.humidity,
          note: f.weather.impactNote,
        }
      : "ไม่มีข้อมูลอากาศ",
    ensembleModelView: {
      winProbabilityPct: p.winProbability,
      models: p.modelOutputs.map((m) => ({
        model: m.model,
        probsPct: [m.homeProb, m.drawProb, m.awayProb],
      })),
    },
    dataQuality: p.dataQuality,
  };
}

function teamFacts(f: Fixture, side: "home" | "away") {
  const team = side === "home" ? f.homeTeam : f.awayTeam;
  const recent = side === "home" ? f.homeRecent : f.awayRecent;
  const injuries = side === "home" ? f.homeInjuries : f.awayInjuries;
  const lineup = side === "home" ? f.homeLineup : f.awayLineup;
  const keyPlayer = side === "home" ? f.homeKeyPlayer : f.awayKeyPlayer;
  return {
    name: team.name,
    leagueRank: team.rank || "ไม่มีข้อมูลอันดับ",
    points: team.points || undefined,
    form: team.form.join("") || "ไม่มีข้อมูลฟอร์ม",
    goalsForAvg: team.statsAvg.goalsFor,
    goalsAgainstAvg: team.statsAvg.goalsAgainst,
    recentResults: recent.filter((r) => r.score !== "-").map((r) => `${r.result} ${r.score} vs ${r.opponentShort}`),
    injuries: injuries.map((i) => i.name),
    lineupConfirmed: lineup?.confirmed ?? false,
    formation: lineup?.formation ?? undefined,
    keyPlayer: keyPlayer
      ? { name: keyPlayer.name, rating: keyPlayer.rating, goals: keyPlayer.goals, assists: keyPlayer.assists }
      : undefined,
  };
}

/**
 * Apply Claude's analysis onto a fixture's prediction (mutates in place).
 *
 * Claude คือชั้นวิเคราะห์สุดท้าย — AI Pick, สกอร์ที่คาด, Win Probability,
 * ฝั่งแฮนดิแคป/สูงต่ำ และ Value ทั้งหมดอิงผลของ Claude ชุดเดียวกัน
 * เพื่อไม่ให้การ์ดกับเหตุผลขัดกันเอง ถ้าโมเดลสถิติ/ตลาดมองต่าง
 * จะบันทึกไว้ใน Risk Warning (และยังเห็นได้ใน Model Consensus)
 */
export function applyClaudeAnalysis(fixture: Fixture, a: ClaudeAnalysis): void {
  const p = fixture.prediction;

  // นักเตะตัวความหวังจาก Claude — ใช้เฉพาะทีมที่ API ไม่มีข้อมูล (รูปเป็นอวตารชื่อย่อ)
  const fillKeyPlayer = (side: "home" | "away") => {
    const existing = side === "home" ? fixture.homeKeyPlayer : fixture.awayKeyPlayer;
    const suggested = a.keyPlayers?.[side];
    if (existing || !suggested) return;
    const team = side === "home" ? fixture.homeTeam : fixture.awayTeam;
    const player = {
      id: `claude-${fixture.id}-${side}`,
      teamId: team.id,
      name: suggested.name,
      position: suggested.positionTh,
      positionTh: suggested.positionTh,
      rating: 0, // 0 = ไม่มีสถิติจาก API (UI จะไม่แสดงตัวเลข)
      goals: 0,
      assists: 0,
      fitness: 0,
      isKeyPlayer: true,
      status: "fit" as const,
    };
    if (side === "home") fixture.homeKeyPlayer = player;
    else fixture.awayKeyPlayer = player;
  };
  fillKeyPlayer("home");
  fillKeyPlayer("away");

  // อันดับโลก FIFA (ทีมชาติ) — API ไม่มีข้อมูลนี้ ใช้จาก Claude
  if (a.fifaRanks?.home) fixture.homeTeam.fifaRank = a.fifaRanks.home;
  if (a.fifaRanks?.away) fixture.awayTeam.fifaRank = a.fifaRanks.away;

  // ประเมินบอลรอง/เสมอ/แฮนดิแคป + ทรรศนะที่ค้นจากเว็บ (ถ้ามี — เฉพาะคู่หน้าหลัก)
  p.underdogAssessmentTh = a.underdogAssessmentTh ?? null;
  p.drawAssessmentTh = a.drawAssessmentTh ?? null;
  p.handicapAssessmentTh = a.handicapAssessmentTh ?? null;
  p.externalResearch = loadResearch(fixture.id);

  const sideName = (s: PickSide) =>
    s === "HOME" ? fixture.homeTeam.shortName : s === "AWAY" ? fixture.awayTeam.shortName : "เสมอ";
  const ensemblePick = p.pick;

  p.modelOutputs.push({
    model: "Claude AI Analyst (claude-opus-4-8)",
    modelTh: "Claude AI วิเคราะห์",
    homeProb: a.winProbability.home,
    drawProb: a.winProbability.draw,
    awayProb: a.winProbability.away,
    weight: 0, // advisory layer — not part of the ensemble blend
  });

  /* ---- pick + score + probability: ชุดเดียวกับเหตุผลเสมอ ---- */
  const pickTeam =
    a.pick === "HOME" ? fixture.homeTeam : a.pick === "AWAY" ? fixture.awayTeam : null;
  p.pick = a.pick;
  p.pickTeamName = pickTeam ? pickTeam.name : "Draw";
  p.pickLabel = pickTeam ? `${pickTeam.name.toUpperCase()} WIN` : "DRAW";
  p.expectedScore = a.expectedScore;
  p.winProbability = {
    home: a.winProbability.home,
    draw: 100 - a.winProbability.home - a.winProbability.away,
    away: a.winProbability.away,
  };

  /* ---- ฝั่งแฮนดิแคป/สูงต่ำ ปรับตามสกอร์ใหม่ (เส้นตลาดเดิม) ---- */
  const margin = a.expectedScore.home - a.expectedScore.away;
  if (p.handicapLine !== null) {
    const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
    p.handicapPickTeam =
      margin + p.handicapLine > 0
        ? `${fixture.homeTeam.shortName} ${fmt(p.handicapLine)}`
        : `${fixture.awayTeam.shortName} ${fmt(-p.handicapLine)}`;
  }
  if (p.overUnderLine !== null) {
    if (a.overUnderPick) {
      // กฎความสอดคล้อง: pick ต้องไม่ขัดกับสกอร์รวมที่ Claude ทายเอง ณ เส้นนี้
      // (สกอร์รวมห่างเส้นเกิน 0.25 แต่ pick สวนทาง = ขัดแย้ง → อิงสกอร์ พร้อมบอกตรงๆ)
      const total = a.expectedScore.home + a.expectedScore.away;
      const d = total - p.overUnderLine;
      const scoreSide = d > 0.3 ? "OVER" : d < -0.3 ? "UNDER" : null;
      if (scoreSide && a.overUnderPick !== scoreSide) {
        p.overUnderPick = scoreSide;
        p.overUnderNote = `อิงสกอร์ที่ Claude ทาย (${a.expectedScore.home}-${a.expectedScore.away} รวม ${total})`;
      } else {
        p.overUnderPick = a.overUnderPick;
        p.overUnderNote = "วิเคราะห์โดย Claude AI";
      }
    } else {
      // analysis เก่าที่ยังไม่มี field นี้ — อิงสกอร์รวมที่ Claude ทาย
      const total = a.expectedScore.home + a.expectedScore.away;
      if (total !== p.overUnderLine) {
        p.overUnderPick = total > p.overUnderLine ? "OVER" : "UNDER";
        p.overUnderNote = "อิงสกอร์ที่ Claude ทาย";
      }
    }
  }

  /* ---- Value คิดใหม่ตาม pick ของ Claude ---- */
  const cur = fixture.odds.current;
  const pickOdd = a.pick === "HOME" ? cur.home : a.pick === "AWAY" ? cur.away : cur.draw;
  if (pickOdd > 1) {
    const pickProb =
      (a.pick === "HOME" ? a.winProbability.home : a.pick === "AWAY" ? a.winProbability.away : a.winProbability.draw) / 100;
    const v = computeValue(pickProb, pickOdd);
    p.value = v.rating;
    p.valueStars = v.stars;
    p.edgePct = v.edgePct;
  }

  /* ---- เหตุผล: Claude นำเสมอ ---- */
  p.reasons = [
    `Claude AI ทายสกอร์ ${a.expectedScore.home}-${a.expectedScore.away}: ${a.scoreRationaleTh}`,
    ...a.reasonsTh,
    ...p.reasons,
  ].slice(0, 5);

  if (ensemblePick !== a.pick) {
    p.riskFactors = [
      `โมเดลสถิติ/ตลาดมองต่างจาก Claude: เดิมเลือก ${sideName(ensemblePick)}`,
      ...p.riskFactors,
    ];
  }
}
