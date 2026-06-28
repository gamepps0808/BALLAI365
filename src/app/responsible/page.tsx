import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, TriangleAlert, CheckCircle2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "เล่นอย่างมีความรับผิดชอบ",
  description: `${SITE_NAME} ส่งเสริมการเล่นอย่างมีความรับผิดชอบ — 18+ เท่านั้น เนื้อหาเพื่อข้อมูลและความบันเทิง`,
};

const PRINCIPLES = [
  "ตั้งงบไว้ล่วงหน้า และเล่นเฉพาะเงินที่เสียได้โดยไม่กระทบชีวิตประจำวัน",
  "ตั้งเวลา/วงเงินต่อวัน และหยุดเมื่อถึงขีดที่ตั้งไว้",
  "อย่าไล่ตามเงินที่เสีย (chasing losses)",
  "อย่ายืมเงินหรือใช้เงินจำเป็นมาเล่น",
  "มองเป็นความบันเทิง ไม่ใช่ช่องทางหารายได้",
];

const SIGNS = [
  "เล่นมากขึ้นเรื่อย ๆ จนคุมไม่อยู่",
  "หมกมุ่น คิดถึงแต่การเดิมพันตลอดเวลา",
  "เล่นเพื่อหนีปัญหาหรือความเครียด",
  "โกหกคนรอบข้างเรื่องการเล่น",
  "กระทบการเงิน งาน หรือความสัมพันธ์",
];

export default function ResponsiblePage() {
  return (
    <main>
      <Topbar title="เล่นอย่างมีความรับผิดชอบ" />
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
        {/* Hero */}
        <section className="glass glow-green p-5">
          <h1 className="flex items-center gap-2 text-[18px] font-extrabold text-[var(--text-primary)]">
            <HeartHandshake size={18} className="text-[var(--neon-green)]" /> เล่นอย่างมีความรับผิดชอบ
          </h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
            {SITE_NAME} เป็นเว็บ <b className="text-[var(--text-primary)]">วิเคราะห์ข้อมูลฟุตบอลด้วย AI</b>{" "}
            เพื่อข้อมูลและความบันเทิงเท่านั้น — เราไม่รับเดิมพันและไม่ชักชวนให้พนัน
            เนื้อหาเหมาะกับผู้มีอายุ <b className="text-[var(--text-primary)]">18 ปีขึ้นไป</b>
          </p>
        </section>

        {/* Principles */}
        <section className="glass p-5">
          <h2 className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
            <CheckCircle2 size={15} className="text-[var(--neon-green)]" /> หลักการเล่นอย่างมีสติ
          </h2>
          <ul className="mt-3 space-y-2">
            {PRINCIPLES.map((p) => (
              <li key={p} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--neon-green)]" />
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* Warning signs */}
        <section className="glass p-5">
          <h2 className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
            <TriangleAlert size={15} className="text-[var(--warning)]" /> สัญญาณเตือนปัญหาการพนัน
          </h2>
          <ul className="mt-3 space-y-2">
            {SIGNS.map((s) => (
              <li key={s} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                <TriangleAlert size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" />
                {s}
              </li>
            ))}
          </ul>
        </section>

        {/* Help */}
        <section className="rounded-xl border border-[rgba(255,77,94,0.4)] bg-[rgba(255,77,94,0.06)] p-5">
          <h2 className="text-[13px] font-bold text-[var(--danger)]">ขอความช่วยเหลือ</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
            หากคุณหรือคนใกล้ตัวเริ่มมีสัญญาณข้างต้น โปรดหยุดพักและขอคำปรึกษา —
            พูดคุยกับคนที่ไว้ใจ หรือติดต่อสายด่วนสุขภาพจิต <b className="text-[var(--text-primary)]">1323</b>{" "}
            (กรมสุขภาพจิต ให้บริการฟรี 24 ชม.) การขอความช่วยเหลือไม่ใช่เรื่องน่าอาย
          </p>
        </section>

        <section className="rounded-xl border border-[var(--border)] p-4 text-[12px] text-[var(--text-muted)]">
          ดูเพิ่มเติม:{" "}
          <Link href="/terms" className="text-[var(--neon-green)] hover:underline">เงื่อนไขการใช้งาน</Link>{" · "}
          <Link href="/privacy" className="text-[var(--neon-green)] hover:underline">นโยบายความเป็นส่วนตัว</Link>
        </section>
      </div>
    </main>
  );
}
