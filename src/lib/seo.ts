/**
 * โดเมนเว็บสำหรับ metadata / sitemap / Open Graph
 * ตั้งผ่าน env `NEXT_PUBLIC_SITE_URL` ตอน deploy (เช่น https://yourdomain.com)
 * — ถ้าไม่ตั้ง จะ fallback เป็น localhost (ใช้ตอน dev)
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "AI Football Analytics";
export const SITE_TAGLINE = "วิเคราะห์ฟุตบอลด้วย AI";
