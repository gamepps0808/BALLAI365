import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, unauthorized } from "@/lib/admin-auth";
import { invalidate } from "@/lib/cache";

export const dynamic = "force-dynamic";

/** ล้าง cache ในหน่วยความจำทั้งหมด — รอบถัดไปดึงข้อมูลสดจาก API */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();
  const cleared = invalidate();
  return NextResponse.json({ data: { cleared, at: new Date().toISOString() } });
}
