import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { invalidate } from "@/lib/cache";
import { fetchFixtures, fetchLiteFixtures, footballToday, footballNewDay } from "@/lib/service";
import { settlePending } from "@/lib/accuracy";

export const dynamic = "force-dynamic";

/**
 * Daily refresh — called by the 05:00 scheduler (launchd) or manually
 * from the Admin panel's "Force Refresh Data".
 *
 * 1. Clears every cached API response (yesterday's data)
 * 2. Prefetches today's fixtures so the first visitor gets a warm cache
 *
 * Optional protection: set CRON_SECRET in .env and call with
 * Authorization: Bearer <secret>. Without CRON_SECRET the route is open
 * (fine for localhost).
 */
export async function GET(request: NextRequest) {
  // ผ่านได้ 2 ทาง: Bearer CRON_SECRET (launchd) หรือสิทธิ์ admin (ปุ่ม Force Refresh)
  const secret = process.env.CRON_SECRET;
  const bearerOk = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : false;
  if (!bearerOk && !isAdminRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  invalidate(); // drop all af:* and svc:* entries

  // 1) รายการบอลทั้งวัน + คัดคู่ใหญ่ก่อน (เพื่อให้ deep analysis วิเคราะห์เฉพาะคู่ใหญ่)
  const [liteToday, liteNewDay] = await Promise.all([
    fetchLiteFixtures(footballToday()),
    fetchLiteFixtures(footballNewDay()),
  ]);

  // 2) deep analysis สำหรับคู่ใหญ่ (อนุญาตให้ Claude วิเคราะห์ใหม่เฉพาะที่นี่)
  const [todayRes, newDayRes] = await Promise.all([
    fetchFixtures(footballToday(), { analyze: true }),
    fetchFixtures(footballNewDay(), { analyze: true }),
  ]);

  // 3) ตัดสินคำทายของแมตช์ที่จบไปแล้ว ลงสถิติความแม่น AI
  const settledPredictions = await settlePending().catch(() => 0);

  // 4) จดเวลารีเฟรชรอบนี้ให้ Admin panel อ่าน
  try {
    fs.writeFileSync(
      path.join(process.cwd(), ".cache", "last-refresh.json"),
      JSON.stringify({ refreshedAt: new Date().toISOString() })
    );
  } catch {
    /* best-effort */
  }

  return NextResponse.json({
    ok: !todayRes.fallback && !newDayRes.fallback,
    refreshedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    provider: newDayRes.provider,
    fallback: newDayRes.fallback,
    error: newDayRes.error ?? todayRes.error,
    todayDate: footballToday(),
    todayFixtures: todayRes.fixtures.length,
    todayAllMatches: liteToday.fixtures.length,
    newDayDate: footballNewDay(),
    newDayFixtures: newDayRes.fixtures.length,
    newDayAllMatches: liteNewDay.fixtures.length,
    bigMatchSelectionBy: liteNewDay.selectionBy,
    settledPredictions,
    matchOfTheDay:
      newDayRes.fixtures.find((f) => f.isMatchOfTheDay)?.prediction.pickLabel ?? null,
  });
}
