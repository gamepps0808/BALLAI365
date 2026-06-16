import { ImageResponse } from "next/og";

/**
 * รูป Open Graph (1200×630) ที่ขึ้นตอนแชร์ลิงก์ลง Facebook / Line / X
 * — สร้างด้วย ImageResponse (ไม่ต้องมีไฟล์รูป) ใช้ธีมสีเดียวกับเว็บ
 * ใช้ข้อความอังกฤษล้วนเพราะ ImageResponse ไม่มีฟอนต์ไทยติดมา (ไทยจะกลายเป็นกล่อง)
 */
export const alt = "BALLAI365 — AI Football Analytics Powered by AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 0%, #111d36 0%, #060b16 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 8,
              color: "#3dff8b",
            }}
          >
            BALLAI365 · AI FOOTBALL ANALYTICS
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 86,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.05,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          Smart Football Analysis
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: "#9fb3d1",
            marginTop: 28,
            textAlign: "center",
          }}
        >
          Win Probability · Handicap · Over/Under · Corners · Value Bet
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            padding: "12px 28px",
            borderRadius: 999,
            border: "2px solid #3dff8b",
            color: "#3dff8b",
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          Powered by Claude AI
        </div>
      </div>
    ),
    { ...size }
  );
}
