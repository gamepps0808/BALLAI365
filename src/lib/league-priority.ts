/**
 * ลำดับความสำคัญของลีก — ใช้เรียง section บนหน้าแมตช์วันนี้ / ผลบอลย้อนหลัง / แมตช์สด
 * (ลีกใหญ่อยู่บนสุด) และใช้คัด "คู่ใหญ่" ใน big-match-selector
 *
 * จับชื่อตรงตัว + ตรวจประเทศ — กันลีกชื่อพ้อง เช่น Victoria Premier League (ออสเตรเลีย)
 * หรือ Serie A (บราซิล) มาแซงลีกจริง · ไม่อยู่ในลิสต์ = 99 (ท้ายตาราง เรียงต่อด้วยเวลาเตะ)
 */
const LEAGUE_PRIORITY: { name: string; country?: string }[] = [
  { name: "World Cup" },
  { name: "UEFA Champions League" },
  { name: "Euro Championship" },
  { name: "Copa America" },
  { name: "Premier League", country: "England" },
  { name: "La Liga", country: "Spain" },
  { name: "Serie A", country: "Italy" },
  { name: "Bundesliga", country: "Germany" },
  { name: "Ligue 1", country: "France" },
  { name: "UEFA Europa League" },
  { name: "Friendlies", country: "World" },
  { name: "FA Cup", country: "England" },
  { name: "Copa del Rey", country: "Spain" },
];

export function leagueRank(leagueName: string, leagueCountry?: string): number {
  const i = LEAGUE_PRIORITY.findIndex(
    (l) =>
      leagueName === l.name &&
      (!l.country || !leagueCountry || leagueCountry === l.country)
  );
  return i === -1 ? 99 : i;
}

/** เรียงกลุ่มลีก: ลีกสำคัญก่อน → ภายในลำดับเดียวกันเรียงตามเวลาเตะคู่แรก */
export function sortSectionsByImportance<
  T extends { leagueName: string; leagueCountry: string; kickoff: string },
>(sections: T[][]): T[][] {
  return sections.sort((a, b) => {
    const ra = leagueRank(a[0].leagueName, a[0].leagueCountry);
    const rb = leagueRank(b[0].leagueName, b[0].leagueCountry);
    if (ra !== rb) return ra - rb;
    return a[0].kickoff.localeCompare(b[0].kickoff);
  });
}
