import { NextRequest, NextResponse } from "next/server";
import { getDeliverabilityConfig } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") || req.nextUrl?.origin;
    const config = getDeliverabilityConfig(origin);
    return NextResponse.json({
      configured: config.hasKey,
      mocked: config.isMockMode,
      isEmulator: config.isEmulator,
      fromEmail: config.fromEmail,
      appUrl: config.appUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

