import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { getAccuracySummary } from "@/lib/accuracy";
import { BottomNav } from "@/components/layout/BottomNav";

const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
});

export const metadata: Metadata = {
  title: "AI Football Analytics — วิเคราะห์ฟุตบอลด้วย AI",
  description:
    "แพลตฟอร์มวิเคราะห์ฟุตบอลด้วย AI ระดับมืออาชีพ — AI Pick, Win Probability, แฮนดิแคป, สูง/ต่ำ, เตะมุม, Value Bet พร้อม Confidence และ Risk ทุกคู่",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // ความแม่น AI จริงจาก ledger (อ่านไฟล์อย่างเดียว ไม่ยิง API)
  const acc = getAccuracySummary();
  return (
    <html lang="th" className={`${notoThai.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Sidebar
          accuracy={{
            overall: acc.overall.pct,
            graded: acc.overall.total,
            markets: [
              ["ทายผลชนะ (1X2)", acc.oneXTwo],
              ["ทายสกอร์เป๊ะ", acc.correctScore],
              ["ทายสูง/ต่ำ", acc.overUnder],
              ["ทายเตะมุม", acc.corners],
              ["แฮนดิแคป", acc.handicap],
            ].map(([k, m]) => [
              k as string,
              (m as { pct: number | null }).pct,
              (m as { total: number }).total,
            ]),
          }}
        />
        <div className="pb-16 lg:pb-0 lg:pl-60">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
