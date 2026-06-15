import { NextResponse } from "next/server";
import { fetchFixtures } from "@/lib/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  const analyze = searchParams.get("analyze") === "1";

  const { fixtures, provider, fallback, error, updatedAt } = await fetchFixtures(date, { analyze });
  return NextResponse.json({
    data: fixtures,
    meta: { provider, fallback, error, updatedAt, count: fixtures.length },
  });
}
