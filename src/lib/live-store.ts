import fs from "node:fs";
import path from "node:path";

/**
 * ที่เก็บ "ทรรศนะสด" ต่อคู่ (ไฟล์ JSON บน Volume) — กันยิง Haiku ซ้ำตอนไม่มีเหตุการณ์ใหม่
 * ไฟล์เก่ากว่า 1 วันถูกลบอัตโนมัติ (จบเกมแล้วไม่ต้องเก็บ)
 */
const DIR = path.join(process.cwd(), ".cache", "live");
const MAX_AGE_MS = 24 * 3600 * 1000;

function fileFor(id: string): string {
  return path.join(DIR, `${id.replace(/[^a-z0-9-]/gi, "_")}.json`);
}

export function loadLiveRead<T>(id: string): T | null {
  try {
    const file = fileFor(id);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export function saveLiveRead(id: string, data: unknown): void {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(fileFor(id), JSON.stringify(data, null, 1));
    pruneOld();
  } catch (err) {
    console.error("[live-store] save failed:", (err as Error).message);
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
    // best-effort
  }
}
