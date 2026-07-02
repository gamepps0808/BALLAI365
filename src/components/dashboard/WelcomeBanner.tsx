"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, CheckCircle2 } from "lucide-react";

/**
 * แถบต้อนรับ "ครั้งแรกเท่านั้น" — บอกใน 3 วินาทีว่าเว็บนี้คืออะไร + ทำไมต้องเชื่อ
 * ปิดแล้วจำใน localStorage ไม่โผล่อีก (คนเก่าไม่เห็นเลย ไม่รก)
 */
const KEY = "ballai_welcomed_v1";

export function WelcomeBanner({
  accuracyPct,
  gradedCount,
}: {
  accuracyPct: number | null;
  gradedCount: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // setState ผ่าน rAF — ไม่ยิง setState sync ใน effect (กติกา lint react)
    const raf = requestAnimationFrame(() => {
      try {
        if (!localStorage.getItem(KEY)) setShow(true);
      } catch {
        // private mode — ไม่โชว์ดีกว่าโชว์ทุกครั้ง
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // best-effort
    }
  };

  if (!show) return null;

  const points = [
    "ทายล่วงหน้า ล็อกคำทาย ไม่แก้ย้อนหลัง",
    accuracyPct != null && gradedCount >= 10
      ? `วัดผลจริงทุกคู่ — แม่น ${accuracyPct}% จาก ${gradedCount} คู่ที่ตัดสินแล้ว`
      : "วัดผลจริงทุกคู่ ตรวจสอบย้อนหลังได้",
    "ข้อมูลไม่มี = บอกตรง ๆ ไม่เดามั่ว",
  ];

  return (
    <section className="animate-fade-up relative overflow-hidden rounded-2xl border border-[var(--border-glow-green)] bg-[var(--neon-green-soft)] p-4">
      <button
        onClick={dismiss}
        aria-label="ปิด"
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
      >
        <X size={15} />
      </button>
      <h2 className="flex items-center gap-1.5 pr-8 text-[14px] font-extrabold text-[var(--text-primary)]">
        <Sparkles size={15} className="text-[var(--neon-green)]" />
        วิเคราะห์บอลด้วย AI จากข้อมูลจริง
      </h2>
      <ul className="mt-2 space-y-1">
        {points.map((t) => (
          <li
            key={t}
            className="flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--text-secondary)]"
          >
            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[var(--neon-green)]" />
            {t}
          </li>
        ))}
      </ul>
      <Link
        href="/about"
        className="mt-2.5 inline-block text-[12px] font-bold text-[var(--neon-green)] hover:underline"
      >
        AI ทำงานยังไง →
      </Link>
    </section>
  );
}
