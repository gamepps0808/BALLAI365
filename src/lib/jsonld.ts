import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "./seo";
import type { Fixture } from "./types";

/**
 * Structured data (schema.org) — ช่วยให้ Google เข้าใจว่าเว็บนี้คืออะไร
 * และแต่ละหน้าแมตช์เป็น "การแข่งขันกีฬา" (อาจขึ้น rich result ในผลค้นหา)
 * สร้างจากข้อมูลจริงเท่านั้น — field ไหนไม่มีข้อมูลให้ข้าม (ไม่เดา)
 */

/** WebSite + Organization ระดับเว็บ (ใส่ครั้งเดียวใน layout) */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_TAGLINE,
        inLanguage: "th",
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/opengraph-image`,
      },
    ],
  };
}

// schema.org รองรับเฉพาะสถานะเหล่านี้ — ที่เหลือถือว่าตามกำหนดเดิม
const EVENT_STATUS: Record<string, string> = {
  CANCELLED: "https://schema.org/EventCancelled",
  POSTPONED: "https://schema.org/EventPostponed",
};

/** SportsEvent รายแมตช์ (ใส่ในหน้า /match/[id]) */
export function matchJsonLd(f: Fixture) {
  const teams = [f.homeTeam, f.awayTeam];
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${f.homeTeam.name} vs ${f.awayTeam.name}`,
    sport: "Soccer",
    startDate: f.kickoff,
    eventStatus: EVENT_STATUS[f.status] ?? "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${SITE_URL}/match/${f.id}`,
    competitor: teams.map((t) => ({
      "@type": "SportsTeam",
      name: t.name,
      ...(t.logo ? { logo: t.logo } : {}),
    })),
  };
  if (f.venueName) {
    data.location = {
      "@type": "Place",
      name: f.venueName,
      ...(f.venueCity ? { address: f.venueCity } : {}),
    };
  }
  if (f.league?.name) {
    data.superEvent = { "@type": "SportsOrganization", name: f.league.name };
  }
  return data;
}
