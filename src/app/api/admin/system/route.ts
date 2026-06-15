import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, unauthorized } from "@/lib/admin-auth";
import { cacheSize } from "@/lib/cache";
import { getAccuracySummary } from "@/lib/accuracy";

export const dynamic = "force-dynamic";

/** สถานะระบบจริงสำหรับ Admin panel — อ่านจากดิสก์/หน่วยความจำ ไม่ยิง API ภายนอก */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();
  const cwd = process.cwd();

  // คีย์ตั้งไว้หรือยัง (รายงานแค่ มี/ไม่มี — ไม่ส่งค่าคีย์ออกไปเด็ดขาด)
  const keys = {
    API_FOOTBALL_KEY: Boolean(process.env.API_FOOTBALL_KEY),
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
    OPENWEATHER_KEY: Boolean(process.env.OPENWEATHER_KEY),
  };

  // จำนวนผลวิเคราะห์ Claude ที่เซฟไว้ (ไฟล์ af-*.json ใน 3 วันล่าสุด)
  let savedAnalyses = 0;
  try {
    savedAnalyses = fs
      .readdirSync(path.join(cwd, ".cache", "claude"))
      .filter((n) => /^af-\d+\.json$/.test(n)).length;
  } catch {
    /* ยังไม่มีโฟลเดอร์ */
  }

  // เวลารีเฟรชรอบล่าสุด (เขียนโดย cron)
  let lastRefresh: string | null = null;
  try {
    lastRefresh = (
      JSON.parse(
        fs.readFileSync(path.join(cwd, ".cache", "last-refresh.json"), "utf8")
      ) as { refreshedAt?: string }
    ).refreshedAt ?? null;
  } catch {
    /* ยังไม่เคยรีเฟรช */
  }

  const acc = getAccuracySummary();

  return NextResponse.json({
    data: {
      provider: process.env.DATA_PROVIDER ?? "mock",
      keys,
      savedAnalyses,
      ledger: {
        settled: acc.entries.length,
        pending: acc.pending,
        overallPct: acc.overall.pct,
      },
      cacheEntries: cacheSize(),
      lastRefresh,
      refreshSchedule: "ทุกวัน 12:00 น. (launchd)",
    },
  });
}
