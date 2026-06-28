import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

/**
 * Footer มืออาชีพ — แบรนด์ + ลิงก์หลัก + แจ้งเตือนความรับผิดชอบ/18+
 * แสดงทุกหน้า (อยู่ในเลย์เอาต์ ถัดจากเนื้อหา)
 */
const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: "เมนูหลัก",
    links: [
      ["แมตช์วันนี้", "/matches"],
      ["แมตช์สด", "/live"],
      ["AI แนะนำ", "/ai-picks"],
      ["ผลบอลย้อนหลัง", "/results"],
    ],
  },
  {
    title: "ข้อมูล",
    links: [
      ["เกี่ยวกับเรา", "/about"],
      ["AI ทำงานอย่างไร", "/about#how"],
      ["ความแม่นยำย้อนหลัง", "/backtest"],
      ["ตารางคะแนน", "/leagues"],
    ],
  },
  {
    title: "นโยบาย",
    links: [
      ["เงื่อนไขการใช้งาน", "/terms"],
      ["ความเป็นส่วนตัว", "/privacy"],
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear() + 543; // พ.ศ.
  return (
    <footer className="mt-8 border-t border-[var(--border)] px-4 py-8 lg:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-5">
        {/* แบรนด์ */}
        <div className="lg:col-span-2">
          <p className="text-[15px] font-extrabold tracking-tight text-[var(--text-primary)]">
            {SITE_NAME}
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{SITE_TAGLINE}</p>
          <p className="mt-3 max-w-md text-[12px] leading-relaxed text-[var(--text-muted)]">
            วิเคราะห์ฟุตบอลด้วย AI จากข้อมูลจริง — ฟอร์ม สถิติ หัวต่อหัว ราคาต่อรอง
            ตัวจริง และสภาพอากาศ นำเสนอเป็นคำทายที่โปร่งใส ตรวจสอบย้อนหลังได้
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
            <ShieldCheck size={13} className="text-[var(--neon-green)]" /> 18+ ·
            เพื่อข้อมูลและความบันเทิงเท่านั้น
          </div>
        </div>

        {/* คอลัมน์ลิงก์ */}
        {COLS.map((col) => (
          <div key={col.title}>
            <p className="text-[11px] font-bold tracking-wider text-[var(--text-muted)]">
              {col.title}
            </p>
            <ul className="mt-2.5 space-y-2">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[12.5px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* แถบล่าง */}
      <div className="mx-auto mt-8 max-w-6xl border-t border-[var(--border)] pt-5 text-[11px] leading-relaxed text-[var(--text-muted)]">
        <p>
          การวิเคราะห์ทั้งหมดเป็นการประเมินจากสถิติและ AI เท่านั้น ผลการแข่งขันฟุตบอลมีความไม่แน่นอน
          — ไม่ใช่การรับประกันผล โปรดใช้วิจารณญาณในการตัดสินใจ
        </p>
        <p className="mt-2">© {year} {SITE_NAME} · สงวนลิขสิทธิ์</p>
      </div>
    </footer>
  );
}
