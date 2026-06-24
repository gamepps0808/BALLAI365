import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { claudeEnabled } from "./claude-analyst";
import { loadSavedAnalysis } from "./claude-store";
import { LiteFixture } from "./types";
import { AfEventRow } from "@/types/football";

/**
 * วิเคราะห์บอลสดด้วย Haiku (เร็ว+ถูก) — อ่านสถานการณ์ปัจจุบันเทียบคำทายก่อนแข่ง
 * เรียกเฉพาะตอนมี "เหตุการณ์ใหม่" (ประตู/ใบแดง) จาก cron เท่านั้น เพื่อคุมค่า token
 */
export interface LiveRead {
  readTh: string;
  leanTh: string | null;
  minute: number | null;
  /** ป้ายช่วงเวลา (เช่น "พักครึ่ง") — ถ้ามี ใช้แทน "นาที X" บนกล่อง */
  phase?: string;
  score: string;
  signature: string;
  at: string;
}

const LiveSchema = z.object({
  readTh: z
    .string()
    .describe("อ่านเกมสดตอนนี้ 1-2 ประโยค ภาษาไทย: ใครคุมเกม · ทรงเป็นไปตามที่ทายก่อนแข่งไหม · จุดเปลี่ยนล่าสุด"),
  leanTh: z
    .string()
    .nullable()
    .describe("แนวโน้มช่วงที่เหลือ + ราคาสด/สูง-ต่ำ ที่น่าสนใจ 1 ประโยค — null ถ้ายังประเมินไม่ชัด"),
});

const LIVE_SYSTEM = `คุณคือนักวิเคราะห์บอลสดคนไทย เขียนสรุปสถานการณ์ปัจจุบันให้แฟนบอลไทยอ่านเข้าใจง่าย

กติกาการเขียน (สำคัญที่สุด — ต้องทำตามเป๊ะ):
- เขียนภาษาไทยให้ "เป็นธรรมชาติ" เหมือนคนไทยพูดจริง ประโยคสั้น อ่านลื่น
- ห้ามแปลตรงตัวจากอังกฤษ · ห้ามใช้สำนวน/โครงประโยคแบบฝรั่ง · ห้ามคำแปลก ๆ
- ใช้ศัพท์บอลที่แฟนบอลไทยคุ้นเคย เช่น ขึ้นนำ ตีเสมอ บุกหนัก ตั้งรับ คุมเกม ได้ใบแดงเหลือ 10 คน
- ระบุชื่อทีม/นักเตะให้ชัด ห้ามใช้สรรพนามคลุมเครือ (มัน/เขา/ฝ่ายนั้น)
- ห้ามเดาข้อมูลที่ไม่มี · ห้ามใช้คำว่า การันตี/ชัวร์/แน่นอน
- ถ้าทรงต่างจากที่ทายก่อนแข่ง ให้บอกตรง ๆ

ตัวอย่างโทนที่ต้องการ:
- readTh: "บราซิลขึ้นนำ 1-0 จากจังหวะของวินิซิอุส นาที 23 เล่นได้ดีตามที่ทายไว้ คุมเกมอยู่"
- leanTh: "ครึ่งหลังบราซิลน่าจะคุมเกมต่อ ต่อ -1 ยังพอลุ้น ถ้าได้อีกลูกสูง 2.5 น่าสนใจ"

ถ้าสถานะ "พักครึ่ง": readTh = สรุปครึ่งแรกสั้น ๆ (ใครเล่นดีกว่า/จุดเปลี่ยน), leanTh = คาดครึ่งหลัง + ราคาที่น่าสนใจ`;

export async function analyzeLiveMatch(
  f: LiteFixture,
  events: AfEventRow[],
  signature: string
): Promise<LiveRead | null> {
  if (!claudeEnabled()) return null;
  try {
    const pre = loadSavedAnalysis<{
      pick: "HOME" | "DRAW" | "AWAY";
      expectedScore: { home: number; away: number };
    }>(`af-${f.afId}`);
    const preTeam =
      pre?.pick === "HOME" ? f.homeName : pre?.pick === "AWAY" ? f.awayName : pre ? "เสมอ" : null;

    const keyEvents = (events ?? [])
      .filter((e) => e.type === "Goal" || (e.type === "Card" && /Red/i.test(e.detail ?? "")))
      .slice(-8)
      .map(
        (e) =>
          `${e.time?.elapsed ?? "?"}' ${e.type === "Goal" ? "ประตู" : "ใบแดง"} — ${e.player?.name ?? "?"} (${e.team?.name ?? "?"})`
      );

    const isHT = f.statusShort === "HT";
    const facts = {
      คู่: `${f.homeName} vs ${f.awayName}`,
      ลีก: f.leagueName,
      สถานะ: isHT ? "พักครึ่ง (ครึ่งแรกจบแล้ว)" : "กำลังแข่ง",
      นาทีปัจจุบัน: f.elapsed ?? null,
      สกอร์ปัจจุบัน: `${f.homeName} ${f.homeGoals ?? 0} - ${f.awayGoals ?? 0} ${f.awayName}`,
      คำทายก่อนแข่ง: pre
        ? `${preTeam} · สกอร์ที่ทาย ${pre.expectedScore.home}-${pre.expectedScore.away}`
        : "ไม่มี",
      เหตุการณ์สำคัญ: keyEvents.length ? keyEvents : "ยังไม่มีประตู/ใบแดง",
    };

    const client = new Anthropic();
    const res = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      system: LIVE_SYSTEM,
      messages: [{ role: "user", content: `อ่านเกมสดนี้:\n${JSON.stringify(facts, null, 1)}` }],
      output_config: { format: zodOutputFormat(LiveSchema) },
    });
    const out = res.parsed_output;
    if (!out) return null;
    return {
      readTh: out.readTh,
      leanTh: out.leanTh ?? null,
      minute: f.elapsed ?? null,
      phase: isHT ? "พักครึ่ง" : undefined,
      score: `${f.homeGoals ?? 0}-${f.awayGoals ?? 0}`,
      signature,
      at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[claude-live]", f.id, (err as Error).message);
    return null;
  }
}
