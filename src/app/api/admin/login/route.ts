import { NextRequest, NextResponse } from "next/server";
import { adminSecret, ADMIN_COOKIE } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** เข้าสู่ระบบผู้ดูแล — รหัสถูกต้องจะได้คุกกี้ httpOnly อายุ 30 วัน */
export async function POST(request: NextRequest) {
  const secret = adminSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้ง ADMIN_SECRET ใน .env" },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as { secret?: string } | null;
  if (body?.secret !== secret) {
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
  return res;
}

/** ออกจากระบบ — ลบคุกกี้ */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
