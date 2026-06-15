import { ScannerPage } from "@/components/dashboard/ScannerPage";
import { fetchFeaturedFixtures } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function AiPicksPage() {
  const { fixtures, provider, fallback, error } = await fetchFeaturedFixtures(); // บอลเด่นคืนนี้+วันใหม่ ชุดเดียวกับหน้าหลัก
  return (
    <ScannerPage
      title="AI แนะนำ"
      description="คู่ที่ AI Score ตั้งแต่ 75 ขึ้นไป — แสดงเฉพาะคู่ที่ AI มั่นใจและข้อมูลครบ"
      fixtures={fixtures.filter((f) => f.prediction.aiScore >= 75)}
      provider={provider}
      fallback={fallback}
      error={error}
    />
  );
}
