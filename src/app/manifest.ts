import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

/**
 * Web App Manifest — ทำให้ติดตั้งลงหน้าจอโฮมได้ (PWA) ทั้ง iOS/Android
 * เปิดเต็มจอ (standalone) · ธีมดำ-เขียวตามเว็บ · ไอคอนจากโลโก้แบรนด์
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description:
      "วิเคราะห์ฟุตบอลด้วย AI จากข้อมูลจริง — คำทาย แฮนดิแคป สูง/ต่ำ พร้อมความแม่นย้อนหลัง",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060b16",
    theme_color: "#060b16",
    lang: "th",
    categories: ["sports"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
