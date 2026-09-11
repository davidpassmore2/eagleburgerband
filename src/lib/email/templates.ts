// src/lib/email/templates.ts
import { EmailTemplateType } from "@/lib/schema/emailLog";

export interface TemplateDefinition {
  type: EmailTemplateType;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  defaultSubject: string;
  defaultHtmlBody: string;
  defaultSmsBody: string;
  smsRecommended: boolean;
  suggestedAudience: "all_band" | "section" | "gig_attending" | "individual" | "crm_contact" | "direct_invite";
  supportedTokens: string[];
}

export const EMAIL_TEMPLATES: Record<EmailTemplateType, TemplateDefinition> = {
  member_invite: {
    type: "member_invite",
    title: "New Member Invitation & Welcome",
    badge: "Recruitment & Onboarding",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    description: "Welcome vetted recruits, confirm section placement, and provide secure 1-click registration token.",
    defaultSubject: "Welcome to the Eagleburger Band! Complete Your Musician Registration",
    defaultHtmlBody: `<h2>Welcome to the Eagleburger Band!</h2>
<p>Hey <strong>{{recipient_name}}</strong>,</p>
<p>We are thrilled to officially invite you to join the <strong>Eagleburger Band</strong> as an active musician! Our horn lines and drum battery are stoked to have your sound on the street with us.</p>
<div style="background-color: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;">
  <p style="margin: 0; font-size: 14px; color: #f8fafc;"><strong>Next Steps:</strong></p>
  <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #cbd5e1;">
    <li>Activate your personal Musician Portal profile using your private invite link below.</li>
    <li>Select your preferred portal theme and configure your instrument profile.</li>
    <li>Download active parade charts and reference recordings in the Music Vault.</li>
    <li>Subscribe your phone's calendar to our live gig feed.</li>
  </ul>
</div>
<p style="text-align: center; margin: 24px 0;">
  <a href="{{invite_url}}" style="background-color: #f59e0b; color: #020617; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
    Complete Your Musician Registration &rarr;
  </a>
</p>
<p style="font-size: 12px; color: #94a3b8;">If the button above does not work, copy and paste this direct registration link into your browser:<br /><a href="{{invite_url}}" style="color: #38bdf8;">{{invite_url}}</a></p>
<p>See you at rehearsal!<br /><strong>The Eagleburger Band Directors & Section Leads</strong></p>`,
    defaultSmsBody: "EBB Welcome: Hey {{recipient_name}}, you're invited to join Eagleburger Band! Complete onboarding & claim your account: {{invite_url}}",
    smsRecommended: false,
    suggestedAudience: "direct_invite",
    supportedTokens: ["{{recipient_name}}", "{{invite_url}}", "{{band_name}}"],
  },

  contact_thank_you: {
    type: "contact_thank_you",
    title: "Client & Venue Thank-You",
    badge: "CRM & Relations",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    description: "Follow up with parade marshals, festival directors, and event clients after successful performances.",
    defaultSubject: "Thank You from the Eagleburger Band! — {{gig_title}}",
    defaultHtmlBody: `<h2>Thank You for Having the Eagleburger Band!</h2>
<p>Dear <strong>{{recipient_name}}</strong>,</p>
<p>On behalf of all the musicians of the <strong>Eagleburger Band</strong>, thank you for welcoming us to perform at <strong>{{gig_title}}</strong> on {{gig_date}}!</p>
<p>Our brass and percussion sections had an absolute blast bringing high-energy street music and revelry to your event and audience.</p>
<div style="background-color: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #38bdf8;">
  <p style="margin: 0; font-size: 14px; color: #f8fafc;"><strong>Looking Ahead:</strong></p>
  <p style="margin: 8px 0 0 0; font-size: 13px; color: #cbd5e1;">
    We would love to partner with you again for upcoming celebrations, festivals, or private dates. Recurring dates often fill up months in advance, so feel free to reach out anytime to lock in future dates.
  </p>
</div>
<p>If you have any feedback or performance photos you'd like to share, please reply directly to this email.</p>
<p style="text-align: center; margin: 24px 0;">
  <a href="https://eagleburgerband.org/book" style="background-color: #38bdf8; color: #020617; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
    Inquire About Future Bookings &rarr;
  </a>
</p>
<p>Warm regards,<br /><strong>The Eagleburger Band Management Team</strong><br /><span style="font-size: 12px; color: #94a3b8;">https://eagleburgerband.org</span></p>`,
    defaultSmsBody: "EBB Thanks: Thank you {{recipient_name}} for hosting the Eagleburger Band at {{gig_title}}! Inquire for future dates: https://eagleburgerband.org/book",
    smsRecommended: false,
    suggestedAudience: "crm_contact",
    supportedTokens: ["{{recipient_name}}", "{{gig_title}}", "{{gig_date}}", "{{venue}}", "{{band_name}}"],
  },

  gig_details: {
    type: "gig_details",
    title: "Upcoming Gig Briefing & Call Sheet",
    badge: "Call Sheet Dispatch",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    description: "Detailed performance itinerary, downbeat, staging location, map coordinates, uniform, and setlist notes.",
    defaultSubject: "Gig Briefing & Call Sheet: {{gig_title}} — {{gig_date}}",
    defaultHtmlBody: `<h2>Performance Call Sheet: {{gig_title}}</h2>
<p>Hey Musicians,</p>
<p>Here are the finalized logistics for our upcoming appearance at <strong>{{gig_title}}</strong> on <strong>{{gig_date}}</strong>. Please review all call times, staging locations, and uniform requirements carefully.</p>

<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
  <tr style="border-bottom: 1px solid #334155;">
    <td style="padding: 8px 0; color: #94a3b8; width: 140px;"><strong>Performance Date:</strong></td>
    <td style="padding: 8px 0; color: #f8fafc;"><strong>{{gig_date}}</strong></td>
  </tr>
  <tr style="border-bottom: 1px solid #334155;">
    <td style="padding: 8px 0; color: #94a3b8;"><strong>Musician Call Time:</strong></td>
    <td style="padding: 8px 0; color: #f59e0b; font-weight: bold;">{{call_time}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #334155;">
    <td style="padding: 8px 0; color: #94a3b8;"><strong>Downbeat / Step-Off:</strong></td>
    <td style="padding: 8px 0; color: #10b981; font-weight: bold;">{{downbeat}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #334155;">
    <td style="padding: 8px 0; color: #94a3b8;"><strong>Venue / Location:</strong></td>
    <td style="padding: 8px 0; color: #f8fafc;">{{venue}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #334155;">
    <td style="padding: 8px 0; color: #94a3b8;"><strong>Staging / Parking:</strong></td>
    <td style="padding: 8px 0; color: #f8fafc;">{{staging_address}}</td>
  </tr>
</table>

<div style="background-color: #1e293b; padding: 14px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 0 0 6px 0; font-size: 13px; color: #f59e0b;"><strong>Attire Guidelines:</strong></p>
  <p style="margin: 0; font-size: 12px; color: #cbd5e1;">Official Eagleburger black performance shirt, dark jeans or trousers, brass sunglasses, and sturdy marching sneakers.</p>
</div>

<p style="text-align: center; margin: 24px 0;">
  <a href="https://eagleburgerband.org/portal/gigs" style="background-color: #f59e0b; color: #020617; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
    View Live Call Sheet in Gig Central &rarr;
  </a>
</p>
<p>Arrive on time, warmed up, and ready to play!<br /><strong>Gig Operations & Stage Managers</strong></p>`,
    defaultSmsBody: "EBB Briefing: {{gig_title}} on {{gig_date}}. Call: {{call_time}} | Downbeat: {{downbeat}} at {{venue}}. Staging: {{staging_address}}. Full info: https://eagleburgerband.org/portal/gigs",
    smsRecommended: true,
    suggestedAudience: "gig_attending",
    supportedTokens: ["{{recipient_name}}", "{{gig_title}}", "{{gig_date}}", "{{call_time}}", "{{downbeat}}", "{{venue}}", "{{staging_address}}"],
  },

  rsvp_request: {
    type: "rsvp_request",
    title: "New Gig RSVP Request & Roll Call",
    badge: "Attendance Telemetry",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    description: "Alert musicians to newly booked performances and request immediate attendance confirmation.",
    defaultSubject: "Action Required: Confirm Your Attendance for {{gig_title}} ({{gig_date}})",
    defaultHtmlBody: `<h2>New Gig Announced: RSVP Required</h2>
<p>Hey <strong>{{recipient_name}}</strong>,</p>
<p>A new performance has been confirmed for the Eagleburger Band calendar! Section leaders are auditing instrumentation depth right now and need your attendance commitment.</p>

<div style="background-color: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #334155;">
  <h3 style="margin: 0 0 8px 0; color: #f8fafc;">{{gig_title}}</h3>
  <p style="margin: 0 0 4px 0; font-size: 13px; color: #cbd5e1;"><strong>Date:</strong> {{gig_date}}</p>
  <p style="margin: 0 0 4px 0; font-size: 13px; color: #cbd5e1;"><strong>Venue:</strong> {{venue}}</p>
  <p style="margin: 0; font-size: 13px; color: #cbd5e1;"><strong>Estimated Call Time:</strong> {{call_time}}</p>
</div>

<p>Please take 5 seconds to mark your status so your section leader can balance lead, rhythm, and low brass parts:</p>
<p style="text-align: center; margin: 24px 0;">
  <a href="https://eagleburgerband.org/portal/gigs" style="background-color: #a855f7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
    Submit Your RSVP in Gig Central &rarr;
  </a>
</p>
<p style="font-size: 12px; color: #94a3b8;">Even if your status is tentative, submitting now helps gig coordinators gauge section viability.</p>
<p>Thank you,<br /><strong>The Personnel & Gig Operations Team</strong></p>`,
    defaultSmsBody: "EBB RSVP: Roll call for {{gig_title}} on {{gig_date}} (Call: {{call_time}}). Please confirm attendance now: https://eagleburgerband.org/portal/gigs",
    smsRecommended: true,
    suggestedAudience: "all_band",
    supportedTokens: ["{{recipient_name}}", "{{gig_title}}", "{{gig_date}}", "{{venue}}", "{{call_time}}"],
  },

  gig_update: {
    type: "gig_update",
    title: "Urgent Gig Logistics Update",
    badge: "Urgent Alert",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    description: "High-priority alert for weather shifts, schedule slips, parking reassignments, or emergency notices.",
    defaultSubject: "URGENT LOGISTICS UPDATE: {{gig_title}} ({{gig_date}})",
    defaultHtmlBody: `<div style="background-color: rgba(244, 63, 94, 0.1); border: 2px solid #f43f5e; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
  <h2 style="margin: 0 0 6px 0; color: #f43f5e; font-size: 18px;">Emergency Schedule / Logistics Update</h2>
  <p style="margin: 0; font-size: 13px; color: #fecdd3;"><strong>Important operational changes for {{gig_title}} on {{gig_date}}. Please read immediately.</strong></p>
</div>

<p>Hey Musicians,</p>
<p>Please note the following logistics adjustment for today's performance at <strong>{{gig_title}}</strong>:</p>

<div style="background-color: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f43f5e;">
  <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: bold;">Key Logistics Changes:</p>
  <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #cbd5e1;">
    <li><strong>Updated Call Time:</strong> {{call_time}}</li>
    <li><strong>Updated Staging / Loading:</strong> {{staging_address}}</li>
    <li><strong>Weather / Venue Note:</strong> Acoustic street route modified due to weather/traffic. Follow section leader cues.</li>
  </ul>
</div>

<p style="text-align: center; margin: 24px 0;">
  <a href="https://eagleburgerband.org/portal/gigs" style="background-color: #f43f5e; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
    Acknowledge Live in Gig Central &rarr;
  </a>
</p>
<p>Stay safe and keep your brass and drums dry,<br /><strong>Gig Operations & Incident Response</strong></p>`,
    defaultSmsBody: "URGENT EBB ALERT: Logistics change for {{gig_title}} ({{gig_date}}). Call: {{call_time}} | Staging: {{staging_address}}. Check portal now: https://eagleburgerband.org/portal/gigs",
    smsRecommended: true,
    suggestedAudience: "gig_attending",
    supportedTokens: ["{{recipient_name}}", "{{gig_title}}", "{{gig_date}}", "{{call_time}}", "{{staging_address}}"],
  },

  custom_broadcast: {
    type: "custom_broadcast",
    title: "Custom Band Broadcast",
    badge: "General Communications",
    badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    description: "Free-form communication with full WYSIWYG authoring for general announcements, rehearsal notes, and social events.",
    defaultSubject: "Eagleburger Band Announcement: Important Band Update",
    defaultHtmlBody: `<h2>Eagleburger Band Announcement</h2>
<p>Hey <strong>{{recipient_name}}</strong>,</p>
<p>Here is an update regarding upcoming band business, rehearsal schedules, and community events.</p>
<div style="background-color: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 0; font-size: 13px; color: #e2e8f0;">[Write your announcement details here. You can format with bold, lists, headings, and links.]</p>
</div>
<p>If you have any questions, reach out to your section leader or reply to this message.</p>
<p>Best,<br /><strong>The Eagleburger Band Executive Board</strong></p>`,
    defaultSmsBody: "EBB Announcement: Hey {{recipient_name}}, an important band dispatch was posted to the musician portal: https://eagleburgerband.org/portal",
    smsRecommended: true,
    suggestedAudience: "all_band",
    supportedTokens: ["{{recipient_name}}", "{{band_name}}"],
  },
};

export interface TokenValues {
  recipient_name?: string;
  band_name?: string;
  gig_title?: string;
  gig_date?: string;
  call_time?: string;
  downbeat?: string;
  venue?: string;
  staging_address?: string;
  invite_url?: string;
  [key: string]: string | undefined;
}

export function interpolateEmailVariables(content: string, tokens: TokenValues): string {
  let result = content;
  const map: Record<string, string> = {
    "{{recipient_name}}": tokens.recipient_name || "Musician",
    "{{band_name}}": tokens.band_name || "The Eagleburger Band",
    "{{gig_title}}": tokens.gig_title || "Upcoming Gig",
    "{{gig_date}}": tokens.gig_date || "Upcoming Date",
    "{{call_time}}": tokens.call_time || "TBD",
    "{{downbeat}}": tokens.downbeat || "TBD",
    "{{venue}}": tokens.venue || "Performance Staging",
    "{{staging_address}}": tokens.staging_address || "See Call Sheet for GPS coordinates",
    "{{invite_url}}": tokens.invite_url || "https://eagleburgerband.org/portal",
  };

  Object.entries(map).forEach(([key, val]) => {
    result = result.replaceAll(key, val);
  });

  return result;
}

export function wrapInBrandedEmailHtml(innerHtml: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 600px; margin: 24px auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 24px; border-bottom: 2px solid #f59e0b; text-align: center; }
    .logo-badge { display: inline-block; background-color: #f59e0b; color: #020617; font-size: 11px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 8px; }
    .band-title { margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .band-subtitle { margin: 4px 0 0 0; color: #94a3b8; font-size: 12px; }
    .content { padding: 32px 24px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .content h2 { color: #f8fafc; font-size: 18px; margin-top: 0; font-weight: 700; }
    .content h3 { color: #f8fafc; font-size: 15px; margin-top: 16px; }
    .content a { color: #f59e0b; text-decoration: underline; }
    .footer { background-color: #090d16; padding: 20px 24px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; line-height: 1.5; }
    .footer a { color: #94a3b8; text-decoration: none; margin: 0 8px; }
    .footer a:hover { color: #f59e0b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-badge">Official Dispatch</div>
      <h1 class="band-title">The Eagleburger Band</h1>
      <p class="band-subtitle">Pittsburgh's High-Energy Mobile Street Brass & Drums</p>
    </div>
    <div class="content">
      ${innerHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">This official band communication was dispatched via the Eagleburger Musician Portal.</p>
      <p style="margin: 0;">
        <a href="https://eagleburgerband.org/portal">Musician Portal</a> &bull;
        <a href="https://eagleburgerband.org/portal/gigs">Gig Central</a> &bull;
        <a href="https://eagleburgerband.org">Public Website</a>
      </p>
      <p style="margin: 8px 0 0 0; color: #475569;">&copy; ${new Date().getFullYear()} The Eagleburger Band. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
