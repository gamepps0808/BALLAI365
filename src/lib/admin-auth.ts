import { NextRequest } from "next/server";

/**
 * ยามประตู Admin — ทุก endpoint /api/admin/* ต้องผ่านตัวนี้ก่อน
 *
 * วิธียืนยันตัว (อย่างใดอย่างหนึ่ง):
 *  1. คุกกี้ afa_admin (ได้จากหน้า /admin หลังใส่รหัสถูก)
 *  2. header Authorization: Bearer <ADMIN_SECRET> (สำหรับสคริปต์/curl)
 *
 * ปิดตายโดยปริยาย: ถ้าไม่ตั้ง ADMIN_SECRET ใน .env จะปฏิเสธทุกคำขอ
 */

export const ADMIN_COOKIE = "afa_admin";

export function adminSecret(): string | null {
  return process.env.ADMIN_SECRET ?? null;
}

export function isAdminRequest(request: NextRequest): boolean {
  const secret = adminSecret();
  if (!secret) return false; // ไม่ตั้งรหัส = ไม่มีใครเข้าได้ (ปลอดภัยไว้ก่อน)

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie === secret) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  return false;
}

export function unauthorized(): Response {
  return Response.json(
    { error: "unauthorized — ต้องเข้าสู่ระบบผู้ดูแลก่อน" },
    { status: 401 }
  );
}
