"use client";

import { TriangleAlert } from "lucide-react";

/** Global error boundary — shown when a page or data fetch fails. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <TriangleAlert size={40} className="text-[var(--danger)]" />
      <h1 className="text-lg font-bold">เกิดข้อผิดพลาด</h1>
      <p className="max-w-md text-[13px] text-[var(--text-secondary)]">
        ไม่สามารถโหลดข้อมูลได้ในขณะนี้ — อาจเป็นปัญหาจาก API Provider หรือเครือข่าย
      </p>
      {error.digest && (
        <p className="text-[11px] text-[var(--text-muted)]">รหัสอ้างอิง: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-[var(--neon-blue)] px-5 py-2 text-[13px] font-semibold text-white"
      >
        ลองใหม่อีกครั้ง
      </button>
    </main>
  );
}
