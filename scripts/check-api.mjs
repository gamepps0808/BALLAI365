#!/usr/bin/env node
/**
 * ตรวจสอบการเชื่อมต่อ API-Football:  npm run check:api
 * อ่าน API_FOOTBALL_KEY จาก .env แล้วเรียก /status + /fixtures วันนี้
 */
import { readFileSync, existsSync } from "node:fs";

// minimal .env parser (no dependency)
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const key = process.env.API_FOOTBALL_KEY;
if (!key) {
  console.error("❌ ไม่พบ API_FOOTBALL_KEY ใน .env");
  process.exit(1);
}

const BASE = "https://v3.football.api-sports.io";
const headers = { "x-apisports-key": key };

async function call(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  return res.json();
}

console.log("กำลังตรวจสอบ key กับ api-sports.io ...\n");

const status = await call("/status");
if (status.errors && Object.keys(status.errors).length > 0) {
  console.error("❌ Key ใช้ไม่ได้:", JSON.stringify(status.errors, null, 2));
  console.error(
    "\nวิธีแก้: เข้า https://dashboard.api-football.com → คัดลอก API key ของคุณ" +
      "\nแล้ววางใน .env บรรทัด API_FOOTBALL_KEY=..." +
      "\n(ถ้าสมัครผ่าน RapidAPI ต้องแก้ adapter ให้ใช้ header x-rapidapi-key แทน)"
  );
  process.exit(1);
}

const acc = status.response;
console.log("✅ Key ใช้งานได้");
console.log(`   แพลน: ${acc.subscription?.plan} (หมดอายุ ${acc.subscription?.end})`);
console.log(`   โควตาวันนี้: ใช้ไป ${acc.requests?.current}/${acc.requests?.limit_day} requests`);

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const fixtures = await call(`/fixtures?date=${today}&timezone=Asia%2FBangkok`);
if (fixtures.errors && Object.keys(fixtures.errors).length > 0) {
  console.error("\n⚠️ ดึง fixtures ไม่ได้:", JSON.stringify(fixtures.errors));
  console.error("   (แพลนฟรีจำกัดฤดูกาลย้อนหลัง — ลองตรวจสิทธิ์แพลนของคุณ)");
  process.exit(1);
}
console.log(`\n✅ Fixtures วันนี้ (${today}): ${fixtures.results} คู่ทั่วโลก`);
console.log("   ระบบพร้อมใช้งาน — ตั้ง DATA_PROVIDER=api-football แล้วรีสตาร์ท dev server");
