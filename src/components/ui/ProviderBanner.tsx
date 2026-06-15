"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { TriangleAlert, Satellite, RotateCw, KeyRound, Gauge } from "lucide-react";

/**
 * Data-source status banner with retry. Error classes:
 *  - API Key Invalid / API Quota Exceeded → specific message
 *  - network/other → generic + retry
 * Fallback to sample data is always labeled — never mistakable for real analysis.
 */
export function ProviderBanner({
  provider,
  fallback,
  error,
}: {
  provider: string;
  fallback: boolean;
  error?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (fallback) {
    const isKey = error?.includes("API Key Invalid");
    const isQuota = error?.includes("API Quota Exceeded");
    const Icon = isKey ? KeyRound : isQuota ? Gauge : TriangleAlert;
    const title = isKey
      ? "API Key Invalid — คีย์ไม่ถูกต้องหรือหมดอายุ"
      : isQuota
        ? "API Quota Exceeded — โควตา requests วันนี้หมดแล้ว"
        : `เชื่อมต่อ ${provider} ไม่สำเร็จ`;

    return (
      <div className="glass flex items-start gap-3 border-[rgba(255,77,94,0.4)] bg-[var(--danger-soft)] p-3.5">
        <Icon size={18} className="mt-0.5 shrink-0 text-[var(--danger)]" />
        <div className="min-w-0 flex-1 text-[12px] leading-relaxed">
          <p className="font-bold text-[var(--danger)]">
            {title} — กำลังแสดง &ldquo;ข้อมูลตัวอย่าง&rdquo; ชั่วคราว
          </p>
          <p className="text-[var(--text-secondary)]">
            ข้อมูลด้านล่างไม่ใช่การวิเคราะห์จริง{" "}
            {isKey
              ? "ตรวจสอบ API_FOOTBALL_KEY ใน .env แล้วรีสตาร์ทเซิร์ฟเวอร์"
              : isQuota
                ? "โควตาจะรีเซ็ตอัตโนมัติในวันถัดไป หรืออัปเกรดแพลนที่ dashboard.api-football.com"
                : "อาจเป็นปัญหาเครือข่ายชั่วคราว ลองกดลองใหม่"}
          </p>
          {error && !isKey && !isQuota && (
            <p className="mt-1 break-all text-[11px] text-[var(--text-muted)]">สาเหตุ: {error}</p>
          )}
        </div>
        <button
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(255,77,94,0.4)] px-3 py-1.5 text-[12px] font-semibold text-[var(--danger)] transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          <RotateCw size={13} className={pending ? "animate-spin" : ""} />
          {pending ? "กำลังโหลด..." : "ลองใหม่"}
        </button>
      </div>
    );
  }

  if (provider === "mock") {
    return (
      <div className="glass flex items-center gap-2.5 p-3 text-[12px] text-[var(--text-secondary)]">
        <Satellite size={15} className="shrink-0 text-[var(--neon-blue)]" />
        โหมดข้อมูลตัวอย่าง (Mock) — ตั้งค่า <code className="text-[var(--neon-blue)]">DATA_PROVIDER=api-football</code>{" "}
        และใส่ API key ใน .env เพื่อใช้ข้อมูลจริง
      </div>
    );
  }
  return null;
}
