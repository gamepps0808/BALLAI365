import fs from "node:fs";
import path from "node:path";
import { cached } from "./cache";
import { getFixtureById, getFixtureStatistics } from "./api-football";
import { Fixture } from "./types";

/**
 * สมุดบันทึกความแม่น AI (ledger) — เก็บคำทายจริงทุกคู่ที่ Claude วิเคราะห์
 * แล้วตัดสินผลกับสกอร์จริงจาก API หลังจบแมตช์
 *
 * - บันทึกตอน apply ผลวิเคราะห์ (recordPrediction) → แก้คำทายย้อนหลังไม่ได้หลังตัดสินแล้ว
 * - ตัดสิน (settlePending) ตอน cron/เปิดหน้า backtest — ใช้ API เฉพาะคู่ที่ค้างตัดสิน
 * - เก็บถาวรที่ .cache/accuracy/ledger.json (ไม่โดน prune 3 วันของ claude-store)
 */

const DIR = path.join(process.cwd(), ".cache", "accuracy");
const FILE = path.join(DIR, "ledger.json");

export interface LedgerEntry {
  id: string; // fixture id เช่น af-1489369
  afId: number;
  date: string | null; // วันบอล (Bangkok)
  kickoff: string | null;
  league: string | null;
  home: string | null;
  away: string | null;
  /* ---- คำทาย (บันทึก ณ เวลาวิเคราะห์) ---- */
  pickSide: "HOME" | "DRAW" | "AWAY";
  pickTeamName: string | null;
  expHome: number;
  expAway: number;
  ahLine: number | null; // มุมมองเจ้าบ้าน (ลบ = ต่อ)
  ahSide: "HOME" | "AWAY" | null;
  ahLabel: string | null;
  ouLine: number | null;
  ouPick: "OVER" | "UNDER" | null;
  cornerLine: number | null;
  cornerPick: "OVER" | "UNDER" | null;
  /* ---- ผลตัดสิน ---- */
  settled: boolean;
  /** เวลาที่วิเคราะห์รอบสุดท้ายก่อนเตะ (ทำครั้งเดียวต่อคู่) */
  finalizedAt?: string | null;
  voided?: boolean; // ยกเลิก/เลื่อนแข่ง — ไม่นับสถิติ
  actualHome?: number | null;
  actualAway?: number | null;
  actualCorners?: number | null;
  /** true=ถูก false=ผิด null=ไม่มีคำทาย/ราคาเสมอ(push)/ไม่มีข้อมูล */
  r1x2?: boolean | null;
  rAh?: boolean | null;
  rOu?: boolean | null;
  rCorner?: boolean | null;
  rScore?: boolean | null;
  settledAt?: string;
}

export interface MarketAccuracy {
  pct: number | null; // null = ยังไม่มีคู่ที่ตัดสินได้
  won: number;
  total: number;
}

export interface AccuracySummary {
  overall: MarketAccuracy; // = 1X2
  oneXTwo: MarketAccuracy;
  handicap: MarketAccuracy;
  overUnder: MarketAccuracy;
  corners: MarketAccuracy;
  correctScore: MarketAccuracy;
  last7Days: { date: string; accuracy: number }[];
  entries: LedgerEntry[]; // ตัดสินแล้ว ใหม่→เก่า
  pending: number;
}

/* ----------------------------- storage ----------------------------- */

function loadLedger(): LedgerEntry[] {
  try {
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as LedgerEntry[];
  } catch {
    return [];
  }
}

function saveLedger(entries: LedgerEntry[]): void {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(entries, null, 1));
  } catch (err) {
    console.error("[accuracy] save failed:", (err as Error).message);
  }
}

/* --------------------------- แฮนดิแคป: แหล่งคำนวณเดียว --------------------------- */

/**
 * ฝั่งแฮนดิแคปที่เลือก = ฝั่งที่ "สกอร์ที่ทาย" คุ้มเส้น (เส้นเป็นมุมเจ้าบ้าน)
 * derive จากสกอร์+เส้นเสมอ — ห้ามเก็บแยกเป็น snapshot เพราะจะเพี้ยนเมื่อสกอร์อัปเดต
 * (บั๊กเดิม: record อัปเดต ahLabel แต่ไม่อัปเดต expScore → สกอร์กับราคาต่อรองสวนทาง)
 */
export function handicapPickSide(
  expHome: number,
  expAway: number,
  ahLine: number
): "HOME" | "AWAY" {
  return expHome - expAway + ahLine > 0 ? "HOME" : "AWAY";
}

/** ป้ายแฮนดิแคปสำหรับแสดง จากฝั่ง+เส้น (เส้นมุมเจ้าบ้าน) */
export function handicapLabel(
  side: "HOME" | "AWAY",
  homeShort: string,
  awayShort: string,
  ahLine: number
): string {
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  return side === "HOME"
    ? `${homeShort} ${fmt(ahLine)}`
    : `${awayShort} ${fmt(-ahLine)}`;
}

/**
 * ฝั่งสูง/ต่ำที่ใช้จริง — ถ้าสกอร์รวมที่ทายห่างเส้นชัดเจน (>0.3) แต่ pick ที่ล็อกไว้สวนทาง
 * ให้อิงสกอร์ (เช่น ทาย 1-0 รวม 1 แต่ค่าค้าง Over 2.25 → Under) · กฎเดียวกับตอนวิเคราะห์
 * เพื่อให้หน้าจอแสดง · การตัดสินผล ตรงกันเสมอ
 */
export function effectiveOuPick(
  expHome: number,
  expAway: number,
  ouLine: number | null,
  stored: "OVER" | "UNDER" | null
): "OVER" | "UNDER" | null {
  if (ouLine == null) return stored;
  const d = expHome + expAway - ouLine;
  const scoreSide = d > 0.3 ? "OVER" : d < -0.3 ? "UNDER" : null;
  return scoreSide && stored !== scoreSide ? scoreSide : stored;
}

/** ฝั่ง+ป้าย ในครั้งเดียว — คืน null ถ้าไม่มีเส้นหรือไม่มีทีม */
function derivedHandicap(
  f: Fixture,
  expHome: number,
  expAway: number,
  ahLine: number | null
): { side: "HOME" | "AWAY"; label: string } | null {
  if (ahLine == null || !f.homeTeam || !f.awayTeam) return null;
  const side = handicapPickSide(expHome, expAway, ahLine);
  return {
    side,
    label: handicapLabel(side, f.homeTeam.shortName, f.awayTeam.shortName, ahLine),
  };
}

/* --------------------------- record (ตอนวิเคราะห์) --------------------------- */

/** บันทึก/อัปเดตคำทายของคู่ที่มีผลวิเคราะห์ Claude — ห้ามแก้หลังตัดสินแล้ว */
export function recordPrediction(f: Fixture): LedgerEntry | null {
  if (!f.id.startsWith("af-")) return null; // เฉพาะข้อมูลจริงจาก API
  const ledger = loadLedger();
  const existing = ledger.find((e) => e.id === f.id);
  if (existing?.settled) return existing;

  const p = f.prediction;
  const ahFromScore = derivedHandicap(f, p.expectedScore.home, p.expectedScore.away, p.handicapLine);
  const entry: LedgerEntry = {
    id: f.id,
    afId: Number(f.id.slice(3)),
    date: f.kickoff ? f.kickoff.slice(0, 10) : null,
    kickoff: f.kickoff ?? null,
    league: f.league?.name ?? null,
    home: f.homeTeam?.name ?? null,
    away: f.awayTeam?.name ?? null,
    pickSide: p.pick,
    pickTeamName: p.pickTeamName ?? null,
    expHome: p.expectedScore.home,
    expAway: p.expectedScore.away,
    ahLine: p.handicapLine,
    // ฝั่ง+ป้าย derive จากสกอร์+เส้น (แหล่งเดียว) — ไม่ parse string ที่อาจไม่ตรงสกอร์
    ahSide: ahFromScore?.side ?? null,
    ahLabel: ahFromScore?.label ?? null,
    ouLine: p.overUnderLine,
    ouPick: p.overUnderPick,
    cornerLine: p.cornerLine,
    cornerPick: p.cornerPick,
    settled: false,
  };

  if (existing) {
    existing.date ??= entry.date;
    existing.kickoff ??= entry.kickoff;
    existing.league ??= entry.league;
    existing.home ??= entry.home;
    existing.away ??= entry.away;

    // เส้นราคา = ล็อกครั้งแรก (ราคาตลาดไม่เต้นตามที่เปลี่ยนทีหลัง)
    if (existing.ahLine == null && entry.ahLine != null) existing.ahLine = entry.ahLine;
    if (existing.ouLine == null && entry.ouLine != null) {
      existing.ouLine = entry.ouLine;
      existing.ouPick = entry.ouPick;
    }
    if (existing.cornerLine == null && entry.cornerLine != null) {
      existing.cornerLine = entry.cornerLine;
      existing.cornerPick = entry.cornerPick;
    }

    // คำวิเคราะห์ Claude (สกอร์/ผล/ฝั่งแฮนดิแคป) = ยึดผลล่าสุดเสมอ จนกว่าจะ finalize ก่อนเตะ
    // → สกอร์ที่แสดง · ราคาต่อรอง · ข้อความ ตรงกับที่ Claude คิดล่าสุดทั้งหมด (ไม่ค้างค่าเก่า)
    if (!existing.finalizedAt) {
      existing.expHome = p.expectedScore.home;
      existing.expAway = p.expectedScore.away;
      existing.pickSide = p.pick;
      existing.pickTeamName = p.pickTeamName ?? existing.pickTeamName;
      const ah = derivedHandicap(f, existing.expHome, existing.expAway, existing.ahLine);
      existing.ahSide = ah?.side ?? null;
      existing.ahLabel = ah?.label ?? null;
    }
    saveLedger(ledger);
    return existing;
  }
  ledger.push(entry);
  saveLedger(ledger);
  return entry;
}

/**
 * ล็อกรอบสุดท้ายก่อนเตะ — ทับคำทายเดิมทั้งชุดด้วยผลวิเคราะห์ใหม่
 * อนุญาตเฉพาะคู่ที่ยังไม่ตัดสินและยังไม่เคย finalize (ทำครั้งเดียว)
 */
export function relockPrediction(f: Fixture): LedgerEntry | null {
  const ledger = loadLedger();
  const e = ledger.find((x) => x.id === f.id);
  if (!e || e.settled || e.finalizedAt) return e ?? null;
  const p = f.prediction;
  e.pickSide = p.pick;
  e.pickTeamName = p.pickTeamName ?? null;
  e.expHome = p.expectedScore.home;
  e.expAway = p.expectedScore.away;
  e.ahLine = p.handicapLine;
  const ahRelock = derivedHandicap(f, p.expectedScore.home, p.expectedScore.away, p.handicapLine);
  e.ahSide = ahRelock?.side ?? null;
  e.ahLabel = ahRelock?.label ?? null;
  e.ouLine = p.overUnderLine;
  e.ouPick = p.overUnderPick;
  e.cornerLine = p.cornerLine;
  e.cornerPick = p.cornerPick;
  e.finalizedAt = new Date().toISOString();
  saveLedger(ledger);
  return e;
}

/** อ่านคำทายที่ล็อกไว้ของคู่หนึ่ง (read-only) */
export function getLedgerEntry(fixtureId: string): LedgerEntry | null {
  return loadLedger().find((e) => e.id === fixtureId) ?? null;
}

/**
 * เก็บตกไฟล์วิเคราะห์ Claude ที่ยังไม่อยู่ใน ledger (เคสวิเคราะห์ไว้ก่อนระบบสถิติเปิดใช้)
 * ได้เฉพาะคำทาย 1X2 + สกอร์ — ไม่มีราคา AH/OU ณ เวลานั้นจึงไม่ตัดสินตลาดเหล่านั้น
 */
function importOrphans(ledger: LedgerEntry[]): void {
  try {
    const claudeDir = path.join(process.cwd(), ".cache", "claude");
    if (!fs.existsSync(claudeDir)) return;
    const known = new Set(ledger.map((e) => e.id));
    for (const name of fs.readdirSync(claudeDir)) {
      const m = name.match(/^(af-\d+)\.json$/);
      if (!m || known.has(m[1])) continue;
      const a = JSON.parse(fs.readFileSync(path.join(claudeDir, name), "utf8")) as {
        pick?: "HOME" | "DRAW" | "AWAY";
        expectedScore?: { home: number; away: number };
      };
      if (!a.pick || !a.expectedScore) continue;
      ledger.push({
        id: m[1],
        afId: Number(m[1].slice(3)),
        date: null,
        kickoff: null,
        league: null,
        home: null,
        away: null,
        pickSide: a.pick,
        pickTeamName: null,
        expHome: a.expectedScore.home,
        expAway: a.expectedScore.away,
        ahLine: null,
        ahSide: null,
        ahLabel: null,
        ouLine: null,
        ouPick: null,
        cornerLine: null,
        cornerPick: null,
        settled: false,
      });
    }
  } catch {
    // best-effort backfill
  }
}

/* --------------------------- settle (หลังจบแมตช์) --------------------------- */

const FINISHED = new Set(["FT", "AET", "PEN"]);
const VOIDED = new Set(["CANC", "ABD", "AWD", "WO", "PST"]);

/**
 * ตัดสินคู่ที่ค้างอยู่ (คิกออฟผ่านมาแล้ว ≥ 2 ชม.) ด้วยสกอร์จริงจาก API
 * หุ้มด้วย cache 30 นาที — เรียกถี่แค่ไหนก็ยิง API ไม่เกินรอบละครั้ง
 */
export function settlePending(): Promise<number> {
  return cached("accuracy:settle", 1800, async () => {
    const ledger = loadLedger();
    importOrphans(ledger);
    const now = Date.now();
    const due = ledger.filter(
      (e) =>
        !e.settled &&
        (e.kickoff == null || now - new Date(e.kickoff).getTime() > 2 * 3600 * 1000)
    );
    if (due.length === 0) return 0;

    let settledCount = 0;
    for (const e of due) {
      try {
        const raw = (await getFixtureById(e.afId))[0];
        if (!raw) continue;

        // เติมข้อมูลคู่ที่ยังว่าง (เคสบันทึกจากไฟล์วิเคราะห์เก่า)
        e.kickoff ??= raw.fixture.date;
        e.date ??= raw.fixture.date?.slice(0, 10) ?? null;
        e.league ??= raw.league?.name ?? null;
        e.home ??= raw.teams?.home?.name ?? null;
        e.away ??= raw.teams?.away?.name ?? null;

        const status = raw.fixture.status?.short ?? "";
        if (VOIDED.has(status)) {
          e.settled = true;
          e.voided = true;
          e.settledAt = new Date().toISOString();
          settledCount++;
          continue;
        }
        if (!FINISHED.has(status)) continue; // ยังไม่จบ — รอรอบหน้า

        const h = raw.goals?.home;
        const a = raw.goals?.away;
        if (h == null || a == null) continue;
        e.actualHome = h;
        e.actualAway = a;

        // 1X2
        const result = h > a ? "HOME" : h < a ? "AWAY" : "DRAW";
        e.r1x2 = e.pickSide === result;

        // สกอร์เป๊ะ
        e.rScore = e.expHome === h && e.expAway === a;

        // แฮนดิแคป — ตัดสินตามทิศทาง: ได้ครึ่งนับถูก เสียครึ่งนับผิด
        // เหลือ null เฉพาะ push เส้นเต็มพอดี (ไม่มีทิศทางให้ตัดสิน)
        if (e.ahLine != null) {
          // ฝั่งที่แทง derive จากสกอร์ที่ทาย+เส้น (กัน ahSide เก่าที่อาจ stale)
          const side = handicapPickSide(e.expHome, e.expAway, e.ahLine);
          const homeAdj = h - a + e.ahLine; // ahLine มุมมองเจ้าบ้าน
          const margin = side === "HOME" ? homeAdj : -homeAdj;
          e.rAh = margin === 0 ? null : margin > 0;
        } else e.rAh = null;

        // สูงต่ำ — ตัดสินตามทิศทางเช่นกัน เช่น เส้น 2.25 ยิง 2 ลูก:
        // เล่นต่ำได้ครึ่ง = ถูก, เล่นสูงเสียครึ่ง = ผิด · push เส้นเต็มพอดีเท่านั้นที่ไม่นับ
        const ouPick = effectiveOuPick(e.expHome, e.expAway, e.ouLine, e.ouPick);
        if (e.ouLine != null && ouPick != null) {
          const total = h + a;
          e.rOu =
            total === e.ouLine ? null : (total > e.ouLine) === (ouPick === "OVER");
        } else e.rOu = null;

        // เตะมุม — ต้องดึงสถิติแมตช์เพิ่ม เฉพาะคู่ที่มีคำทาย
        e.rCorner = null;
        if (e.cornerLine != null && e.cornerPick != null) {
          try {
            const stats = await getFixtureStatistics(e.afId);
            const corners = (stats ?? [])
              .map(
                (row) =>
                  row.statistics?.find((s) => s.type === "Corner Kicks")?.value
              )
              .map((v) => (v == null ? null : Number(v)));
            if (corners.length === 2 && corners.every((c) => c != null && !isNaN(c))) {
              const total = (corners[0] as number) + (corners[1] as number);
              e.actualCorners = total;
              e.rCorner =
                total === e.cornerLine
                  ? null
                  : (total > e.cornerLine) === (e.cornerPick === "OVER");
            }
          } catch {
            // ไม่มีสถิติเตะมุม → null (ไม่นับ ไม่เดา)
          }
        }

        e.settled = true;
        e.settledAt = new Date().toISOString();
        settledCount++;
      } catch (err) {
        console.error(`[accuracy] settle ${e.id} failed:`, (err as Error).message);
      }
    }

    if (settledCount > 0) saveLedger(ledger);
    return settledCount;
  });
}

/* ------------------------------ summary ------------------------------ */

function market(entries: LedgerEntry[], field: keyof LedgerEntry): MarketAccuracy {
  const graded = entries.filter((e) => e[field] === true || e[field] === false);
  const won = graded.filter((e) => e[field] === true).length;
  return {
    pct: graded.length > 0 ? Math.round((won / graded.length) * 100) : null,
    won,
    total: graded.length,
  };
}

const THAI_DAY = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** อ่านสรุปความแม่นจาก ledger (อ่านไฟล์อย่างเดียว — ไม่ยิง API) */
export function getAccuracySummary(): AccuracySummary {
  const settled = loadLedger();
  const graded = settled
    .filter((e) => e.settled && !e.voided)
    .sort((a, b) => (b.kickoff ?? "").localeCompare(a.kickoff ?? ""));
  const pending = settled.filter((e) => !e.settled).length;

  // ความแม่นรายวัน 7 วันล่าสุด (เฉพาะวันที่มีคู่ตัดสิน)
  const byDay = new Map<string, { won: number; total: number }>();
  for (const e of graded) {
    if (!e.date || e.r1x2 == null) continue;
    const d = byDay.get(e.date) ?? { won: 0, total: 0 };
    d.total++;
    if (e.r1x2) d.won++;
    byDay.set(e.date, d);
  }
  const last7Days = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([date, d]) => ({
      date: `${THAI_DAY[new Date(date).getDay()]} ${Number(date.slice(8))}`,
      accuracy: Math.round((d.won / d.total) * 100),
    }));

  const oneXTwo = market(graded, "r1x2");
  return {
    overall: oneXTwo,
    oneXTwo,
    handicap: market(graded, "rAh"),
    overUnder: market(graded, "rOu"),
    corners: market(graded, "rCorner"),
    correctScore: market(graded, "rScore"),
    last7Days,
    entries: graded.slice(0, 60),
    pending,
  };
}

/* ------------------------- feedback loop (ป้อนกลับให้ Claude) ------------------------- */

/**
 * สรุปผลงานย้อนหลังของ AI เป็นข้อความสั้น ป้อนกลับเข้า prompt ตอนวิเคราะห์
 * เพื่อให้ Claude เห็นจุดอ่อน/อคติของตัวเองแล้วปรับ — แต่ต้องระวัง over-correction:
 *  - ส่งเฉพาะตลาดที่ตัดสินแล้ว ≥ MIN_SAMPLE คู่ (ฐานเล็ก = noise เหวี่ยง)
 *  - เขียนเป็น "ข้อสังเกตให้พิจารณา" ไม่ใช่คำสั่งบังคับให้กลับด้าน
 * คืน null = ข้อมูลยังไม่พอ (Claude วิเคราะห์ตามปกติ ไม่มี bias จากผลฐานเล็ก)
 */
const MIN_SAMPLE = 12; // ภาพรวมต้องมีอย่างน้อยเท่านี้จึงเริ่มป้อนกลับ
const MIN_MARKET = 8; // ต่อตลาดเฉพาะ

export function buildSelfReview(minSample = MIN_SAMPLE, minMarket = MIN_MARKET): string | null {
  const graded = loadLedger().filter((e) => e.settled && !e.voided);
  if (graded.length < minSample) return null;

  const lines: string[] = [];

  // 1) ความแม่นต่อตลาด — เฉพาะที่มีตัวอย่างพอ
  const markets: [string, keyof LedgerEntry][] = [
    ["ทายผลชนะ (1X2)", "r1x2"],
    ["แฮนดิแคป", "rAh"],
    ["สูง/ต่ำ", "rOu"],
    ["เตะมุม", "rCorner"],
  ];
  for (const [label, field] of markets) {
    const g = graded.filter((e) => e[field] === true || e[field] === false);
    if (g.length < minMarket) continue;
    const won = g.filter((e) => e[field] === true).length;
    const pct = Math.round((won / g.length) * 100);
    if (pct <= 40) lines.push(`- ${label}: แม่นเพียง ${pct}% (${won}/${g.length}) — ตลาดนี้ยังอ่อน ควรระวังเป็นพิเศษ`);
    else if (pct >= 70) lines.push(`- ${label}: แม่น ${pct}% (${won}/${g.length}) — จุดแข็ง`);
  }

  // 2) อคติทิศทางสูง/ต่ำ — ทาย Over มากไป/ผิดบ่อยไหม
  const ouGraded = graded.filter((e) => e.rOu === true || e.rOu === false);
  if (ouGraded.length >= minMarket) {
    const over = ouGraded.filter((e) => e.ouPick === "OVER");
    const under = ouGraded.filter((e) => e.ouPick === "UNDER");
    const acc = (arr: LedgerEntry[]) =>
      arr.length ? Math.round((arr.filter((e) => e.rOu).length / arr.length) * 100) : null;
    const oa = acc(over);
    const ua = acc(under);
    if (over.length >= 3 && oa != null && oa <= 35)
      lines.push(`- คุณทาย Over ${over.length} ครั้ง แม่นแค่ ${oa}% — มีแนวโน้มทาย Over เกินจริง พิจารณา Under ให้มากขึ้นเมื่อข้อมูลรับ`);
    if (under.length >= 3 && ua != null && ua <= 35)
      lines.push(`- คุณทาย Under ${under.length} ครั้ง แม่นแค่ ${ua}% — พิจารณา Over ให้มากขึ้นเมื่อข้อมูลรับ`);
  }

  // 3) สมดุล 1X2 — ไม่เคยทายเสมอ/เอียงข้างใดข้างหนึ่งจัดไหม
  const drawRate = graded.filter((e) => e.pickSide === "DRAW").length / graded.length;
  if (graded.length >= minSample && drawRate === 0)
    lines.push(`- จาก ${graded.length} คู่ที่ผ่านมา คุณไม่เคยทายเสมอเลย — คู่ที่สองทีมสูสีจริง เสมอเป็นตัวเลือกที่ควรพิจารณา`);

  if (lines.length === 0) return null;
  return (
    `ผลงานย้อนหลังของคุณ (ใช้เป็นข้อสังเกตปรับปรุงเท่านั้น ไม่ใช่กฎบังคับ — ` +
    `ยังต้องตัดสินแต่ละคู่ตามข้อมูลจริงของคู่นั้น):\n${lines.join("\n")}`
  );
}
