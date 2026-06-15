import Link from "next/link";
import { BellRing, TrendingUp, Gem, TriangleAlert, Ban } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ProviderBanner } from "@/components/ui/ProviderBanner";
import { fetchFeaturedFixtures } from "@/lib/service";
import { buildAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";

const iconFor = {
  AI_SCORE: { icon: BellRing, color: "var(--neon-green)" },
  VALUE: { icon: Gem, color: "var(--gold)" },
  ODDS_MOVE: { icon: TrendingUp, color: "var(--neon-blue)" },
  RISK: { icon: TriangleAlert, color: "var(--danger)" },
  AVOID: { icon: Ban, color: "var(--danger)" },
} as const;

export default async function AlertsPage() {
  const { fixtures, provider, fallback, error } = await fetchFeaturedFixtures(); // บอลเด่นคืนนี้+วันใหม่ ชุดเดียวกับหน้าหลัก
  // เงื่อนไขเดียวกับกระดิ่ง Topbar และ /api/alerts (โมดูลกลาง)
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const alerts = buildAlerts(fixtures)
    .map((a) => ({ ...a, fixture: byId.get(a.fixtureId)! }))
    .filter((a) => a.fixture);

  return (
    <main>
      <Topbar title="การแจ้งเตือน" />
      <div className="space-y-4 p-4 lg:p-6">
        <ProviderBanner provider={provider} fallback={fallback} error={error} />
        {alerts.length === 0 && (
          <div className="glass p-10 text-center text-[13px] text-[var(--text-muted)]">
            ยังไม่มีการแจ้งเตือนในขณะนี้
          </div>
        )}
        <div className="space-y-2">
          {alerts.map((a, i) => {
            const { icon: Icon, color } = iconFor[a.type];
            const { homeTeam: home, awayTeam: away } = a.fixture;
            return (
              <Link
                key={i}
                href={`/match/${a.fixture.id}`}
                className="glass glass-hover flex items-center gap-3 p-3.5"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold">
                    {home.shortName} vs {away.shortName}{" "}
                    <span className="font-normal text-[var(--text-muted)]">
                      · {a.fixture.kickoffLabel}
                    </span>
                  </p>
                  <p className="truncate text-[12px] text-[var(--text-secondary)]">{a.message}</p>
                </div>
              </Link>
            );
          })}
        </div>
        <Disclaimer />
      </div>
    </main>
  );
}
