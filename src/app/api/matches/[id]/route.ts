import { NextResponse } from "next/server";
import { fetchFixture } from "@/lib/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { fixture, provider, fallback, error } = await fetchFixture(id);

  if (!fixture) {
    return NextResponse.json(
      { error: "not_found", message: `Fixture ${id} not found` },
      { status: 404 }
    );
  }
  return NextResponse.json({
    data: fixture,
    meta: { provider, fallback, error, updatedAt: new Date().toISOString() },
  });
}
