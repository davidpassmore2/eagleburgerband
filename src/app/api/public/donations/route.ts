import { NextResponse } from "next/server";
import { listPublicBeneficiaries } from "@/lib/public/publicData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ beneficiaries: await listPublicBeneficiaries() });
  } catch (err) {
    console.error("[Public Giving API] Failed to load beneficiaries:", err);
    return NextResponse.json({ error: "Unable to load beneficiaries." }, { status: 500 });
  }
}
