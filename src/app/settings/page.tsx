"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Globe2, Info, Wrench, Check } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Badge } from "@/components/ui/Badge";
import { LIVE_REFRESH_KEY, getLiveRefreshPref } from "@/components/ui/AutoRefresh";

const REFRESH_OPTIONS = [
  { value: 30, label: "ทุก 30 วินาที" },
  { value: 60, label: "ทุก 1 นาที (ค่าเริ่มต้น)" },
  { value: 120, label: "ทุก 2 นาที" },
  { value: 0, label: "ปิดรีเฟรชอัตโนมัติ" },
];

/**
 * ตั้งค่า — ค่าที่มีผลจริงต่อเบราว์เซอร์นี้ (เก็บในเครื่อง ไม่ส่งขึ้นเซิร์ฟเวอร์)
 * การตั้งค่าระบบ (งบวิเคราะห์/ลีก/รีเฟรชข้อมูล) อยู่ที่ Admin Panel
 */
export default function SettingsPage() {
  const [refresh, setRefresh] = useState<number>(() =>
    typeof window === "undefined" ? 60 : (getLiveRefreshPref() ?? 60)
  );
  const [saved, setSaved] = useState(false);

  function pick(value: number) {
    setRefresh(value);
    try {
      localStorage.setItem(LIVE_REFRESH_KEY, String(value));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* private mode — เก็บไม่ได้ */
    }
  }

  return (
    <main>
      <Topbar title="ตั้งค่า" />
      <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-6">
        {/* รีเฟรชอัตโนมัติ */}
        <section className="glass p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-wider">
            <RefreshCw size={15} className="text-[var(--neon-blue)]" /> รีเฟรชสกอร์สดอัตโนมัติ
            {saved && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--neon-green)]">
                <Check size={12} /> บันทึกแล้ว
              </span>
            )}
          </h2>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            ใช้กับหน้าแมตช์สดและหน้าแมตช์ที่กำลังเตะ — เก็บในเบราว์เซอร์นี้เท่านั้น มีผลทันที
          </p>
          <div className="mt-3 space-y-2">
            {REFRESH_OPTIONS.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2.5 text-[12px]"
              >
                <span>{o.label}</span>
                <input
                  type="radio"
                  name="refresh"
                  checked={refresh === o.value}
                  onChange={() => pick(o.value)}
                  className="h-4 w-4 accent-[var(--neon-blue)]"
                />
              </label>
            ))}
          </div>
        </section>

        {/* ภาษา / เขตเวลา */}
        <section className="glass p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-wider">
            <Globe2 size={15} className="text-[var(--neon-green)]" /> ภาษาและเวลา
          </h2>
          <div className="mt-3 space-y-2 text-[12px]">
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2.5">
              <span>ภาษา</span>
              <span className="flex items-center gap-2">
                ไทย <Badge tone="muted">หลายภาษา — Future Feature</Badge>
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2.5">
              <span>เขตเวลา</span>
              <span className="tabular">Asia/Bangkok (UTC+7) — เวลาเตะทุกคู่แสดงตามเวลาไทย</span>
            </div>
          </div>
        </section>

        {/* รอบข้อมูลของระบบ */}
        <section className="glass p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-wider">
            <Info size={15} className="text-[var(--soft-purple)]" /> รอบข้อมูลรายวัน
          </h2>
          <ul className="mt-3 space-y-1.5 text-[12px] text-[var(--text-secondary)]">
            <li>• <b className="text-[var(--text-primary)]">12:00 น.</b> — ดึงโปรแกรมวันใหม่ + AI วิเคราะห์คู่ใหญ่ + ตัดสินผลคำทายของเมื่อวาน</li>
            <li>• คู่ที่วิเคราะห์แล้วคาอยู่หน้าหลักจนถึงเที่ยงวันถัดไป (เตะ/จบแล้วโชว์สกอร์ในตัว)</li>
            <li>• คู่ที่จบแล้วย้ายไปผลบอลย้อนหลังหลังรีเซ็ต พร้อมผลตัดสินคำทาย ✓/✗</li>
            <li>• คำทายทุกคู่ถูกล็อกตอนวิเคราะห์ — ไม่ขยับตามราคาตลาดทีหลัง</li>
          </ul>
        </section>

        {/* ทางลัด Admin */}
        <section className="glass p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-wider">
            <Wrench size={15} className="text-[var(--warning)]" /> การตั้งค่าระบบ
          </h2>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            งบวิเคราะห์ต่อวัน · เปิด/ปิดลีก · สถานะ API · Force Refresh · Clear Cache
          </p>
          <Link
            href="/admin"
            className="mt-3 block rounded-lg bg-[var(--neon-blue)] py-2.5 text-center text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            เปิด Admin Panel →
          </Link>
        </section>
      </div>
      <div className="px-4 pb-6 lg:px-6">
        <Disclaimer />
      </div>
    </main>
  );
}
