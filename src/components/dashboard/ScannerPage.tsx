import { Topbar } from "@/components/layout/Topbar";
import { MatchScanner, ScannerMarket } from "./MatchScanner";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ProviderBanner } from "@/components/ui/ProviderBanner";
import { Fixture } from "@/lib/types";

/** Shared layout for list pages that show a filtered Match Scanner. */
export function ScannerPage({
  title,
  description,
  fixtures,
  provider,
  fallback,
  error,
  market,
}: {
  title: string;
  description?: string;
  fixtures: Fixture[];
  provider: string;
  fallback: boolean;
  error?: string;
  market?: ScannerMarket;
}) {
  return (
    <main>
      <Topbar title={title} />
      <div className="space-y-4 p-4 lg:p-6">
        <ProviderBanner provider={provider} fallback={fallback} error={error} />
        {description && (
          <p className="text-[12px] text-[var(--text-secondary)]">{description}</p>
        )}
        {fixtures.length > 0 ? (
          <MatchScanner fixtures={fixtures} market={market} />
        ) : (
          <div className="glass p-10 text-center text-[13px] text-[var(--text-muted)]">
            ยังไม่มีคู่ที่เข้าเงื่อนไขในขณะนี้ — ข้อมูลจะอัปเดตอัตโนมัติเมื่อมีแมตช์ใหม่
          </div>
        )}
        <Disclaimer />
      </div>
    </main>
  );
}
