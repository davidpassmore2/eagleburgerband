import { NextRequest, NextResponse } from "next/server";
import { getPublicGig } from "@/lib/public/publicData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const gig = await getPublicGig(id);
    if (!gig) return NextResponse.json({ error: "Gig not found." }, { status: 404 });
    return NextResponse.json({ gig });
  } catch (err) {
    console.error("[Public Gigs API] Failed to load gig:", err);
    return NextResponse.json({ error: "Unable to load gig." }, { status: 500 });
  }
}
