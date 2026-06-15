"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

/**
 * กระดิ่งแจ้งเตือน Topbar — ตัวเลขจริงจาก /api/alerts (รอบวันปัจจุบัน)
 * กดแล้วไปหน้าการแจ้งเตือน · ไม่มีแจ้งเตือน = ไม่โชว์ตัวเลข ไม่โชว์เลขปลอม
 */
export function BellButton() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/alerts", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => setCount(j?.meta?.count ?? 0))
      .catch(() => setCount(null));
    return () => ctrl.abort();
  }, []);

  return (
    <Link
      href="/alerts"
      aria-label="การแจ้งเตือน"
      title={count != null ? `การแจ้งเตือน ${count} รายการ` : "การแจ้งเตือน"}
      className="relative rounded-lg border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
    >
      <Bell size={15} />
      {count != null && count > 0 && (
        <span className="tabular absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-0.5 text-[9px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
