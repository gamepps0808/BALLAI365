"use client";

import { Globe, ChevronRight } from "lucide-react";
import { Freshness } from "../ui/Freshness";
import { SearchBox } from "./SearchBox";
import { BellButton } from "./BellButton";

export function Topbar({ title }: { title: string }) {
  // ระบุ timezone ตายตัว — server (UTC) กับ client (เครื่องผู้ใช้) ต้องได้วันเดียวกัน
  // มิฉะนั้นเกิด hydration mismatch แล้ว React re-render ทั้งหน้า (ช้า/กระพริบ)
  const dateLabel = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]/70 px-4 py-3 backdrop-blur-xl lg:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold">{title}</h1>
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
          <span>{dateLabel}</span>
          <Freshness />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SearchBox />
        <BellButton />
        <button
          aria-label="ภาษา"
          className="rounded-lg border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Globe size={15} />
        </button>
        <button className="hidden items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-[12px] sm:flex">
          User Premium
          <span className="rounded bg-[var(--gold)] px-1.5 py-0.5 text-[10px] font-bold text-black">
            VIP
          </span>
          <ChevronRight size={13} className="text-[var(--text-muted)]" />
        </button>
      </div>
    </header>
  );
}
