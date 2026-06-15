import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, unauthorized } from "@/lib/admin-auth";
import { getSettings, saveSettings, AppSettings } from "@/lib/settings";
import { DEFAULT_MODEL_WEIGHTS, ModelWeights } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();
  return NextResponse.json({ data: getSettings() });
}

/** เซฟการตั้งค่าจาก Admin panel — validate ก่อนเขียนลงดิสก์ */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();
  const body = (await request.json().catch(() => null)) as Partial<AppSettings> | null;
  if (!body) {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const patch: Partial<AppSettings> = {};

  if (body.claudeLimit !== undefined) {
    const n = Number(body.claudeLimit);
    if (!Number.isInteger(n) || n < 0 || n > 20) {
      return NextResponse.json(
        { error: "claudeLimit ต้องเป็นจำนวนเต็ม 0-20 คู่/วัน" },
        { status: 400 }
      );
    }
    patch.claudeLimit = n;
  }

  if (body.detailLimit !== undefined) {
    const n = Number(body.detailLimit);
    if (!Number.isInteger(n) || n < 0 || n > 40) {
      return NextResponse.json(
        { error: "detailLimit ต้องเป็นจำนวนเต็ม 0-40 คู่/วัน" },
        { status: 400 }
      );
    }
    patch.detailLimit = n;
  }

  if (body.disabledLeagues !== undefined) {
    if (
      !Array.isArray(body.disabledLeagues) ||
      body.disabledLeagues.some((l) => typeof l !== "string")
    ) {
      return NextResponse.json(
        { error: "disabledLeagues ต้องเป็นรายชื่อลีก" },
        { status: 400 }
      );
    }
    patch.disabledLeagues = body.disabledLeagues;
  }

  if (body.weights !== undefined) {
    const keys = Object.keys(DEFAULT_MODEL_WEIGHTS) as (keyof ModelWeights)[];
    const w = body.weights as ModelWeights;
    const valid =
      keys.every((k) => Number.isFinite(w[k]) && w[k] >= 0 && w[k] <= 40) &&
      Math.round(keys.reduce((s, k) => s + w[k], 0)) === 100;
    if (!valid) {
      return NextResponse.json(
        { error: "น้ำหนักแต่ละตัวต้องอยู่ใน 0-40 และรวมกันเป็น 100%" },
        { status: 400 }
      );
    }
    patch.weights = w;
  }

  return NextResponse.json({ data: saveSettings(patch) });
}
