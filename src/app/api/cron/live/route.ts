import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { fetchLiteFixtures, footballToday, footballNewDay } from "@/lib/service";
import * as api from "@/lib/api-football";
import { analyzeLiveMatch } from "@/lib/claude-live";
import { loadLiveRead, saveLiveRead } from "@/lib/live-store";
import { invalidate } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * วิเคราะห์บอลสด — เรียกทุก ~5 นาที (cron-job.org) เฉพาะช่วงมีบอลแข่ง
 *  - หาคู่ใหญ่ (isBig) ที่กำลังสด
 *  - มี "เหตุการณ์ใหม่" (ประตู/ใบแดง) ตั้งแต่รอบก่อนไหม? (เทียบ signature)
 *    มี  → ยิง Haiku 1 ครั้ง → เซฟทรรศนะสด
 *    ไม่มี → ข้าม (ไม่เสีย token)
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
  const [today, newDay] = await Promise.all([
    fetchLiteFixtures(footballToday()),
    fetchLiteFixtures(footballNewDay()),
  ]);
  const seen = new Set<string>();
  const liveBig = [...today.fixtures, ...newDay.fixtures].filter((f) => {
    if (f.status !== "LIVE" || !f.isBig || seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });

  const updated: string[] = [];
  for (const f of liveBig) {
    try {
      const events = await api.getFixtureEvents(f.afId).catch(() => []);
      const reds = (events ?? []).filter(
        (e) => e.type === "Card" && /Red/i.test(e.detail ?? "")
      ).length;
      const prev = loadLiveRead<{ signature: string }>(f.id);
      // พักครึ่ง: ทริกครั้งเดียว แล้วจำไว้ใน signature (ไม่ยิงซ้ำตอนครึ่งหลังเริ่ม)
      const htSeen = f.statusShort === "HT" || (prev?.signature?.includes("|ht") ?? false);
      const total = (f.homeGoals ?? 0) + (f.awayGoals ?? 0);
      // ยังไม่มีประตู/ใบแดง/พักครึ่ง = ไม่มีอะไรให้พูด ข้ามไป (ประหยัด)
      if (total === 0 && reds === 0 && !htSeen) continue;
      // ขึ้นต้น "s3" = เวอร์ชันล่าสุด (Sonnet + สถิติสด + ฟันธงสูง/ต่ำ) — เปลี่ยนเวอร์ชัน = ทรรศนะเก่ารีเฟรชใหม่
      const sig = `s3|${f.homeGoals ?? 0}-${f.awayGoals ?? 0}|red${reds}|${htSeen ? "ht" : ""}`;
      if (prev?.signature === sig) continue; // ไม่มีเหตุการณ์ใหม่
      const read = await analyzeLiveMatch(f, events, sig);
      if (read) {
        saveLiveRead(f.id, read);
        updated.push(f.id);
      }
    } catch (err) {
      console.error("[cron/live]", f.id, (err as Error).message);
    }
  }

  if (updated.length > 0) invalidate("svc:"); // ให้หน้าเห็นทรรศนะสดใหม่
  return NextResponse.json({
    ok: true,
    liveBig: liveBig.length,
    updated,
    tookMs: Date.now() - startedAt,
  });
}
