import { NextRequest, NextResponse } from "next/server";
import { FieldDiff } from "@/lib/logistics/diff";

type BroadcastPayload = {
  gigId: string;
  gigTitle: string;
  gigDate: string;
  diffs: FieldDiff[];
  confirmedRecipientsCount: number;
  initiatedBy: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BroadcastPayload;
    const { gigId, gigTitle, gigDate, diffs, confirmedRecipientsCount, initiatedBy } = body;

    if (!gigId || !diffs || diffs.length === 0) {
      return new NextResponse("Invalid broadcast payload.", { status: 400 });
    }

    const changeLines = diffs.map((d) => `• ${d.label}: ${d.oldValue} ➔ ${d.newValue}`);

    const formattedMessage = [
      `⚠️ LOGISTICS UPDATE: ${gigTitle} (${gigDate})`,
      "",
      "The following details have changed:",
      ...changeLines,
      "",
      `Notified: ${confirmedRecipientsCount} confirmed musician(s).`,
      `Updated by: ${initiatedBy}`,
    ].join("\n");

    // Optional external webhook forward (Slack/Discord)
    const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: formattedMessage }),
          signal: AbortSignal.timeout(3500),
        });
      } catch (webhookErr) {
        console.warn("External webhook notification timed out or failed:", webhookErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: formattedMessage,
    });
  } catch (err) {
    console.error("Alert dispatch failed:", err);
    return new NextResponse("Failed to process dispatch alert.", { status: 500 });
  }
}