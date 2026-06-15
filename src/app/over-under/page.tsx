import { ScannerPage } from "@/components/dashboard/ScannerPage";
import { fetchFeaturedFixtures } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function OverUnderPage() {
  const { fixtures, provider, fallback, error } = await fetchFeaturedFixtures(); // บอลเด่นคืนนี้+วันใหม่ ชุดเดียวกับหน้าหลัก
  return (
    <ScannerPage
      title="สูง / ต่ำ"
      description="ผลวิเคราะห์สกอร์รวม Over/Under ทุกคู่ พร้อมเส้นราคาและความมั่นใจ"
      fixtures={fixtures.filter(
        (f) => f.prediction.overUnderPick !== null || f.prediction.overUnderLine !== null
      )}
      market="ou"
      provider={provider}
      fallback={fallback}
      error={error}
    />
  );
}
