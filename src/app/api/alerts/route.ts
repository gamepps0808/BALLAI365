import { NextResponse } from "next/server";
import { fetchFixtures, footballNewDay } from "@/lib/service";
import { buildAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";

/**
 * การแจ้งเตือนจริงจากรอบวันปัจจุบัน (โหมดอ่านอย่างเดียว — 0 token)
 * ใช้โดยกระดิ่ง Topbar และผู้เรียกภายนอก
 */
export async function GET() {
  const { fixtures, fallback } = await fetchFixtures(footballNewDay());
  const alerts = fallback ? [] : buildAlerts(fixtures);
  return NextResponse.json({
    data: alerts,
    meta: { updatedAt: new Date().toISOString(), count: alerts.length },
  });
}
