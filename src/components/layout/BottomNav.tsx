"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  CalendarRange,
  Radio,
  Sparkles,
  Star,
  Menu,
  X,
  History,
  BarChart3,
  Scale,
  ArrowUpDown,
  Flag,
  Table2,
  Newspaper,
  Bell,
  Activity,
  Search,
} from "lucide-react";

const items = [
  { href: "/", label: "หน้าหลัก", icon: Home },
  { href: "/matches", label: "วันนี้", icon: CalendarDays },
  { href: "/live", label: "สด", icon: Radio },
  { href: "/ai-picks", label: "AI แนะนำ", icon: Sparkles },
];

/** เมนูเต็มในแผ่น "เพิ่มเติม" — ครบทุกหน้าเหมือน sidebar เดสก์ท็อป */
const moreItems = [
  { href: "/fixtures", label: "โปรแกรมล่วงหน้า", icon: CalendarRange },
  { href: "/favorites", label: "รายการโปรด", icon: Star },
  { href: "/results", label: "ผลบอลย้อนหลัง", icon: History },
  { href: "/leagues", label: "ตารางคะแนน", icon: BarChart3 },
  { href: "/handicap", label: "แฮนดิแคป", icon: Scale },
  { href: "/over-under", label: "สูง / ต่ำ", icon: ArrowUpDown },
  { href: "/corners", label: "เตะมุม", icon: Flag },
  { href: "/team-stats", label: "สถิติทีม + ค้นหา", icon: Table2 },
  { href: "/news", label: "ข่าวสาร", icon: Newspaper },
  { href: "/alerts", label: "การแจ้งเตือน", icon: Bell },
  { href: "/backtest", label: "สถิติ AI (Backtest)", icon: Activity },
  // ตั้งค่า: ซ่อนจากเมนู — เจ้าของเข้าตรงที่ /settings
];

/** Mobile bottom navigation (hidden on desktop). */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  // เปลี่ยนหน้าแล้วปิดแผ่นเมนูเอง (ปรับ state ระหว่าง render ตามแพตเทิร์น React)
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMoreOpen(false);
  }

  const inMore = moreItems.some((m) => pathname === m.href);

  return (
    <>
      {/* แผ่นเมนูเพิ่มเติม */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-[var(--border-subtle)] bg-[var(--bg-deep)] p-4 pb-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-extrabold tracking-wider">เมนูทั้งหมด</p>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="ปิดเมนู"
                className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)]"
              >
                <X size={16} />
              </button>
            </div>
            {/* ค้นหาทีม — มือถือไม่มีช่องค้นหาบน Topbar */}
            <Link
              href="/team-stats"
              className="mb-3 flex items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2.5 text-[12px] text-[var(--text-muted)]"
            >
              <Search size={14} /> ค้นหาทีมหรือคู่แข่ง...
            </Link>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-3 text-[12px] font-semibold ${
                      active
                        ? "bg-[var(--neon-blue-soft)] text-[var(--neon-blue)]"
                        : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border-subtle)] bg-[var(--bg-deep)]/90 backdrop-blur-xl lg:hidden">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                active ? "text-[var(--neon-blue)]" : "text-[var(--text-muted)]"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
            moreOpen || inMore ? "text-[var(--neon-blue)]" : "text-[var(--text-muted)]"
          }`}
        >
          <Menu size={18} />
          เพิ่มเติม
        </button>
      </nav>
    </>
  );
}
