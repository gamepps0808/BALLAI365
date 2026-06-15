import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getDataProvider } from "@/lib/providers";
import { analyzeFixtureWithClaude, applyClaudeAnalysis } from "@/lib/claude-analyst";
import { getLedgerEntry, relockPrediction } from "@/lib/accuracy";
import { invalidate } from "@/lib/cache";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * รอบวิเคราะห์สุดท้ายก่อนเตะ — launchd เรียกทุก 15 นาที
 *
 * คู่ที่วิเคราะห์ไว้แล้วและจะเตะภายใน 60 นาที → ให้ Claude วิเคราะห์ใหม่
 * ด้วยข้อมูลล่าสุด (ตัวจริงที่เพิ่งประกาศ + ราคาปัจจุบัน + ข่าวเจ็บ)
 * แล้วล็อกรอบสุดท้าย (ทำครั้งเดียวต่อคู่ — มี finalizedAt กันซ้ำ)
 *
 * ไม่มีคู่ในหน้าต่างเวลา = จบทันที 0 ค่าใช้จ่าย
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearerOk = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : false;
  if (!bearerOk && !isAdminRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  // อ่านคู่ค้างจาก ledger ตรงๆ (ไฟล์เล็ก ไม่ยิง API)
  let ledger: { id: string; kickoff: string | null; settled: boolean; finalizedAt?: string | null }[] = [];
  try {
    ledger = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), ".cache", "accuracy", "ledger.json"), "utf8")
    );
  } catch {
    /* ยังไม่มี ledger */
  }

  const now = Date.now();
  // ?test=af-xxx — ทดสอบ pipeline กับคู่ที่ระบุโดยข้ามหน้าต่างเวลา (ผ่าน auth แล้วเท่านั้น)
  const testId = request.nextUrl.searchParams.get("test");
  const candidates = ledger.filter((e) => {
    if (e.settled || e.finalizedAt || !e.kickoff) return false;
    if (testId) return e.id === testId;
    const minsToKick = (new Date(e.kickoff).getTime() - now) / 60000;
    // หน้าต่าง 90 นาที — รายชื่อตัวจริงบอลใหญ่มักประกาศ 60-75 นาทีก่อนเตะ
    // เริ่มเฝ้าตั้งแต่ 90 นาที เพื่อจับวิเคราะห์ทันทีที่รายชื่อออก (ไม่พลาดคู่ที่ออกเร็ว)
    return minsToKick > 0 && minsToKick <= 90;
  });

  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      finalized: [],
      waiting: [],
      note: "ไม่มีคู่ที่จะเตะภายใน 90 นาที",
      tookMs: Date.now() - startedAt,
    });
  }

  const provider = getDataProvider();
  const finalized: { id: string; match: string; pick: string; ou: string | null }[] = [];
  const waiting: string[] = [];

  for (const c of candidates) {
    try {
      if (!provider.getFixtureById) break;
      const fixture = await provider.getFixtureById(c.id);
      if (!fixture || fixture.status !== "SCHEDULED") continue;

      // รอไลน์อัพก่อนถ้ายังมีเวลา — ตัวจริงคือข้อมูลสำคัญสุดของรอบสุดท้าย
      // ยังไม่ประกาศ + เหลือเกิน 20 นาที → ข้ามรอบนี้ รอรอบถัดไป (ทุก 15 นาที)
      // เหลือ ≤20 นาที → วิเคราะห์เลย ไม่รออีก (การันตีได้รอบสุดท้ายก่อนเตะเสมอ)
      const minsToKick = c.kickoff
        ? (new Date(c.kickoff).getTime() - Date.now()) / 60000
        : 0;
      const hasLineups =
        !!fixture.homeLineup?.confirmed && !!fixture.awayLineup?.confirmed;
      if (!testId && !hasLineups && minsToKick > 20) {
        waiting.push(`${fixture.homeTeam.name} vs ${fixture.awayTeam.name} (รอไลน์อัพ, เหลือ ${Math.round(minsToKick)} นาที)`);
        continue;
      }

      // วิเคราะห์ใหม่ด้วยข้อมูลปัจจุบัน (force = ข้ามผลเดิม) แล้วล็อกรอบสุดท้าย
      const analysis = await analyzeFixtureWithClaude(fixture, { force: true });
      if (!analysis) continue;
      applyClaudeAnalysis(fixture, analysis);
      relockPrediction(fixture);

      const e = getLedgerEntry(c.id);
      finalized.push({
        id: c.id,
        match: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
        pick: fixture.prediction.pickLabel,
        ou:
          e?.ouLine != null
            ? `${e.ouPick === "OVER" ? "Over" : "Under"} ${e.ouLine}`
            : null,
      });
    } catch (err) {
      console.error(`[prekick] ${c.id} failed:`, (err as Error).message);
    }
  }

  // ล้าง cache ฝั่งเสิร์ฟหน้า — ให้ทุกหน้าเห็นคำทายรอบสุดท้ายทันที
  if (finalized.length > 0) invalidate("svc:");

  return NextResponse.json({
    ok: true,
    finalized,
    waiting,
    tookMs: Date.now() - startedAt,
  });
}
