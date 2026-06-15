import fs from "node:fs";
import path from "node:path";

/**
 * ที่เก็บผลวิเคราะห์ Claude แบบถาวร (ไฟล์ JSON ต่อคู่)
 *
 * วิเคราะห์สำเร็จครั้งเดียว → เซฟลงดิสก์ → ใช้ซ้ำตลอด ไม่หายตอนรีเฟรช/รีสตาร์ท
 * และไม่เรียก API ซ้ำให้เปลืองเงิน — ไฟล์เก่ากว่า 30 วันถูกลบอัตโนมัติ
 */

const DIR = path.join(process.cwd(), ".cache", "claude");
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;

function fileFor(fixtureId: string): string {
  return path.join(DIR, `${fixtureId.replace(/[^a-z0-9-]/gi, "_")}.json`);
}

export function loadSavedAnalysis<T>(fixtureId: string): T | null {
  try {
    const file = fileFor(fixtureId);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export function saveAnalysis(fixtureId: string, analysis: unknown): void {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(fileFor(fixtureId), JSON.stringify(analysis, null, 1));
    pruneOld();
  } catch (err) {
    console.error("[claude-store] save failed:", (err as Error).message);
  }
}

function pruneOld(): void {
  try {
    const now = Date.now();
    for (const name of fs.readdirSync(DIR)) {
      const file = path.join(DIR, name);
      if (now - fs.statSync(file).mtimeMs > MAX_AGE_MS) fs.unlinkSync(file);
    }
  } catch {
    // best-effort cleanup
  }
}
