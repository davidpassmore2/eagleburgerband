import { NextRequest, NextResponse } from "next/server";
import { SendBookingReceiptSchema } from "@/lib/schema/email";
import { renderBookingClientReceipt, renderBookingDirectorAlert } from "@/lib/email/templates";
import { sendTransactionalEmail, getDeliverabilityConfig } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SendBookingReceiptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking receipt payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      clientName,
      clientEmail,
      eventTitle,
      date,
      venue,
      budget,
      message,
      phone,
      directorAlertEmail,
    } = parsed.data;

    const origin = req.headers.get("origin") || req.nextUrl?.origin;
    const config = getDeliverabilityConfig(origin);
    const directorTarget = directorAlertEmail || "manager@eagleburgerband.org";

    // 1. Dispatch Client Receipt
    const clientEmailData = renderBookingClientReceipt({
      clientName,
      eventTitle,
      date,
      venue,
      budget,
      message,
      appUrl: config.appUrl,
    });

    const clientDispatchPromise = sendTransactionalEmail({
      to: clientEmail,
      subject: clientEmailData.subject,
      html: clientEmailData.html,
      text: clientEmailData.text,
      templateType: "contact_thank_you",
      relatedEntityType: "contact",
      senderName: "The Eagleburger Band",
    });

    // 2. Dispatch Band Director Notification Alert
    const directorEmailData = renderBookingDirectorAlert({
      clientName,
      clientEmail,
      phone,
      eventTitle,
      date,
      venue,
      budget,
      message,
      appUrl: config.appUrl,
    });

    const directorDispatchPromise = sendTransactionalEmail({
      to: directorTarget,
      subject: directorEmailData.subject,
      html: directorEmailData.html,
      text: directorEmailData.text,
      templateType: "custom_broadcast",
      relatedEntityType: "contact",
      senderName: "Eagleburger Booking Dispatch",
    });

    // Await both dispatches concurrently
    const [clientRes, directorRes] = await Promise.all([
      clientDispatchPromise,
      directorDispatchPromise,
    ]);

    return NextResponse.json({
      success: clientRes.success || directorRes.success,
      clientReceipt: {
        success: clientRes.success,
        mocked: clientRes.mocked,
        messageId: clientRes.messageId,
        error: clientRes.error,
      },
      directorAlert: {
        success: directorRes.success,
        mocked: directorRes.mocked,
        messageId: directorRes.messageId,
        error: directorRes.error,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Booking receipt dispatch error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

