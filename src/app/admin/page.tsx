"use client";

import { useEffect, useState } from "react";
import {
  KeyRound,
  Sliders,
  ToggleLeft,
  Activity,
  RefreshCw,
  Database,
  Save,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Badge } from "@/components/ui/Badge";
import { ModelWeights } from "@/lib/types";
import type { AppSettings } from "@/lib/settings";

const weightLabels: Record<keyof ModelWeights, string> = {
  teamForm: "Team Form",
  homeAwayStrength: "Home/Away Strength",
  attackDefense: "Attack/Defense Stats",
  injuries: "Injuries & Suspensions",
  oddsMovement: "Odds Movement",
  headToHead: "Head to Head",
  cornerTrend: "Corner Trend",
  weatherTravelFatigue: "Weather / Travel / Fatigue",
};

/** ลีกที่เปิด/ปิดได้ — ชื่อต้องตรงกับ leagueName ของ API (ใช้กรองการคัดคู่ใหญ่) */
const TOGGLABLE_LEAGUES = [
  { name: "Premier League", th: "พรีเมียร์ลีก", country: "England" },
  { name: "La Liga", th: "ลาลีกา", country: "Spain" },
  { name: "Bundesliga", th: "บุนเดสลีกา", country: "Germany" },
  { name: "Serie A", th: "เซเรีย อา", country: "Italy" },
  { name: "Ligue 1", th: "ลีกเอิง", country: "France" },
  { name: "UEFA Champions League", th: "ยูฟ่าแชมเปียนส์ลีก", country: "Europe" },
  { name: "UEFA Europa League", th: "ยูโรปาลีก", country: "Europe" },
  { name: "Friendlies", th: "กระชับมิตรทีมชาติ", country: "World" },
];

interface SystemInfo {
  provider: string;
  keys: Record<string, boolean>;
  savedAnalyses: number;
  ledger: { settled: number; pending: number; overallPct: number | null };
  cacheEntries: number;
  lastRefresh: string | null;
  refreshSchedule: string;
}

export default function AdminPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"refresh" | "cache" | "reanalyze" | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  // null = กำลังเช็คสิทธิ์, false = ต้องใส่รหัส, true = เข้าได้
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [secretInput, setSecretInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  async function loadData(): Promise<boolean> {
    const [sRes, sysRes] = await Promise.all([
      fetch("/api/admin/settings"),
      fetch("/api/admin/system"),
    ]);
    if (sRes.status === 401 || sysRes.status === 401) return false;
    const [s, sys] = await Promise.all([sRes.json(), sysRes.json()]);
    setSettings(s.data);
    setSystem(sys.data);
    return true;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ok = await loadData();
        if (!cancelled) setAuthed(ok);
      } catch {
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login() {
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secretInput.trim() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setLoginError(j.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }
    setSecretInput("");
    setAuthed(await loadData());
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setNote(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      setSettings(json.data);
      setNote({ ok: true, text: "เซฟแล้ว — มีผลกับรอบรีเฟรชถัดไปทันที ไม่ต้องรีสตาร์ท" });
    } else {
      setNote({ ok: false, text: json.error ?? "เซฟไม่สำเร็จ" });
    }
  }

  async function forceRefresh() {
    setBusy("refresh");
    setNote(null);
    try {
      const res = await fetch("/api/cron/refresh");
      const json = await res.json();
      setNote(
        json.ok
          ? {
              ok: true,
              text: `รีเฟรชสำเร็จใน ${Math.round((json.tookMs ?? 0) / 1000)} วิ — วันนี้ ${json.todayAllMatches} คู่ / พรุ่งนี้ ${json.newDayAllMatches} คู่ · ตัดสินคำทายเพิ่ม ${json.settledPredictions ?? 0} คู่`,
            }
          : { ok: false, text: `รีเฟรชมีปัญหา: ${json.error ?? "ไม่ทราบสาเหตุ"}` }
      );
      const sys = await fetch("/api/admin/system").then((r) => r.json());
      setSystem(sys.data);
    } catch (err) {
      setNote({ ok: false, text: `รีเฟรชล้มเหลว: ${(err as Error).message}` });
    }
    setBusy(null);
  }

  async function reanalyze() {
    setBusy("reanalyze");
    setNote(null);
    try {
      const res = await fetch("/api/admin/reanalyze", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setNote({
          ok: true,
          text: `วิเคราะห์ใหม่สำเร็จ — ลบผลเก่า ${json.data.cleared} คู่ (ยังไม่เตะ) แล้ววิเคราะห์ใหม่ด้วย logic ล่าสุด (Claude ตัดสินแฮนดิแคปเอง)`,
        });
        const sys = await fetch("/api/admin/system").then((r) => r.json());
        setSystem(sys.data);
      } else {
        setNote({ ok: false, text: json.error ?? "วิเคราะห์ใหม่ไม่สำเร็จ" });
      }
    } catch (err) {
      setNote({ ok: false, text: `วิเคราะห์ใหม่ล้มเหลว: ${(err as Error).message}` });
    }
    setBusy(null);
  }

  async function clearCache() {
    setBusy("cache");
    setNote(null);
    try {
      const res = await fetch("/api/admin/clear-cache", { method: "POST" });
      const json = await res.json();
      setNote({
        ok: true,
        text: `ล้าง cache แล้ว ${json.data.cleared} รายการ — หน้าถัดไปจะดึงข้อมูลสดจาก API`,
      });
      const sys = await fetch("/api/admin/system").then((r) => r.json());
      setSystem(sys.data);
    } catch (err) {
      setNote({ ok: false, text: `ล้าง cache ล้มเหลว: ${(err as Error).message}` });
    }
    setBusy(null);
  }

  if (authed === false) {
    return (
      <main>
        <Topbar title="Admin Panel" />
        <div className="flex justify-center p-10 lg:p-16">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void login();
            }}
            className="glass w-full max-w-sm space-y-3 p-6"
          >
            <h2 className="flex items-center gap-2 text-[14px] font-extrabold tracking-wider">
              <KeyRound size={16} className="text-[var(--warning)]" /> เฉพาะผู้ดูแลระบบ
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              ใส่รหัสผู้ดูแล (ADMIN_SECRET ในไฟล์ .env ของเซิร์ฟเวอร์)
            </p>
            <input
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="รหัสผู้ดูแล..."
              autoFocus
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-glow-blue)]"
            />
            {loginError && <p className="text-[12px] text-[var(--danger)]">{loginError}</p>}
            <button
              type="submit"
              disabled={secretInput.trim().length === 0}
              className="w-full rounded-lg bg-[var(--neon-blue)] py-2.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!settings || !system) {
    return (
      <main>
        <Topbar title="Admin Panel" />
        <div className="flex items-center justify-center gap-2 p-16 text-[13px] text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" /> กำลังโหลดการตั้งค่า...
        </div>
      </main>
    );
  }

  const weightTotal = Object.values(settings.weights).reduce((a, b) => a + b, 0);

  return (
    <main>
      <Topbar title="Admin Panel" />
      <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-6">
        {note && (
          <div
            className={`lg:col-span-2 glass p-3.5 text-[12px] ${
              note.ok
                ? "border-[rgba(63,185,80,0.4)] text-[var(--neon-green)]"
                : "border-[rgba(255,77,94,0.4)] text-[var(--danger)]"
            }`}
          >
            {note.text}
          </div>
        )}

        {/* API Keys — สถานะอย่างเดียว ไม่รับคีย์ผ่านเว็บ */}
        <section className="glass p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-wider">
            <KeyRound size={15} className="text-[var(--neon-blue)]" /> API KEYS
          </h2>
          <div className="mt-3 space-y-2">
            {Object.entries(system.keys).map(([k, configured]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2.5 text-[12px]"
              >
                <span className="font-mono text-[11px]">{k}</span>
                {configured ? (
                  <Badge tone="green">ตั้งค่าแล้ว</Badge>
                ) : (
                  <Badge tone="red">ยังไม่ตั้งค่า</Badge>
                )}
              </div>
            ))}
            <p className="text-[11px] text-[var(--text-secondary)]">
              Provider ปัจจุบัน: <Badge tone="blue">{system.provider.toUpperCase()}</Badge>
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              เพื่อความปลอดภัย แก้คีย์ได้ที่ไฟล์{" "}
              <code className="text-[var(--neon-blue)]">.env</code> เท่านั้น —
              เว็บไม่รับ/ไม่แสดงค่าคีย์
            </p>
          </div>
        </section>

        {/* คุมงบ AI + API */}
        <section className="glass p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-wider">
            <Sliders size={15} className="text-[var(--neon-green)]" /> งบวิเคราะห์ต่อวัน
          </h2>
          <div className="mt-3 space-y-4">
            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  คู่ที่ให้ Claude วิเคราะห์เชิงลึก (คุมค่า token)
                </span>
                <span className="tabular font-bold">{settings.claudeLimit} คู่</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={settings.claudeLimit}
                onChange={(e) =>
                  setSettings({ ...settings, claudeLimit: Number(e.target.value) })
                }
                className="w-full accent-[var(--neon-green)]"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  คู่ที่ดึงข้อมูลเชิงลึกจาก API (คุมโควตา request)
                </span>
                <span className="tabular font-bold">{settings.detailLimit} คู่</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={settings.detailLimit}
                onChange={(e) =>
                  setSettings({ ...settings, detailLimit: Number(e.target.value) })
                }
                className="w-full accent-[var(--neon-blue)]"
              />
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              มีผลจริงกับรอบรีเฟรชถัดไป — ลดลงเพื่อประหยัด เพิ่มเมื่อต้องการครอบคลุมมากขึ้น
            </p>
          </div>
        </section>

        {/* เปิด/ปิดลีก */}
        <section className="glass p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-wider">
            <ToggleLeft size={15} className="text-[var(--soft-purple)]" /> เปิด/ปิดลีก
            (การคัดคู่ใหญ่)
          </h2>
          <div className="mt-3 space-y-2">
            {TOGGLABLE_LEAGUES.map((l) => {
              const enabled = !settings.disabledLeagues.includes(l.name);
              return (
                <label
                  key={l.name}
                  className="flex cursor-pointer items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-[12px]"
                >
                  <span>
                    {l.th} <span className="text-[var(--text-muted)]">({l.country})</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() =>
                      setSettings({
                        ...settings,
                        disabledLeagues: enabled
                          ? [...settings.disabledLeagues, l.name]
                          : settings.disabledLeagues.filter((n) => n !== l.name),
                      })
                    }
                    className="h-4 w-4 accent-[var(--neon-green)]"
                  />
                </label>
              );
            })}
            <p className="text-[11px] text-[var(--text-muted)]">
              ลีกที่ปิดจะไม่ถูกคัดเป็น &ldquo;คู่ใหญ่&rdquo; ให้ AI วิเคราะห์ในรอบถัดไป
              (ยังแสดงในแมตช์วันนี้/ผลบอลตามปกติ) — บอลโลก/ยูโร/โคปาถูกเลือกเสมอ
            </p>
          </div>
        </section>

        {/* AI Score Weights — โหมด Mock เท่านั้น */}
        <section className="glass p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-wider">
            <Sliders size={15} className="text-[var(--warning)]" /> AI SCORE WEIGHTS
            <Badge tone="muted">ใช้กับโหมด MOCK เท่านั้น</Badge>
          </h2>
          <div className="mt-3 space-y-2.5">
            {(Object.keys(settings.weights) as (keyof ModelWeights)[]).map((k) => (
              <div key={k}>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--text-secondary)]">{weightLabels[k]}</span>
                  <span className="tabular font-bold">{settings.weights[k]}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={settings.weights[k]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      weights: { ...settings.weights, [k]: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[var(--warning)]"
                />
              </div>
            ))}
            <p
              className={`text-[11px] font-semibold ${
                weightTotal === 100 ? "text-[var(--neon-green)]" : "text-[var(--danger)]"
              }`}
            >
              รวม {weightTotal}% {weightTotal !== 100 && "— น้ำหนักต้องรวมเป็น 100%"}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              โหมด API-Football ใช้สูตรน้ำหนักตามสเปก (teamStats 25 / form 20 / h2h 15 /
              odds 15 / predictions 15 / lineups 10) — ปรับไม่ได้เพื่อความสม่ำเสมอของสถิติความแม่น
            </p>
          </div>
        </section>

        {/* System จริง */}
        <section className="glass space-y-4 p-4 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold tracking-wider">
            <Activity size={15} className="text-[var(--warning)]" /> SYSTEM
          </h2>
          <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-3 lg:grid-cols-5">
            <div className="glass p-3">
              <p className="text-[var(--text-muted)]">ผลวิเคราะห์ที่เซฟไว้</p>
              <p className="tabular text-lg font-bold">{system.savedAnalyses} คู่</p>
            </div>
            <div className="glass p-3">
              <p className="text-[var(--text-muted)]">คำทายตัดสินแล้ว</p>
              <p className="tabular text-lg font-bold">
                {system.ledger.settled} คู่
                {system.ledger.overallPct != null && (
                  <span className="ml-1 text-[11px] text-[var(--neon-green)]">
                    แม่น {system.ledger.overallPct}%
                  </span>
                )}
              </p>
            </div>
            <div className="glass p-3">
              <p className="text-[var(--text-muted)]">รอตัดสิน</p>
              <p className="tabular text-lg font-bold">{system.ledger.pending} คู่</p>
            </div>
            <div className="glass p-3">
              <p className="text-[var(--text-muted)]">Cache ในหน่วยความจำ</p>
              <p className="tabular text-lg font-bold">{system.cacheEntries} รายการ</p>
            </div>
            <div className="glass p-3">
              <p className="text-[var(--text-muted)]">รีเฟรชรอบล่าสุด</p>
              <p className="tabular text-[13px] font-bold">
                {system.lastRefresh
                  ? new Date(system.lastRefresh).toLocaleString("th-TH", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "ยังไม่เคย"}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">{system.refreshSchedule}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={save}
              disabled={saving || weightTotal !== 100}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--neon-green)] px-5 py-2 text-[12px] font-semibold text-black hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              เซฟการตั้งค่า
            </button>
            <button
              onClick={forceRefresh}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--neon-blue)] px-5 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {busy === "refresh" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              Force Refresh Data
            </button>
            <button
              onClick={reanalyze}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--soft-purple)] px-5 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {busy === "reanalyze" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              วิเคราะห์ใหม่ (ยังไม่เตะ)
            </button>
            <button
              onClick={clearCache}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-5 py-2 text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              {busy === "cache" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Database size={13} />
              )}
              Clear Cache
            </button>
            {settings.updatedAt && (
              <span className="self-center text-[11px] text-[var(--text-muted)]">
                ตั้งค่าล่าสุด:{" "}
                {new Date(settings.updatedAt).toLocaleString("th-TH", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </section>
      </div>
      <div className="px-4 pb-6 lg:px-6">
        <Disclaimer />
      </div>
    </main>
  );
}
