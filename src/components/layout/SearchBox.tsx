"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Radio } from "lucide-react";
import type { SearchMatchHit, SearchTeamHit } from "@/app/api/search/route";

/**
 * ช่องค้นหา Topbar — พิมพ์แล้วเจอทั้งแมตช์ในโปรแกรมวันนี้/พรุ่งนี้ และทีมจาก API
 * (debounce 350ms · Esc ปิด · Enter ไปหน้าค้นหาทีมเต็ม)
 */
export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<SearchMatchHit[]>([]);
  const [teams, setTeams] = useState<SearchTeamHit[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  // ค้นหาแบบ debounce — ยกเลิกคำค้นเก่าเมื่อพิมพ์ต่อ (เรียกจาก event handler)
  const schedule = useCallback((raw: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    ctrlRef.current?.abort();
    const query = raw.trim();
    if (query.length < 2) {
      setMatches([]);
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        });
        const data = (await res.json()) as {
          matches: SearchMatchHit[];
          teams: SearchTeamHit[];
        };
        setMatches(data.matches ?? []);
        setTeams(data.teams ?? []);
        setLoading(false);
      } catch {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
  }, []);

  // ยกเลิกงานค้างตอน unmount
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ctrlRef.current?.abort();
    },
    []
  );

  // คลิกนอกกล่อง → ปิด
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  const hasResults = matches.length > 0 || teams.length > 0;

  return (
    <div ref={boxRef} className="relative hidden md:block">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          schedule(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && q.trim().length >= 3)
            go(`/team-stats?q=${encodeURIComponent(q.trim())}`);
        }}
        placeholder="ค้นหาทีมหรือคู่แข่ง..."
        className="w-56 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] py-1.5 pl-8 pr-3 text-[12px] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-glow-blue)] lg:w-64"
      />
      {loading && (
        <Loader2
          size={13}
          className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--text-muted)]"
        />
      )}

      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-deep)]/95 shadow-2xl backdrop-blur-xl">
          {!loading && !hasResults && (
            <p className="p-4 text-center text-[12px] text-[var(--text-muted)]">
              ไม่พบ &ldquo;{q.trim()}&rdquo; ในโปรแกรมวันนี้/พรุ่งนี้
              {q.trim().length < 3 && " — พิมพ์ ≥3 ตัวอักษรเพื่อค้นทีมทั้งหมด"}
            </p>
          )}

          {matches.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                แมตช์วันนี้ / พรุ่งนี้
              </p>
              {matches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => go(`/match/${m.id}`)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--bg-elevated)]"
                >
                  <span className="flex shrink-0 items-center gap-1">
                    {m.homeLogo && <img src={m.homeLogo} alt="" width={16} height={16} loading="lazy" />}
                    {m.awayLogo && <img src={m.awayLogo} alt="" width={16} height={16} loading="lazy" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold">
                      {m.home} vs {m.away}
                    </span>
                    <span className="block truncate text-[10px] text-[var(--text-muted)]">{m.league}</span>
                  </span>
                  <span className="tabular shrink-0 text-[11px] text-[var(--text-muted)]">
                    {m.status === "LIVE" ? (
                      <span className="flex items-center gap-1 font-bold text-[var(--danger)]">
                        <Radio size={10} className="animate-pulse" /> LIVE
                      </span>
                    ) : (
                      `${m.day === "tomorrow" ? "พรุ่งนี้ " : ""}${m.kickoffLabel}`
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}

          {teams.length > 0 && (
            <div className="border-t border-[var(--border-subtle)]">
              <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                ทีม — ดูสถิติ
              </p>
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => go(`/team-stats?team=${t.id}`)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--bg-elevated)]"
                >
                  {t.logo && <img src={t.logo} alt="" width={18} height={18} loading="lazy" className="shrink-0" />}
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{t.name}</span>
                  <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                    {t.country ?? ""}{t.national ? " · ทีมชาติ" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
