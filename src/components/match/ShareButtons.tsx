"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

/**
 * ปุ่มแชร์คำทาย — LINE / Facebook / คัดลอกลิงก์ (มือถือมี native share ให้ด้วย)
 * ไม่ส่ง path = แชร์หน้าปัจจุบัน · ส่ง path (เช่น /match/af-123) = แชร์หน้านั้นจากที่ไหนก็ได้
 * รูป preview ใช้ OG image ที่มีอยู่แล้ว
 */
export function ShareButtons({ title, path }: { title: string; path?: string }) {
  const [copied, setCopied] = useState(false);

  const pageUrl = () =>
    path ? `${window.location.origin}${path}` : window.location.href.split("#")[0];

  const shareLine = () =>
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(pageUrl())}`,
      "_blank",
      "noopener,width=560,height=630"
    );

  const shareFacebook = () =>
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl())}`,
      "_blank",
      "noopener,width=560,height=630"
    );

  const nativeOrCopy = async () => {
    if (navigator.share) {
      await navigator.share({ title, url: pageUrl() }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(pageUrl()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const btn =
    "inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] font-bold transition hover:border-[var(--border-glow-green)]";

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={shareLine} className={`${btn} text-[#06c755]`} aria-label="แชร์ผ่าน LINE">
        LINE
      </button>
      <button
        onClick={shareFacebook}
        className={`${btn} text-[#1877f2]`}
        aria-label="แชร์ผ่าน Facebook"
      >
        <Share2 size={12} /> แชร์
      </button>
      <button
        onClick={nativeOrCopy}
        className={`${btn} text-[var(--text-secondary)]`}
        aria-label="คัดลอกลิงก์"
      >
        {copied ? <Check size={12} className="text-[var(--neon-green)]" /> : <Link2 size={12} />}
        {copied ? "คัดลอกแล้ว" : "ลิงก์"}
      </button>
    </div>
  );
}
