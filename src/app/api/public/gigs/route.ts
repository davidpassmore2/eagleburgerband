import { NextResponse } from "next/server";
import { listPublicGigs } from "@/lib/public/publicData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ gigs: await listPublicGigs() });
  } catch (err) {
    console.error("[Public Gigs API] Failed to load gigs:", err);
    return NextResponse.json({ error: "Unable to load gigs." }, { status: 500 });
  }
}
