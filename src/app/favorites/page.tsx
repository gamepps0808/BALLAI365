"use client";

import Link from "next/link";
import { Star, ChevronRight, X } from "lucide-react";
import { useState, useEffect } from "react";
import {
  readFavorites,
  removeFavorite,
  onFavoritesChange,
  type FavMatch,
} from "@/components/ui/FavoriteStar";

/**
 * รายการโปรด — คู่บอลที่ผู้ใช้กดติดตาม (เก็บในเครื่อง localStorage)
 * อ่านจาก localStorage ตรง ๆ ไม่เรียก API/AI (ต้นทุน 0)
 */
export default function FavoritesPage() {
  const [favs, setFavs] = useState<FavMatch[] | null>(null);

  useEffect(() => {
    const load = () =>
      setFavs(
        readFavorites().sort((a, b) => a.kickoff.localeCompare(b.kickoff))
      );
    load();
    return onFavoritesChange(load);
  }, []);

  return (
    <main>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]/70 px-4 py-3 backdrop-blur-xl lg:px-6">
        <Star size={16} className="text-[var(--gold)]" />
        <h1 className="text-lg font-bold">รายการโปรด</h1>
      </header>

      <div className="space-y-3 p-4 lg:p-6">
        <p className="text-[12px] text-[var(--text-secondary)]">
          คู่บอลที่คุณกดติดตาม — เก็บไว้ในเครื่องนี้ (ไม่ต้องล็อกอิน)
        </p>

        {favs === null ? (
          <div className="glass p-10 text-center text-[13px] text-[var(--text-muted)]">
            กำลังโหลด…
          </div>
        ) : favs.length === 0 ? (
          <div className="glass p-10 text-center text-[13px] text-[var(--text-muted)]">
            ยังไม่มีคู่ที่ติดตาม — กดปุ่ม{" "}
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--gold)]">
              <Star size={12} /> ติดตาม
            </span>{" "}
            ในหน้าแมตช์ที่สนใจ แล้วจะมาแสดงที่นี่
          </div>
        ) : (
          <div className="glass overflow-hidden">
            {favs.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-4 py-3 transition-colors first:border-t-0 hover:bg-[var(--bg-elevated)]"
              >
                <Link href={`/match/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="tabular w-14 shrink-0 text-[12px] font-semibold text-[var(--text-secondary)]">
                    {m.kickoffLabel}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold">
                      {m.home} <span className="text-[var(--text-muted)]">vs</span> {m.away}
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">{m.league}</p>
                  </div>
                </Link>
                <Link href={`/match/${m.id}`} aria-label="ดูรายละเอียด">
                  <ChevronRight size={16} className="text-[var(--text-muted)]" />
                </Link>
                <button
                  onClick={() => removeFavorite(m.id)}
                  aria-label="เลิกติดตาม"
                  className="shrink-0 rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
