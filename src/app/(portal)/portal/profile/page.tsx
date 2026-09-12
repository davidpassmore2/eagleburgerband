"use client";

import React, { useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { User } from "@/lib/schema/user";
import { logAdminAction } from "@/lib/logging/adminLogger";
import { 
  User as UserIcon, 
  Phone, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  Smartphone, 
  Music, 
  AlertCircle,
  Save,
  Loader2,
  ChevronRight,
  Receipt,
  AlertTriangle,
  UserMinus,
  X,
} from "lucide-react";

interface ProfileFormProps {
  profile: User;
}

function ProfileForm({ profile }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(() => profile.displayName || "");
  const [phone, setPhone] = useState(() => profile.phone || "");
  const [smsConsent, setSmsConsent] = useState(() => Boolean(profile.smsConsent));
  const [preferredMethod, setPreferredMethod] = useState(
    () => profile.payoutPreferences?.preferredMethod || "venmo"
  );
  const [venmoHandle, setVenmoHandle] = useState(
    () => profile.payoutPreferences?.venmoHandle || ""
  );
  const [paypalEmail, setPaypalEmail] = useState(
    () => profile.payoutPreferences?.paypalEmail || ""
  );
  const [zelleIdentifier, setZelleIdentifier] = useState(
    () => profile.payoutPreferences?.zelleIdentifier || ""
  );
  const [payoutNotes, setPayoutNotes] = useState(
    () => profile.payoutPreferences?.notes || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Membership Status & Departure State
  const [currentStatus, setCurrentStatus] = useState(() => profile.status || "active");
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [isLeavingBand, setIsLeavingBand] = useState(false);
  const [departureSuccess, setDepartureSuccess] = useState(false);

  const handleConfirmLeaveBand = async () => {
    if (!profile.uid) return;
    setIsLeavingBand(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        status: "inactive",
        updatedAt: new Date().toISOString(),
      });
      await logAdminAction({
        action: "member_self_deactivated",
        category: "personnel",
        actor: {
          uid: profile.uid,
          displayName: profile.displayName || "Member",
          email: profile.email || "",
        },
        targetId: profile.uid,
        targetName: profile.displayName || "Member",
        description: `Member ${profile.displayName || profile.email} voluntarily departed the band (self-deactivated). Reason: ${leaveReason.trim() || "No reason provided"}`,
        metadata: {
          reason: leaveReason.trim() || null,
          previousStatus: currentStatus,
          newStatus: "inactive",
        },
      });
      setCurrentStatus("inactive");
      setIsLeaveModalOpen(false);
      setDepartureSuccess(true);
    } catch (err) {
      alert("Failed to deactivate membership: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLeavingBand(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.uid) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const trimmedPhone = phone.trim();
      const updatedTimestamp = new Date().toISOString();

      // Ensure validation via schema
      const partialUpdate: Partial<User> = {
        displayName: displayName.trim() || profile.displayName || "Musician",
        phone: trimmedPhone,
        smsConsent: Boolean(smsConsent && trimmedPhone.length > 0),
        smsConsentUpdatedAt: updatedTimestamp,
        payoutPreferences: {
          preferredMethod: preferredMethod as "venmo" | "paypal" | "zelle" | "check" | "other",
          venmoHandle: venmoHandle.trim(),
          paypalEmail: paypalEmail.trim(),
          zelleIdentifier: zelleIdentifier.trim(),
          notes: payoutNotes.trim(),
        },
        updatedAt: updatedTimestamp,
      };

      await updateDoc(doc(db, "users", profile.uid), partialUpdate);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to update profile preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Top Header & Breadcrumb */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/portal" className="hover:text-amber-400 transition">Musician Portal</Link>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-white font-medium">My Profile & SMS Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <UserIcon className="w-7 h-7 text-amber-400" />
          <span>Musician Profile & SMS Preferences</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Manage your personal musician details, register your mobile phone number, and configure SMS text briefing preferences.
        </p>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl p-4 text-xs flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white">Preferences Successfully Updated!</div>
            <div className="text-emerald-300/80">Your mobile contact details and SMS consent status have been saved to your musician account.</div>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl p-4 text-xs flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <div className="font-bold text-white">Failed to Save Preferences</div>
            <div className="text-rose-300/80">{errorMessage}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Performer Information */}
        <div 
          style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
          className="border rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--ebb-border)" }}>
            <div className="flex items-center gap-2.5">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: "var(--ebb-surface-muted)", color: "var(--ebb-primary)" }}
              >
                {profile.displayName?.[0] || "M"}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Musician Identification</h2>
                <p className="text-[11px] text-slate-400">Your portal display identity and verified ensemble roster assignments.</p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold">
              {profile.status || "Active Member"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Display Name *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Jordan Davis"
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="w-full border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
              />
              <p className="text-[10px] text-slate-500 mt-1">This name appears on call sheets, attendance roll calls, and setlists.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Authentication Email
              </label>
              <div 
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="w-full border rounded-xl px-3.5 py-2.5 text-xs text-slate-400 flex items-center gap-2"
              >
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Primary email used for sign-in and formal band broadcasts.</p>
            </div>
          </div>

          {/* Section & RBAC Roles Info Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: "var(--ebb-border)" }}>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Section & Instruments
              </label>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center gap-1">
                  <Music className="w-3 h-3" />
                  {profile.sectionId ? profile.sectionId.toUpperCase() : "General Ensemble"}
                </span>
                {profile.instruments?.map((inst, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded-lg font-medium text-slate-300 bg-slate-800/80 border border-slate-700/60">
                    {inst}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Portal Permissions (RBAC)
              </label>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {(profile.roles || ["member"]).map((r, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded-lg font-bold capitalize bg-slate-800 text-slate-200 border border-slate-700">
                    {r.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: SMS Mobile Briefings & Consent Studio */}
        <div 
          style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
          className="border rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--ebb-border)" }}>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>SMS Mobile Briefings & Urgent Alerts</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    smsConsent && phone.trim().length > 0 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    {smsConsent && phone.trim().length > 0 ? "SMS Active" : "SMS Opted Out"}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Receive high-priority performance alerts, day-of-show call time briefings, weather shifts, and downbeat roll calls.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Phone Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Mobile Phone Number for SMS</span>
                <span className="text-[10px] text-slate-400">Supports US 10-digit mobile numbers</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  placeholder="(412) 555-0199 or 4125550199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                  className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                We will only send text messages related to Eagleburger Band performances, logistics, and rehearsals.
              </p>
            </div>

            {/* Opt-In / Opt-Out Interactive Consent Toggle */}
            <div 
              style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
              className="border rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="smsConsentToggle"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-amber-400 cursor-pointer shrink-0"
                />
                <label htmlFor="smsConsentToggle" className="cursor-pointer space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Opt In to Band SMS Text Briefings & Performance Paging</span>
                    {smsConsent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Yes, I agree to receive urgent day-of-show schedule adjustments, staging updates, call time briefings, and attendance confirmation requests via SMS text messages to the mobile number provided above.
                  </p>
                </label>
              </div>

              {/* Compliance & Opt-Out Notice */}
              <div className="pt-2 border-t border-slate-700/50 text-[10px] text-slate-400 leading-normal space-y-1">
                <p>
                  <strong>Terms & Privacy:</strong> Message and data rates may apply. Frequency varies based on the band&apos;s active performance schedule. You can opt out at any time by unchecking the box above or by contacting band management.
                </p>
                {profile.smsConsentUpdatedAt && (
                  <p className="font-mono text-slate-500">
                    Last consent record updated: {new Date(profile.smsConsentUpdatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Live SMS Preview Simulator */}
            <div className="space-y-2 pt-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Sample SMS Text Briefing Preview</span>
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-w-md">
                <div className="text-[10px] text-slate-500 text-center mb-2 font-mono">
                  Today &bull; From: Eagleburger Dispatch
                </div>
                <div className="bg-amber-400 text-slate-950 rounded-2xl rounded-tl-sm p-3 text-xs shadow-md font-sans leading-relaxed">
                  <p className="font-semibold mb-1">
                    EBB Briefing: Three Rivers Arts Festival
                  </p>
                  <p>
                    Hey {displayName || profile.displayName || "Musician"}! Call Time is 1:15 PM, downbeat 2:00 PM at Point State Park. Staging: Commonwealth Place.
                  </p>
                  <p className="text-[10px] mt-1.5 opacity-80 underline">
                    eagleburgerband.org/portal/gigs
                  </p>
                </div>
                <div className="text-[9px] text-slate-500 text-right mt-1 font-mono">
                  Delivered via SMS
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Reimbursement & Payout Accounts */}
        <div 
          style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
          className="border rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--ebb-border)" }}>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/20">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Reimbursement &amp; Payout Accounts</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-emerald-400 border border-emerald-500/20 font-bold">
                    Direct Payouts
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Provide your Venmo username, PayPal email, or Zelle handle so the Treasurer can disburse expense reimbursements and performance splits.
                </p>
              </div>
            </div>
            <Link
              href="/portal/reimbursements"
              className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1 shrink-0"
            >
              <span>View Requests</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {/* Preferred Method Radio Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Primary Payout Preference
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "venmo", label: "Venmo", badge: "@handle" },
                  { id: "paypal", label: "PayPal", badge: "Email" },
                  { id: "zelle", label: "Zelle", badge: "Phone/Email" },
                  { id: "check", label: "Physical Check", badge: "Mail" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPreferredMethod(m.id as "venmo" | "paypal" | "zelle" | "check" | "other")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      preferredMethod === m.id
                        ? "bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-400/40"
                        : "bg-black/20 hover:bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs">{m.label}</span>
                      {preferredMethod === m.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">{m.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Venmo Handle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Venmo Handle / Username</span>
                <span className="text-[10px] text-slate-500 font-mono">e.g. @David-Passmore</span>
              </label>
              <input
                type="text"
                placeholder="@username"
                value={venmoHandle}
                onChange={(e) => setVenmoHandle(e.target.value)}
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="w-full border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>

            {/* PayPal Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>PayPal Account Email</span>
                <span className="text-[10px] text-slate-500 font-mono">e.g. musician@example.com</span>
              </label>
              <input
                type="email"
                placeholder="musician@example.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="w-full border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Zelle Identifier */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Zelle Registered Phone or Email</span>
                <span className="text-[10px] text-slate-500 font-mono">Mobile number or email</span>
              </label>
              <input
                type="text"
                placeholder="Mobile number or email registered with Zelle"
                value={zelleIdentifier}
                onChange={(e) => setZelleIdentifier(e.target.value)}
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="w-full border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>

            {/* Additional Payout Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mailing Address or Special Payment Instructions (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Apartment number, mailing address for physical checks, or notes for the treasurer..."
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="w-full border rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Submit & Save Footer Bar */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/portal"
            className="text-xs text-slate-400 hover:text-white transition"
          >
            &larr; Return to Musician Portal
          </Link>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-md disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile & SMS Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Membership Status & Departure (Self-Deactivation) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Membership Status
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    currentStatus === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : currentStatus === "inactive"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {currentStatus}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your active roster standing with the Eagleburger Band.
              </p>
            </div>
          </div>
        </div>

        {departureSuccess && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Membership Deactivated</p>
              <p className="text-amber-300/80 mt-0.5">
                Your status has been updated to inactive. If you ever wish to rejoin the active roster, please contact band management.
              </p>
            </div>
          </div>
        )}

        {currentStatus === "inactive" ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
            <p className="text-slate-300 font-medium">
              You are currently listed as an inactive member.
            </p>
            <p>
              Your gig history and performance analytics are preserved. To reactivate your account or rejoin the band, contact a band manager or administrator.
            </p>
          </div>
        ) : (
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-400 max-w-xl">
              <span className="font-semibold text-slate-300">Leaving the Band:</span> You can step down or deactivate your membership at any time. Your historical records and gig attendance will be retained, but you will no longer receive gig alerts or active call sheet assignments.
            </div>
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition flex items-center justify-center gap-2 shrink-0"
            >
              <UserMinus className="w-4 h-4" />
              <span>Leave the Band</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Leaving Band */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Leave the Eagleburger Band?</h3>
                  <p className="text-xs text-slate-400">Voluntary self-deactivation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Are you sure you want to deactivate your active membership?
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Your roster status will change to <strong>Inactive</strong>.</li>
                <li>You will be removed from active gig calls and communications.</li>
                <li>Your prior attendance and payout history will remain saved.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Departure Note or Reason (Optional)
              </label>
              <textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="e.g., Moving out of town, schedule conflict, taking a hiatus..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                disabled={isLeavingBand}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveBand}
                disabled={isLeavingBand}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isLeavingBand ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deactivating...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="w-4 h-4" />
                    <span>Confirm Departure</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MusicianProfilePage() {
  const { profile, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center gap-2 text-slate-400 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        <span>Loading musician profile and preferences...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Please sign in to the musician portal to manage your profile and SMS settings.</span>
        </div>
      </div>
    );
  }

  return <ProfileForm key={profile.uid} profile={profile} />;
}
