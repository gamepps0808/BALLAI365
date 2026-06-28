import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "เงื่อนไขการใช้งาน",
  description: `เงื่อนไขการใช้งาน ${SITE_NAME} — บริการวิเคราะห์ฟุตบอลด้วย AI เพื่อข้อมูลและความบันเทิงเท่านั้น`,
};

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. การยอมรับเงื่อนไข",
    body: `การเข้าใช้งาน ${SITE_NAME} ถือว่าคุณยอมรับเงื่อนไขทั้งหมดนี้ หากไม่ยอมรับ กรุณางดใช้งานเว็บไซต์`,
  },
  {
    title: "2. ลักษณะของบริการ",
    body: `${SITE_NAME} ให้บริการวิเคราะห์ฟุตบอลด้วย AI จากข้อมูลสถิติ เพื่อ "ข้อมูลและความบันเทิง" เท่านั้น — ไม่ใช่คำแนะนำหรือชักชวนการพนัน และไม่รับประกันผลการแข่งขัน ผลฟุตบอลมีความไม่แน่นอนเสมอ`,
  },
  {
    title: "3. อายุผู้ใช้งาน",
    body: `เนื้อหาบางส่วนเกี่ยวข้องกับราคาต่อรอง เหมาะสำหรับผู้ที่มีอายุ 18 ปีขึ้นไปเท่านั้น`,
  },
  {
    title: "4. ความรับผิดชอบของผู้ใช้",
    body: `การตัดสินใจใด ๆ จากข้อมูลในเว็บไซต์เป็นความรับผิดชอบของผู้ใช้เองทั้งหมด โปรดใช้วิจารณญาณในการตัดสินใจ`,
  },
  {
    title: "5. ทรัพย์สินทางปัญญา",
    body: `เนื้อหา การออกแบบ และระบบวิเคราะห์ของเว็บไซต์เป็นกรรมสิทธิ์ของ ${SITE_NAME} ห้ามคัดลอกหรือนำไปใช้เชิงพาณิชย์โดยไม่ได้รับอนุญาต`,
  },
  {
    title: "6. ข้อจำกัดความรับผิด",
    body: `${SITE_NAME} จะไม่รับผิดต่อความเสียหายใด ๆ ที่เกิดจากการใช้หรือไม่สามารถใช้ข้อมูลในเว็บไซต์ ข้อมูลอาจมีความคลาดเคลื่อนหรือไม่ครบถ้วนได้`,
  },
  {
    title: "7. การเปลี่ยนแปลงเงื่อนไข",
    body: `เราอาจปรับปรุงเงื่อนไขนี้เป็นครั้งคราว การใช้งานต่อหลังการเปลี่ยนแปลงถือว่ายอมรับเงื่อนไขใหม่`,
  },
];

export default function TermsPage() {
  return (
    <main>
      <Topbar title="เงื่อนไขการใช้งาน" />
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
        <section className="glass p-5">
          <h1 className="flex items-center gap-2 text-[18px] font-extrabold text-[var(--text-primary)]">
            <FileText size={18} className="text-[var(--neon-green)]" /> เงื่อนไขการใช้งาน
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
          <Link href="/privacy" className="text-[var(--neon-green)] hover:underline">นโยบายความเป็นส่วนตัว</Link>
        </section>
      </div>
    </main>
  );
}
