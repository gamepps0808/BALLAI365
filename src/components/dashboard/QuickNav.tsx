import Link from "next/link";
import { CalendarDays, Radio, History, CalendarRange, Sparkles, BarChart3 } from "lucide-react";

/**
 * ทางลัดฟีเจอร์หลัก — โชว์บนมือถือเท่านั้น (เดสก์ท็อปมี sidebar อยู่แล้ว)
 * 6 ปุ่มในแถวเดียว: วันนี้ · สด · ย้อนหลัง · ล่วงหน้า · AI แนะนำ · ตาราง
 * (label สั้นให้พอดี 6 ช่องบนจอมือถือ)
 */
const items = [
  { href: "/matches", label: "วันนี้", icon: CalendarDays, color: "var(--neon-green)" },
  { href: "/live", label: "สด", icon: Radio, color: "var(--danger)" },
  { href: "/results", label: "ย้อนหลัง", icon: History, color: "var(--neon-blue)" },
  { href: "/fixtures", label: "ล่วงหน้า", icon: CalendarRange, color: "var(--soft-purple)" },
  { href: "/ai-picks", label: "AI แนะนำ", icon: Sparkles, color: "var(--gold)" },
  { href: "/leagues", label: "ตาราง", icon: BarChart3, color: "var(--neon-green)" },
];

export function QuickNav() {
  return (
    <nav className="lg:hidden" aria-label="ทางลัดฟีเจอร์">
      <div className="grid grid-cols-6 gap-1.5">
        {items.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="glass glass-hover flex flex-col items-center gap-1 p-1.5 text-center"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
            >
              <Icon size={16} />
            </span>
            <span className="text-[10px] font-semibold leading-tight text-[var(--text-secondary)]">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
