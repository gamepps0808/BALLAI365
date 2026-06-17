import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { cached } from "./cache";
import { Fixture, ExternalResearch } from "./types";

/**
 * เฟสค้นเว็บ — ให้ Claude ค้นทรรศนะ/ข่าว/พรีวิวของแมตช์จากเว็บต่างประเทศ
 * ที่น่าเชื่อถือ แล้วสรุปเป็นภาษาไทย + เก็บลิงก์อ้างอิง (โปร่งใส ตรวจสอบได้)
 *
 * - ใช้ web search ของ Anthropic (server-side) — แยกจากเฟสวิเคราะห์ เพราะ
 *   citations ชนกับ structured output (messages.parse) → จะ error 400
 * - ทำเฉพาะคู่หน้าหลักที่ AI คัด (คุมต้นทุน) · เก็บไฟล์ถาวร ไม่ค้นซ้ำ
 * - max_uses จำกัดจำนวนครั้งค้นต่อแมตช์ (กันค่าใช้จ่ายบาน)
 */

const DIR = path.join(process.cwd(), ".cache", "research");
const MAX_AGE_MS = 7 * 24 * 3600 * 1000; // ทรรศนะเก่ากว่า 7 วันไม่มีประโยชน์

function fileFor(id: string): string {
  return path.join(DIR, `${id.replace(/[^a-z0-9-]/gi, "_")}.json`);
}

/** อ่านทรรศนะที่ค้นไว้แล้ว (สำหรับแสดงผล — ไม่ค้นใหม่) */
export function loadResearch(id: string): ExternalResearch | null {
  return loadSaved(id);
}

function loadSaved(id: string): ExternalResearch | null {
  try {
    const file = fileFor(id);
    if (!fs.existsSync(file)) return null;
    if (Date.now() - fs.statSync(file).mtimeMs > MAX_AGE_MS) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as ExternalResearch;
  } catch {
    return null;
  }
}

function save(id: string, r: ExternalResearch): void {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(fileFor(id), JSON.stringify(r, null, 1));
  } catch (err) {
    console.error("[claude-research] save failed:", (err as Error).message);
  }
}

const SYSTEM = `คุณคือผู้ช่วยหาข้อมูลฟุตบอล ค้นเว็บหา "ทรรศนะ/พรีวิว/ข่าวล่าสุด" ของแมตช์ที่ระบุ จากแหล่งต่างประเทศที่น่าเชื่อถือ (เช่น BBC Sport, Sky Sports, ESPN, The Guardian, WhoScored, Sofascore, Transfermarkt) แล้วสรุปเป็นภาษาไทย

กฎ:
- เน้นข้อมูลที่ "ช่วยตัดสินใจ": ใครได้เปรียบและเพราะอะไร, ข่าวเจ็บ/แบน/พักผู้เล่นล่าสุด, แท็กติก/ฟอร์ม, มุมมองว่าบอลรองมีลุ้นไหม, ราคา/value
- เช็ควันที่ของข่าวเสมอ — ระบุถ้าข้อมูลเก่าหรือยังไม่ยืนยัน
- ใช้เฉพาะแหล่งที่น่าเชื่อถือ เลี่ยงเว็บโปรโมตพนัน/ทีเด็ดขายฝัน
- ห้ามเดา ถ้าหาข้อมูลคู่นี้ไม่เจอจริง ๆ ให้ตอบสั้น ๆ ว่า "ไม่พบทรรศนะที่น่าเชื่อถือสำหรับแมตช์นี้"
- สรุปกระชับ 4-7 บรรทัด ไม่ต้องยาว
- ตอบเฉพาะบทสรุปเลย — ห้ามเกริ่นว่ากำลังค้นหา/กำลังจะสรุป ห้ามบรรยายขั้นตอนการค้น และห้ามใส่หัวข้อ Markdown
- ถ้าการค้นบางครั้งล้มเหลว/ติดลิมิต ให้สรุปจาก "ผลที่ค้นได้แล้ว" เท่าที่มี ห้ามบรรยายว่ากำลังลองค้นใหม่หรือขออภัย — สรุปเนื้อหาที่ได้ทันที`;

/** ล้างข้อความสรุป — ตัดแท็ก citation, คำเกริ่นค้นหา, บรรทัดว่างซ้ำ */
function cleanSummary(s: string): string {
  return s
    .replace(/<\/?cite[^>]*>/gi, "") // แท็กอ้างอิงของ dynamic filtering
    .replace(
      /^\s*(I'?ll search|Let me search|I will search|ผมจะค้นหา|ขอค้นหา|ฉันจะค้นหา)[^\n]*\n?/gi,
      ""
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function researchExternalViews(
  fixture: Fixture
): Promise<ExternalResearch | null> {
  // ปิดเป็นค่าเริ่มต้น (web search มีค่าใช้จ่ายเพิ่ม ~$0.21/คู่)
  // เปิดใช้: ตั้ง ENABLE_WEB_SEARCH=1 ใน .env
  if (process.env.ENABLE_WEB_SEARCH !== "1") return null;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  return cached(`research:${fixture.id}`, 6 * 3600, async () => {
    const saved = loadSaved(fixture.id);
    if (saved) return saved;

    const home = fixture.homeTeam.name;
    const away = fixture.awayTeam.name;
    const date = fixture.kickoff.slice(0, 10);

    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 4000,
        system: SYSTEM,
        tools: [
          {
            type: "web_search_20260209",
            name: "web_search",
            max_uses: 3, // คุมต้นทุน + กัน rate limit ตอน batch: ค้นไม่เกิน 3 ครั้ง/แมตช์
          },
        ],
        messages: [
          {
            role: "user",
            content: `ค้นทรรศนะและข่าวล่าสุดของแมตช์: ${home} พบ ${away} (${fixture.league.name}, เตะวันที่ ${date}) แล้วสรุปเป็นภาษาไทย`,
          },
        ],
      });

      // รวมข้อความสรุปจาก text blocks + เก็บลิงก์อ้างอิงจาก web_search_tool_result
      // (web_search_20260209 ใช้ dynamic filtering — แหล่งอยู่ในผลค้น ไม่ใช่ citations บน text)
      let summary = "";
      const sourceMap = new Map<string, string>(); // url → title
      for (const block of response.content) {
        if (block.type === "text") {
          summary += (block as { text: string }).text;
        } else if (block.type.includes("web_search_tool_result")) {
          const results = (block as { content?: unknown }).content;
          if (Array.isArray(results)) {
            for (const r of results) {
              const item = r as { url?: string; title?: string };
              if (item.url && !sourceMap.has(item.url)) {
                sourceMap.set(item.url, item.title || item.url);
              }
            }
          }
        }
      }

      summary = cleanSummary(summary);
      if (!summary || summary.length < 20) return null;

      const result: ExternalResearch = {
        summaryTh: summary,
        sources: Array.from(sourceMap, ([url, title]) => ({ url, title })).slice(0, 8),
      };
      save(fixture.id, result);
      return result;
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        console.error(`[claude-research] API error ${err.status}: ${err.message}`);
      } else {
        console.error("[claude-research]", (err as Error).message);
      }
      return null;
    }
  });
}
