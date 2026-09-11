"use client";

import React, { useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { User } from "@/lib/schema/user";
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
  ChevronRight
} from "lucide-react";

interface ProfileFormProps {
  profile: User;
}

function ProfileForm({ profile }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(() => profile.displayName || "");
  const [phone, setPhone] = useState(() => profile.phone || "");
  const [smsConsent, setSmsConsent] = useState(() => Boolean(profile.smsConsent));
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
