import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว",
  description: `นโยบายความเป็นส่วนตัวของ ${SITE_NAME} — ข้อมูลที่เก็บ การใช้งาน และสิทธิของผู้ใช้`,
};

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. ข้อมูลที่เราเก็บ",
    body: `${SITE_NAME} เก็บข้อมูลเท่าที่จำเป็น: การตั้งค่าและรายการโปรดจะถูกเก็บไว้ใน "เครื่องของคุณ" (local storage) เป็นหลัก และข้อมูลการเข้าชมแบบไม่ระบุตัวตนเพื่อปรับปรุงบริการ เราไม่ได้บังคับให้กรอกข้อมูลส่วนตัวเพื่อดูเนื้อหา`,
  },
  {
    title: "2. คุกกี้และที่เก็บข้อมูลในเครื่อง",
    body: `เราใช้ local storage / คุกกี้พื้นฐานเพื่อจำการตั้งค่า ธีม และรายการโปรด คุณสามารถล้างได้จากเบราว์เซอร์ของคุณเอง`,
  },
  {
    title: "3. การใช้ข้อมูล",
    body: `ข้อมูลใช้เพื่อให้บริการทำงานได้ จำการตั้งค่าของคุณ และวิเคราะห์ภาพรวมการใช้งานเพื่อพัฒนาเว็บไซต์เท่านั้น`,
  },
  {
    title: "4. บุคคลที่สาม",
    body: `เราใช้ผู้ให้บริการข้อมูลกีฬา (เช่น API-Football) และระบบ AI ในการประมวลผลข้อมูลการแข่งขัน เราไม่ขายหรือให้เช่าข้อมูลส่วนตัวของคุณแก่บุคคลที่สามเพื่อการตลาด`,
  },
  {
    title: "5. ความปลอดภัย",
    body: `เราดูแลระบบด้วยมาตรการที่สมเหตุสมผล อย่างไรก็ตามไม่มีระบบใดปลอดภัย 100% โปรดใช้งานอย่างระมัดระวัง`,
  },
  {
    title: "6. สิทธิของผู้ใช้",
    body: `คุณสามารถล้างข้อมูลที่เก็บในเครื่องได้ตลอดเวลาผ่านเบราว์เซอร์ และเลือกที่จะไม่ให้ข้อมูลส่วนตัวใด ๆ ก็ยังใช้เนื้อหาหลักได้`,
  },
];

export default function PrivacyPage() {
  return (
    <main>
      <Topbar title="นโยบายความเป็นส่วนตัว" />
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
        <section className="glass p-5">
          <h1 className="flex items-center gap-2 text-[18px] font-extrabold text-[var(--text-primary)]">
            <ShieldCheck size={18} className="text-[var(--neon-green)]" /> นโยบายความเป็นส่วนตัว
          </h1>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">ปรับปรุงล่าสุด: มิถุนายน 2569</p>
        </section>

        {SECTIONS.map((s) => (
          <section key={s.title} className="glass p-5">
            <h2 className="text-[13px] font-bold text-[var(--text-primary)]">{s.title}</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">{s.body}</p>
          </section>
        ))}

        <section className="rounded-xl border border-[var(--border)] p-4 text-[12px] text-[var(--text-muted)]">
          ดูเพิ่มเติม:{" "}
          <Link href="/terms" className="text-[var(--neon-green)] hover:underline">เงื่อนไขการใช้งาน</Link>
        </section>
      </div>
    </main>
  );
}
