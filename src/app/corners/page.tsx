import { ScannerPage } from "@/components/dashboard/ScannerPage";
import { fetchFeaturedFixtures } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function CornersPage() {
  const { fixtures, provider, fallback, error } = await fetchFeaturedFixtures(); // บอลเด่นคืนนี้+วันใหม่ ชุดเดียวกับหน้าหลัก
  return (
    <ScannerPage
      title="เตะมุม"
      description="วิเคราะห์เตะมุม Over/Under จากค่าเฉลี่ยทีม แนวโน้มเหย้า-เยือน และค่าเฉลี่ยลีก"
      fixtures={fixtures.filter(
        (f) => f.prediction.cornerPick !== null || f.corners.confidencePct >= 60
      )}
      market="corner"
      provider={provider}
      fallback={fallback}
      error={error}
    />
  );
}
