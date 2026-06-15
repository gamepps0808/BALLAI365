import { NextRequest, NextResponse } from "next/server";
import { fetchLiteFixtures, footballToday, footballNewDay } from "@/lib/service";
import { searchTeams } from "@/lib/api-football";

export const dynamic = "force-dynamic";

export interface SearchMatchHit {
  id: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  league: string;
  kickoffLabel: string;
  status: string;
  day: "today" | "tomorrow";
}

export interface SearchTeamHit {
  id: number;
  name: string;
  country?: string;
  logo?: string;
  national?: boolean;
}

/**
 * ค้นหาจาก Topbar — แมตช์ในโปรแกรมวันนี้/พรุ่งนี้ (ชื่อทีม/ลีก) + ทีมจาก API
 * ใช้ข้อมูล lite ที่ cache ไว้แล้ว — ไม่เรียก Claude
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ matches: [], teams: [] });
  }

  const [today, tomorrow] = await Promise.all([
    fetchLiteFixtures(footballToday()),
    fetchLiteFixtures(footballNewDay()),
  ]);

  const seen = new Set<string>();
  const matches: SearchMatchHit[] = [];
  for (const { list, day } of [
    { list: today.fixtures, day: "today" as const },
    { list: tomorrow.fixtures, day: "tomorrow" as const },
  ]) {
    for (const f of list) {
      if (seen.has(f.id) || matches.length >= 8) continue;
      const hay = `${f.homeName} ${f.awayName} ${f.leagueName}`.toLowerCase();
      if (!hay.includes(q)) continue;
      seen.add(f.id);
      matches.push({
        id: f.id,
        home: f.homeName,
        away: f.awayName,
        homeLogo: f.homeLogo,
        awayLogo: f.awayLogo,
        league: f.leagueName,
        kickoffLabel: f.kickoffLabel,
        status: f.status,
        day,
      });
    }
  }

  let teams: SearchTeamHit[] = [];
  if (q.length >= 3) {
    try {
      teams = (await searchTeams(q)).slice(0, 6).map((r) => ({
        id: r.team.id,
        name: r.team.name,
        country: r.team.country,
        logo: r.team.logo,
        national: r.team.national,
      }));
    } catch {
      // โควตา/เน็ตมีปัญหา → โชว์เฉพาะแมตช์ ไม่พังทั้งช่องค้นหา
    }
  }

  return NextResponse.json({ matches, teams });
}
