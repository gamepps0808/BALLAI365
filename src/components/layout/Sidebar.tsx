"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  CalendarRange,
  History,
  Radio,
  Sparkles,
  BarChart3,
  Scale,
  ArrowUpDown,
  Flag,
  Table2,
  Newspaper,
  Bell,
  Settings,
  Crown,
  Star,
} from "lucide-react";
import { ScoreRing } from "../ui/ScoreRing";

export interface SidebarAccuracy {
  overall: number | null;
  graded: number;
  markets: [string, number | null, number][]; // [ตลาด, %ถูก|null, จำนวนคู่]
}

const menu = [
  { href: "/", label: "หน้าหลัก", icon: Home },
  { href: "/matches", label: "แมตช์วันนี้", icon: CalendarDays },
  { href: "/fixtures", label: "โปรแกรมล่วงหน้า", icon: CalendarRange },
  { href: "/results", label: "ผลบอลย้อนหลัง", icon: History },
  { href: "/live", label: "แมตช์สด", icon: Radio },
  { href: "/ai-picks", label: "AI แนะนำ", icon: Sparkles },
  { href: "/favorites", label: "รายการโปรด", icon: Star },
  { href: "/leagues", label: "วิเคราะห์ลีก", icon: BarChart3 },
  { href: "/handicap", label: "แฮนดิแคป", icon: Scale },
  { href: "/over-under", label: "สูง / ต่ำ", icon: ArrowUpDown },
  { href: "/corners", label: "เตะมุม", icon: Flag },
  { href: "/team-stats", label: "สถิติทีม", icon: Table2 },
  { href: "/news", label: "ข่าวสาร", icon: Newspaper },
  { href: "/alerts", label: "การแจ้งเตือน", icon: Bell },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function Sidebar({ accuracy }: { accuracy: SidebarAccuracy }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-4 overflow-y-auto border-r border-[var(--border-subtle)] bg-[var(--bg-deep)]/80 p-4 backdrop-blur-xl lg:flex">
      {/* Logo */}
      <Link href="/" className="block px-1 py-1.5">
        <Image
          src="/logo.png"
          alt="BALLAI365 — AI Football Analytics"
          width={720}
          height={210}
          priority
          className="h-auto w-full"
        />
      </Link>

      {/* Menu */}
      <nav className="flex flex-col gap-1">
        {menu.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                active
                  ? "bg-[var(--neon-blue)] font-semibold text-white shadow-[0_0_18px_rgba(47,129,247,0.4)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* สถิติ AI — กดทั้งการ์ดเข้าไปดูผลตัดสินรายคู่ */}
      <Link
        href="/backtest"
        title="กดเพื่อดูผลตัดสินรายคู่แบบละเอียด"
        className="glass glass-hover block p-4 transition-shadow hover:shadow-[0_0_14px_rgba(47,129,247,0.25)]"
      >
        <p className="text-[11px] font-bold tracking-wider text-[var(--text-secondary)]">
          สถิติ AI — ความแม่นจากผลจริง
        </p>
        <div className="mt-2 flex items-center gap-3">
          {accuracy.overall != null ? (
            <ScoreRing score={accuracy.overall} size={64} label="" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-[var(--border-subtle)] text-[13px] text-[var(--text-muted)]">
              —
            </span>
          )}
          <span className="text-[11px] text-[var(--text-muted)]">
            ภาพรวม
            <span className="tabular block text-[10px]">ตัดสินแล้ว {accuracy.graded} คู่</span>
          </span>
        </div>
        <dl className="mt-3 space-y-1.5 text-[11px]">
          {accuracy.markets.map(([k, pct, total]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-[var(--text-muted)]">{k}</dt>
              <dd
                className="tabular font-semibold"
                style={
                  pct != null
                    ? { color: pct >= 60 ? "var(--neon-green)" : pct >= 40 ? "var(--warning)" : "var(--danger)" }
                    : undefined
                }
              >
                {pct != null ? `${pct}%` : "รอข้อมูล"}
                {pct != null && (
                  <span className="ml-1 text-[10px] font-normal text-[var(--text-muted)]">({total})</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <span className="mt-3 block rounded-lg border border-[var(--border-subtle)] py-1.5 text-center text-[11px] text-[var(--neon-blue)]">
          ดูรายละเอียดรายคู่ →
        </span>
      </Link>

      {/* Premium card */}
      <div className="glass border-[rgba(245,197,66,0.3)] p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--gold)]">
          <Crown size={14} /> BALLAI365 PREMIUM
        </p>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
          อัปเกรดเพื่อเข้าถึงทุกฟีเจอร์
        </p>
        <button className="mt-3 w-full rounded-lg bg-[var(--neon-blue)] py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90">
          อัปเกรดเลย
        </button>
      </div>
    </aside>
  );
}
