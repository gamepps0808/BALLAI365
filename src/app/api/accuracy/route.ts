import { NextResponse } from "next/server";
import { getAccuracySummary, settlePending } from "@/lib/accuracy";

export const dynamic = "force-dynamic";

/** ความแม่น AI จริง — คำทายที่เซฟไว้เทียบสกอร์จริงจาก API */
export async function GET() {
  const settled = await settlePending().catch(() => 0);
  const summary = getAccuracySummary();
  return NextResponse.json({
    data: summary,
    meta: { updatedAt: new Date().toISOString(), settledThisCall: settled },
  });
}
