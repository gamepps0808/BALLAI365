import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { claudeEnabled } from "./claude-analyst";
import { loadSavedAnalysis } from "./claude-store";
import { LiteFixture } from "./types";
import { getFixtureStatistics } from "./api-football";
import { AfEventRow, AfFixtureStatRow } from "@/types/football";

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
    .describe(
      "แนวโน้มช่วงที่เหลือ + ฟันธงสูง/ต่ำ: บอก 'เล่นสูง' หรือ 'เล่นต่ำ' ไปเลย ห้ามใส่ราคา/เส้นเจาะจง (ราคาสดไหลตลอด) อ้างอิงสถิติประกอบ 1-2 ประโยค — null ถ้ายังประเมินไม่ชัด"
    ),
});

const LIVE_SYSTEM = `คุณคือนักวิเคราะห์บอลสดคนไทย เขียนสรุปสถานการณ์ปัจจุบันให้แฟนบอลไทยอ่านเข้าใจง่าย

กติกาการเขียน (สำคัญที่สุด — ต้องทำตามเป๊ะ):
- เขียนภาษาไทยให้ "เป็นธรรมชาติ" เหมือนคนไทยพูดจริง ประโยคสั้น อ่านลื่น
- ห้ามแปลตรงตัวจากอังกฤษ · ห้ามใช้สำนวน/โครงประโยคแบบฝรั่ง · ห้ามคำแปลก ๆ
- ใช้ศัพท์บอลที่แฟนบอลไทยคุ้นเคย เช่น ขึ้นนำ ตีเสมอ บุกหนัก ตั้งรับ คุมเกม เหลือ 10 คน
- ระบุชื่อทีม/นักเตะให้ชัด ห้ามใช้สรรพนามคลุมเครือ (มัน/เขา/ฝ่ายนั้น)
- ใช้ "สถิติสด" ประกอบการอ่านเกมเสมอ: ครองบอล % · ยิงทั้งหมด · ยิงตรงกรอบ · เตะมุม
  (เช่น ครองบอลเหนือกว่า + ยิงตรงกรอบเยอะ = บุกหนัก มีลุ้นได้ประตู / ยิงน้อยทั้งคู่ = เกมฝืด)
- ห้ามเดาข้อมูลที่ไม่มี · ห้ามใช้คำว่า การันตี/ชัวร์/แน่นอน

leanTh (สูง/ต่ำ) — สำคัญมาก:
- ราคาสดไหลเปลี่ยนตลอด → "ห้ามใส่ราคา/เส้นเจาะจง" (ห้ามเขียน สูง 2.5 / ต่อ -1 / ราคาต่อรอง)
- ให้ฟันธงทิศทางไปเลยว่า "เล่นสูง" หรือ "เล่นต่ำ" พร้อมเหตุผลจากจังหวะเกม + สถิติ

ตัวอย่างโทนที่ต้องการ:
- readTh: "บราซิลขึ้นนำ 1-0 จากวินิซิอุส นาที 23 ครองบอล 62% ยิงตรงกรอบ 4-1 คุมเกมเหนือกว่าชัด"
- leanTh: "สองทีมเปิดเกมบุก ยิงตรงกรอบรวมเยอะ จังหวะมาเรื่อย ๆ — แนะเล่นสูง ลุ้นมีประตูเพิ่ม"

ถ้าสถานะ "พักครึ่ง": readTh = สรุปครึ่งแรก (ใครเล่นดีกว่า ดูจากสถิติ), leanTh = คาดครึ่งหลัง + ฟันธงสูง/ต่ำ (ไม่ใส่ราคา)`;

/** ดึงสถิติสดคู่เทียบ (เจ้าบ้าน:ทีมเยือน) — match ด้วยชื่อทีม เพราะ lite ไม่มี team id */
function summarizeStats(
  rows: AfFixtureStatRow[],
  homeName: string
): Record<string, string> | null {
  if (!rows || rows.length === 0) return null;
  const homeRow = rows.find((r) => r.team?.name === homeName) ?? rows[0];
  const awayRow = rows.find((r) => r !== homeRow);
  const val = (row: AfFixtureStatRow | undefined, type: string): string => {
    const v = row?.statistics?.find((s) => s.type === type)?.value;
    return v == null ? "-" : String(v);
  };
  const pick: [string, string][] = [
    ["Ball Possession", "ครองบอล"],
    ["Total Shots", "ยิงทั้งหมด"],
    ["Shots on Goal", "ยิงตรงกรอบ"],
    ["Corner Kicks", "เตะมุม"],
  ];
  const out: Record<string, string> = {};
  for (const [type, label] of pick) {
    const h = val(homeRow, type);
    const a = val(awayRow, type);
    if (h === "-" && a === "-") continue;
    out[label] = `${h} : ${a}`;
  }
  return Object.keys(out).length ? out : null;
}

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

    const statRows = await getFixtureStatistics(f.afId).catch(() => [] as AfFixtureStatRow[]);
    const liveStats = summarizeStats(statRows ?? [], f.homeName);

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
      "สถิติสด (เจ้าบ้าน : ทีมเยือน)": liveStats ?? "ยังไม่มีสถิติสด",
      เหตุการณ์สำคัญ: keyEvents.length ? keyEvents : "ยังไม่มีประตู/ใบแดง",
    };

    const client = new Anthropic();
    const res = await client.messages.parse({
      model: "claude-sonnet-4-6",
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
