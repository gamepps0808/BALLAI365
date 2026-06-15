import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { cached } from "./cache";
import { loadSavedAnalysis, saveAnalysis } from "./claude-store";
import { claudeEnabled } from "./claude-analyst";
import { LiteFixture } from "./types";
import { getSettings } from "./settings";
import { leagueRank } from "./league-priority";

/**
 * คัด "บอลคู่ใหญ่" สูงสุด 10 คู่/วัน จากรายการบอลทั้งหมด
 *
 * - Claude 1 call ต่อวัน (input สั้น ๆ แค่รายชื่อคู่) → เซฟผลลงดิสก์ถาวร
 * - ไม่มี ANTHROPIC_API_KEY → fallback จัดอันดับตามลีกดังอัตโนมัติ
 * - เฉพาะ 10 คู่นี้เท่านั้นที่เข้าสู่การวิเคราะห์เชิงลึก (ประหยัด token)
 */

const SelectionSchema = z.object({
  fixtureIds: z
    .array(z.number().int())
    .describe("fixture id ของบอลคู่ใหญ่ เรียงจากใหญ่สุด สูงสุด 10 คู่"),
});

export interface BigMatchSelection {
  date: string;
  fixtureIds: number[];
  by: "claude" | "heuristic";
}

/** ลำดับความสำคัญของลีก (fallback เมื่อไม่มี Claude) */
/** ตัดคู่ในลีกที่ปิดไว้ใน Admin ออกจากการคัดคู่ใหญ่ */
function withoutDisabledLeagues(fixtures: LiteFixture[]): LiteFixture[] {
  const disabled = getSettings().disabledLeagues;
  if (disabled.length === 0) return fixtures;
  return fixtures.filter(
    (f) => !disabled.some((name) => f.leagueName.includes(name))
  );
}

/** บอลเยาวชน — ห้ามคัดเป็นคู่ใหญ่ (กฎเดียวกับ prompt ของ Claude) */
function isYouthMatch(f: LiteFixture): boolean {
  const hay = `${f.leagueName} ${f.homeName} ${f.awayName}`;
  return /U-?1[5-9]\b|U-?2[0-3]\b|Youth|Junior/i.test(hay);
}

function heuristicSelect(fixtures: LiteFixture[]): number[] {
  const rank = (f: LiteFixture) => {
    const hasOdds = f.ahLine !== null ? 0 : 0.5; // คู่ที่ตลาดเปิดราคาสำคัญกว่า
    return leagueRank(f.leagueName, f.leagueCountry) + hasOdds;
  };
  return fixtures
    .filter((f) => (f.status === "SCHEDULED" || f.status === "LIVE") && !isYouthMatch(f))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 10)
    .map((f) => f.afId);
}

export async function selectBigMatches(
  date: string,
  fixtures: LiteFixture[]
): Promise<BigMatchSelection> {
  return cached(`bigmatch:${date}`, 3600, async () => {
    // เลือกแล้วเซฟถาวร — วันเดียวกันไม่เลือกซ้ำ ไม่เปลือง token
    const saved = loadSavedAnalysis<BigMatchSelection>(`selection-${date}`);
    if (saved?.fixtureIds?.length) return saved;

    fixtures = withoutDisabledLeagues(fixtures);

    let selection: BigMatchSelection = {
      date,
      fixtureIds: heuristicSelect(fixtures),
      by: "heuristic",
    };

    if (claudeEnabled() && fixtures.length > 0) {
      try {
        const rows = fixtures
          .filter((f) => f.status === "SCHEDULED" || f.status === "LIVE")
          .map(
            (f) =>
              `${f.afId} | ${f.leagueName} (${f.leagueCountry}) | ${f.homeName} vs ${f.awayName}${f.ahLine !== null ? ` | AH ${f.ahLine}` : ""}`
          )
          .join("\n");

        const client = new Anthropic();
        const response = await client.messages.parse({
          model: "claude-opus-4-8",
          max_tokens: 4000,
          system:
            "คุณคือบรรณาธิการข่าวกีฬา เลือก 'บอลคู่ใหญ่' ที่แฟนบอลทั่วโลกสนใจที่สุดของวัน สูงสุด 10 คู่ " +
            "กฎ: คู่จาก World Cup / Champions League / Euro / Copa America ต้องถูกเลือกทุกคู่เสมอ (สำคัญสุด) " +
            "จากนั้นเติมด้วยลีกใหญ่ยุโรป ทีมดัง คู่ชิงดำ/ดาร์บี้ จนครบหรือใกล้ 10 คู่ " +
            "ห้ามเลือกบอลเยาวชน (U17/U20/U23) หรือลีกเล็ก ถ้ามีคู่จากรายการใหญ่กว่าให้เลือก ตอบเป็น fixtureIds เท่านั้น",
          messages: [{ role: "user", content: `คู่บอลวันที่ ${date}:\n${rows}` }],
          output_config: { format: zodOutputFormat(SelectionSchema) },
        });

        const ids = response.parsed_output?.fixtureIds
          ?.filter((id) => fixtures.some((f) => f.afId === id))
          .slice(0, 10);
        if (ids?.length) {
          selection = { date, fixtureIds: ids, by: "claude" };
        }
      } catch (err) {
        console.error("[big-match-selector]", (err as Error).message);
      }
    }

    if (selection.fixtureIds.length > 0) {
      saveAnalysis(`selection-${date}`, selection);
    }
    return selection;
  });
}

/** อ่าน selection ที่เซฟไว้ (ใช้โดย provider เพื่อจำกัดคู่ที่วิเคราะห์เชิงลึก) */
export function loadSelection(date: string): BigMatchSelection | null {
  return loadSavedAnalysis<BigMatchSelection>(`selection-${date}`);
}
