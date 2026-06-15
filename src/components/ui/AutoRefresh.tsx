"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const LIVE_REFRESH_KEY = "afa-live-refresh-seconds";

/** อ่านค่ารีเฟรชที่ผู้ใช้ตั้งในหน้าตั้งค่า (ต่อเบราว์เซอร์) — 0 = ปิด, null = ใช้ค่าเริ่มต้น */
export function getLiveRefreshPref(): number | null {
  try {
    const v = localStorage.getItem(LIVE_REFRESH_KEY);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

/** รีเฟรชข้อมูลหน้าอัตโนมัติทุก N วินาที (หน้าแมตช์สด/แมตช์ที่กำลังเตะ) */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const pref = getLiveRefreshPref();
    const interval = pref ?? seconds; // ผู้ใช้ตั้งเองชนะค่าเริ่มต้น
    if (interval <= 0) return; // 0 = ปิดรีเฟรชอัตโนมัติ
    const id = setInterval(() => router.refresh(), interval * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
