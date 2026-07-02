"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * - ลงทะเบียน service worker (ให้เป็น PWA ติดตั้งได้ + มี offline)
 * - โชว์ปุ่ม "ติดตั้งแอป" เมื่อเบราว์เซอร์พร้อม (beforeinstallprompt — Android/Chrome/Edge)
 * - iOS ไม่มี event นี้ → โชว์คำแนะนำ "แชร์ → เพิ่มลงหน้าจอโฮม" แทน
 * - ติดตั้งแล้ว/ปิดแล้ว = ไม่โชว์อีก
 */
interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ballai_install_dismissed_v1";

export function InstallApp() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // ลงทะเบียน SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const raf = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {
        return;
      }
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      if (standalone) return; // ติดตั้งแล้ว

      setDismissed(false);
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIos) setShowIosHint(true);
    });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // best-effort
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    close();
  };

  // แสดงเมื่อ: ยังไม่ปิด และ (มี prompt ของ Android หรือเป็น iOS)
  if (dismissed || (!deferred && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md lg:bottom-4 lg:left-64 lg:right-auto lg:w-80">
      <div className="glass glow-green flex items-center gap-3 rounded-2xl border border-[var(--border-glow-green)] p-3 shadow-xl">
        <Download size={20} className="shrink-0 text-[var(--neon-green)]" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-[var(--text-primary)]">ติดตั้ง BALLAI365</p>
          {deferred ? (
            <p className="text-[11px] text-[var(--text-muted)]">เปิดเร็วขึ้น เหมือนแอปจริง</p>
          ) : (
            <p className="text-[11px] leading-snug text-[var(--text-muted)]">
              กด <b>แชร์</b> ด้านล่าง แล้วเลือก <b>“เพิ่มลงในหน้าจอโฮม”</b>
            </p>
          )}
        </div>
        {deferred && (
          <button
            onClick={install}
            className="shrink-0 rounded-lg bg-[var(--neon-green)] px-3 py-1.5 text-[12px] font-extrabold text-[#04120a]"
          >
            ติดตั้ง
          </button>
        )}
        <button onClick={close} aria-label="ปิด" className="shrink-0 text-[var(--text-muted)]">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
