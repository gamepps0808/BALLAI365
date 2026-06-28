import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { getAccuracySummary } from "@/lib/accuracy";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteJsonLd } from "@/lib/jsonld";

const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
});

const DESC =
  "แพลตฟอร์มวิเคราะห์ฟุตบอลด้วย AI ระดับมืออาชีพ — AI Pick, Win Probability, แฮนดิแคป, สูง/ต่ำ, เตะมุม, Value Bet พร้อม Confidence และ Risk ทุกคู่";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    // หน้าย่อยตั้ง title แค่ชื่อคู่ แล้วระบบต่อท้ายแบรนด์ให้อัตโนมัติ
    template: `%s — ${SITE_NAME}`,
  },
  description: DESC,
  keywords: [
    "วิเคราะห์บอล",
    "ทีเด็ดบอล",
    "วิเคราะห์บอลวันนี้",
    "AI วิเคราะห์บอล",
    "ราคาบอล",
    "แฮนดิแคป",
    "สูงต่ำ",
    "football analysis",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DESC,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DESC,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // ความแม่น AI จริงจาก ledger (อ่านไฟล์อย่างเดียว ไม่ยิง API)
  const acc = getAccuracySummary();
  return (
    <html lang="th" className={`${notoThai.variable} h-full antialiased`}>
      <body className="min-h-full">
        <JsonLd data={siteJsonLd()} />
        <Sidebar
          accuracy={{
            overall: acc.overall.pct,
            graded: acc.overall.total,
            markets: [
              ["ทายผลชนะ (1X2)", acc.oneXTwo],
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
        <div className="pb-16 lg:pb-0 lg:pl-60">
          {children}
          <Footer />
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
