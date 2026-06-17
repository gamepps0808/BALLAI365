import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * แผนผังเว็บสำหรับ Google — เฉพาะหน้าสาธารณะที่มีเนื้อหาคงที่
 * ไม่ใส่หน้าแมตช์รายคู่ (/match/[id]) เพราะเปลี่ยนทุกวันและการ build
 * รายการจะต้องยิง API — ปล่อยให้บอทเก็บผ่านลิงก์ในหน้าแทน (ประหยัด quota)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // หน้าที่อัปเดตบ่อย (รายวัน/ราย ชม.) ให้ priority สูงและ changeFrequency ถี่
  const hourly = ["", "/matches", "/fixtures", "/live", "/ai-picks"];
  const daily = [
    "/handicap",
    "/over-under",
    "/corners",
    "/results",
    "/backtest",
    "/leagues",
    "/team-stats",
    "/news",
  ];

  return [
    ...hourly.map((p) => ({
      url: `${SITE_URL}${p}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: p === "" ? 1 : 0.8,
    })),
    ...daily.map((p) => ({
      url: `${SITE_URL}${p}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
