import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, unauthorized } from "@/lib/admin-auth";
import { invalidate } from "@/lib/cache";
import { deleteAnalysis } from "@/lib/claude-store";
import { fetchFixtures, footballToday, footballNewDay } from "@/lib/service";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * วิเคราะห์ใหม่เฉพาะ "คู่ที่ยังไม่เตะ" ด้วย logic ล่าสุด
 *  - ลบผลวิเคราะห์ Claude ที่เซฟไว้ของคู่ที่ยังไม่เตะ (คู่ที่เตะ/จบแล้ว = ไม่แตะ ล็อกถาวร)
 *  - ล้าง cache memory แล้ววิเคราะห์ใหม่สดทันที (verdict แฮนดิแคปจาก Claude จะมีผล)
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();

  let cleared = 0;
  try {
    const ledger: { id: string; kickoff: string | null; settled: boolean }[] = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), ".cache", "accuracy", "ledger.json"), "utf8")
    );
    const now = Date.now();
    for (const e of ledger) {
      if (e.settled || !e.kickoff) continue;
      if (new Date(e.kickoff).getTime() <= now) continue; // เตะไปแล้ว = ล็อก ไม่ลบ
      if (deleteAnalysis(e.id)) cleared++;
    }
  } catch {
    // ยังไม่มี ledger
  }

  invalidate(); // ล้าง cache เพื่อให้ assemble + วิเคราะห์ใหม่
  const [today, newday] = await Promise.all([
    fetchFixtures(footballToday(), { analyze: true }),
    fetchFixtures(footballNewDay(), { analyze: true }),
  ]);

  return NextResponse.json({
    data: {
      cleared,
      todayMatches: today.fixtures?.length ?? 0,
      newDayMatches: newday.fixtures?.length ?? 0,
      at: new Date().toISOString(),
    },
  });
}
