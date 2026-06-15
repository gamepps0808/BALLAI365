import { ScannerPage } from "@/components/dashboard/ScannerPage";
import { fetchFeaturedFixtures } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function HandicapPage() {
  const { fixtures, provider, fallback, error } = await fetchFeaturedFixtures(); // บอลเด่นคืนนี้+วันใหม่ ชุดเดียวกับหน้าหลัก
  return (
    <ScannerPage
      title="แฮนดิแคป"
      description="คู่ที่ราคาต่อรองน่าสนใจ เรียงตามความได้เปรียบของฝั่งที่ AI เลือก"
      fixtures={fixtures.filter((f) => f.prediction.handicapLine !== null)}
      provider={provider}
      fallback={fallback}
      error={error}
    />
  );
}
