import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Database,
  ShieldCheck,
  Lock,
  Gauge,
  TrendingUp,
  CheckCircle2,
  CloudRain,
  BarChart3,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "เกี่ยวกับเรา",
  description: `${SITE_NAME} วิเคราะห์ฟุตบอลด้วย AI จากข้อมูลจริง — อธิบายวิธีทำงาน แหล่งข้อมูล และความหมายของแต่ละค่า`,
};

const STEPS: { icon: typeof Brain; title: string; desc: string }[] = [
  {
    icon: Database,
    title: "1. รวบรวมข้อมูลจริง",
    desc: "ดึงฟอร์มล่าสุด สถิติทีม หัวต่อหัว (H2H) ราคาต่อรองจากเจ้ามือ รายชื่อตัวจริง อาการบาดเจ็บ และสภาพอากาศ ของแต่ละคู่",
  },
  {
    icon: Brain,
    title: "2. AI วิเคราะห์",
    desc: "ส่งข้อมูลทั้งหมดให้ Claude AI พิจารณาอย่างเป็นกลาง ทายผล สกอร์ แฮนดิแคป สูง/ต่ำ และเตะมุม พร้อมเหตุผลประกอบ",
  },
  {
    icon: Lock,
    title: "3. ล็อกคำทาย",
    desc: "คำทายถูกบันทึกและล็อกครั้งแรก — ไม่แก้ย้อนหลังให้ตรงผล เพื่อความโปร่งใส ตรวจสอบได้จริง",
  },
  {
    icon: BarChart3,
    title: "4. วัดผลย้อนหลัง",
    desc: "หลังแข่งจบ ระบบเทียบคำทายกับผลจริง บันทึกเป็นสถิติความแม่นยำที่เปิดให้ดูได้ทุกคน",
  },
];

const SOURCES: { icon: typeof Database; title: string; desc: string }[] = [
  { icon: Database, title: "API-Football", desc: "ฟอร์ม สถิติ ตัวจริง ผลสด" },
  { icon: TrendingUp, title: "ราคาเจ้ามือ", desc: "แฮนดิแคป · สูง/ต่ำ · 1X2" },
  { icon: CloudRain, title: "OpenWeather", desc: "สภาพอากาศสนามแข่ง" },
];

const METRICS: { icon: typeof Gauge; term: string; desc: string }[] = [
  { icon: Gauge, term: "AI Score", desc: "คะแนนความน่าสนใจของคู่นั้นโดยรวม (0-100)" },
  { icon: CheckCircle2, term: "ความมั่นใจ", desc: "ระดับความเชื่อมั่นของ AI ต่อคำทาย (ต่ำ/กลาง/สูง)" },
  { icon: TrendingUp, term: "Value", desc: "โอกาสที่ราคาคุ้มค่ากว่าความน่าจะเป็นจริง" },
  { icon: BarChart3, term: "Data Quality", desc: "ความครบของข้อมูล — ยิ่งสูงยิ่งเชื่อถือได้ (เจ้ามือยังไม่เปิดราคา = ต่ำ)" },
];

export default function AboutPage() {
  return (
    <main>
      <Topbar title="เกี่ยวกับเรา" />
      <div className="space-y-5 p-4 lg:p-6">
        {/* Hero */}
        <section className="glass glow-green p-5 lg:p-6">
          <h1 className="text-[20px] font-extrabold tracking-tight text-[var(--text-primary)]">
            {SITE_NAME}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--neon-green)]">{SITE_TAGLINE}</p>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {SITE_NAME} คือแพลตฟอร์มวิเคราะห์ฟุตบอลด้วย AI ที่ยึดหลัก{" "}
            <b className="text-[var(--text-primary)]">ข้อมูลจริงและความโปร่งใส</b> — เราไม่เดา
            ไม่มั่ว ข้อมูลไหนไม่มีก็บอกตรง ๆ และคำทายทุกอันตรวจสอบย้อนหลังได้
          </p>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20">
          <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[var(--text-primary)]">
            <Brain size={16} className="text-[var(--neon-green)]" /> AI ทำงานอย่างไร
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.title} className="glass p-4">
                <s.icon size={18} className="text-[var(--soft-purple)]" />
                <p className="mt-2 text-[13px] font-bold text-[var(--text-primary)]">{s.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Data sources */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[var(--text-primary)]">
            <Database size={16} className="text-[var(--neon-green)]" /> แหล่งข้อมูล
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {SOURCES.map((s) => (
              <div key={s.title} className="glass p-4">
                <s.icon size={18} className="text-[var(--soft-purple)]" />
                <p className="mt-2 text-[13px] font-bold text-[var(--text-primary)]">{s.title}</p>
                <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Metrics glossary */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[var(--text-primary)]">
            <Gauge size={16} className="text-[var(--neon-green)]" /> ค่าต่าง ๆ หมายถึงอะไร
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {METRICS.map((m) => (
              <div key={m.term} className="glass flex gap-3 p-4">
                <m.icon size={18} className="mt-0.5 shrink-0 text-[var(--soft-purple)]" />
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">{m.term}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {m.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section className="glass p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-bold text-[var(--text-primary)]">
            <ShieldCheck size={16} className="text-[var(--neon-green)]" /> ความโปร่งใส
          </h2>
          <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
            <li>• <b className="text-[var(--text-primary)]">ล็อกคำทาย</b> — บันทึกครั้งแรก ไม่แก้ย้อนหลัง</li>
            <li>• <b className="text-[var(--text-primary)]">ข้อมูลซื่อตรง</b> — ไม่มีก็ขึ้น “Missing Data” ไม่เดามั่ว</li>
            <li>
              • <b className="text-[var(--text-primary)]">วัดผลจริง</b> — ดูสถิติความแม่นได้ที่{" "}
              <Link href="/backtest" className="text-[var(--neon-green)] hover:underline">
                หน้าความแม่นยำย้อนหลัง
              </Link>
            </li>
          </ul>
        </section>

        {/* Disclaimer */}
        <section className="rounded-xl border border-[var(--border)] p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[var(--text-muted)]">
            <ShieldCheck size={13} /> 18+ · เพื่อข้อมูลและความบันเทิงเท่านั้น
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
            การวิเคราะห์ทั้งหมดเป็นการประเมินจากสถิติและ AI เท่านั้น
            ผลการแข่งขันฟุตบอลมีความไม่แน่นอน ไม่ใช่การรับประกันผล
            เนื้อหานี้เพื่อข้อมูลและความบันเทิงเท่านั้น โปรดใช้วิจารณญาณ
          </p>
        </section>
      </div>
    </main>
  );
}
