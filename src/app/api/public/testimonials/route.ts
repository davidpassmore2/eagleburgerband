import { NextResponse } from "next/server";
import { listPublicTestimonials } from "@/lib/public/publicData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ testimonials: await listPublicTestimonials() });
  } catch (err) {
    console.error("[Public Testimonials API] Failed to load testimonials:", err);
    return NextResponse.json({ error: "Unable to load testimonials." }, { status: 500 });
  }
}
