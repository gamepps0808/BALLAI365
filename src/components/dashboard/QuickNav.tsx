import Link from "next/link";
import { CalendarDays, Radio, CalendarRange, Sparkles, BarChart3 } from "lucide-react";

/**
 * ทางลัดฟีเจอร์หลัก — โชว์บนมือถือเท่านั้น (เดสก์ท็อปมี sidebar อยู่แล้ว)
 * ให้ผู้ใช้เปิดเข้ามาเห็นทันทีว่าแอพทำอะไรได้บ้าง แล้วกดไปได้เลย
 */
const items = [
  { href: "/matches", label: "แมตช์วันนี้", icon: CalendarDays, color: "var(--neon-green)" },
  { href: "/live", label: "แมตช์สด", icon: Radio, color: "var(--danger)" },
  { href: "/fixtures", label: "โปรแกรมล่วงหน้า", icon: CalendarRange, color: "var(--neon-blue)" },
  { href: "/ai-picks", label: "AI แนะนำ", icon: Sparkles, color: "var(--soft-purple)" },
  { href: "/leagues", label: "ตารางคะแนน", icon: BarChart3, color: "var(--gold)" },
];

export function QuickNav() {
  return (
    <nav className="lg:hidden" aria-label="ทางลัดฟีเจอร์">
      <div className="grid grid-cols-5 gap-2">
        {items.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="glass glass-hover flex flex-col items-center gap-1.5 p-2 text-center"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
            >
              <Icon size={18} />
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
