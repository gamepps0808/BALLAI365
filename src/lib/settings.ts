import fs from "node:fs";
import path from "node:path";
import { DEFAULT_MODEL_WEIGHTS, ModelWeights } from "./types";

/**
 * การตั้งค่าระบบจาก Admin panel — เซฟจริงที่ .cache/settings.json
 * ค่าที่ไม่เคยตั้งใช้ default จาก .env → ใช้ได้ทันทีโดยไม่ต้องรีสตาร์ท
 *
 * ค่าที่ "มีผลจริง" ต่อระบบ:
 *  - claudeLimit     จำนวนคู่/วันที่ส่งให้ Claude วิเคราะห์ (คุมค่าใช้จ่าย token)
 *  - detailLimit     จำนวนคู่/วันที่ดึงข้อมูลเชิงลึกจาก API (คุมโควตา request)
 *  - disabledLeagues ลีกที่ตัดออกจากการคัดคู่ใหญ่รอบรีเฟรชถัดไป
 *  - weights         ใช้กับโหมด Mock engine เท่านั้น (โหมด API ใช้สูตรตามสเปก)
 */

const FILE = path.join(process.cwd(), ".cache", "settings.json");

export interface AppSettings {
  claudeLimit: number;
  detailLimit: number;
  disabledLeagues: string[]; // ชื่อลีกตาม API เช่น "Premier League"
  weights: ModelWeights;
  updatedAt: string | null;
}

function envDefaults(): AppSettings {
  return {
    claudeLimit: Number(process.env.CLAUDE_ANALYSIS_LIMIT ?? 10),
    detailLimit: Number(
      process.env.AF_DETAIL_LIMIT ?? process.env.AF_ODDS_LIMIT ?? 20
    ),
    disabledLeagues: [],
    weights: { ...DEFAULT_MODEL_WEIGHTS },
    updatedAt: null,
  };
}

export function getSettings(): AppSettings {
  const base = envDefaults();
  try {
    if (!fs.existsSync(FILE)) return base;
    const saved = JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<AppSettings>;
    return {
      ...base,
      ...saved,
      weights: { ...base.weights, ...(saved.weights ?? {}) },
      disabledLeagues: Array.isArray(saved.disabledLeagues)
        ? saved.disabledLeagues
        : [],
    };
  } catch {
    return base;
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const merged: AppSettings = {
    ...getSettings(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(merged, null, 1));
  return merged;
}
