"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { User, SHIRT_SIZES } from "@/lib/schema/user";
import { Section, SectionSchema } from "@/lib/schema/section";
import { logAdminAction } from "@/lib/logging/adminLogger";
import { toast } from "@/lib/context/ToastContext";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
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
  ShieldCheck,
  Eye,
  EyeOff,
  Info,
  Undo2,
  Check,
  Shirt,
} from "lucide-react";
import PortalPwaCard from "@/components/portal/PortalPwaCard";
import UnsavedChangesBar from "@/components/portal/UnsavedChangesBar";

interface ProfileFormProps {
  profile: User;
}

interface FormValues {
  displayName: string;
  realName: string;
  shirtSize: string;
  selectedInstrument: string;
  phone: string;
  smsConsent: boolean;
  hideEmailInRoster: boolean;
  hidePhoneInRoster: boolean;
  preferredMethod: "venmo" | "paypal" | "zelle" | "check" | "other";
  venmoHandle: string;
  paypalEmail: string;
  zelleIdentifier: string;
  payoutNotes: string;
}

function getInitialValues(p: User): FormValues {
  return {
    displayName: p.displayName || "",
    realName: p.realName || "",
    shirtSize: p.shirtSize || "",
    selectedInstrument: p.selectedInstrument || p.instruments?.[0] || "",
    phone: p.phone || "",
    smsConsent: Boolean(p.smsConsent),
    hideEmailInRoster: Boolean(p.hideEmailInRoster),
    hidePhoneInRoster: Boolean(p.hidePhoneInRoster),
    preferredMethod: (p.payoutPreferences?.preferredMethod || "venmo") as FormValues["preferredMethod"],
    venmoHandle: p.payoutPreferences?.venmoHandle || "",
    paypalEmail: p.payoutPreferences?.paypalEmail || "",
    zelleIdentifier: p.payoutPreferences?.zelleIdentifier || "",
    payoutNotes: p.payoutPreferences?.notes || "",
  };
}

function ProfileForm({ profile }: ProfileFormProps) {
  const [savedValues, setSavedValues] = useState<FormValues>(() => getInitialValues(profile));

  const [displayName, setDisplayName] = useState(savedValues.displayName);
  const [realName, setRealName] = useState(savedValues.realName);
  const [shirtSize, setShirtSize] = useState(savedValues.shirtSize);
  const [selectedInstrument, setSelectedInstrument] = useState(savedValues.selectedInstrument);
  const [phone, setPhone] = useState(savedValues.phone);
  const [smsConsent, setSmsConsent] = useState(savedValues.smsConsent);
  const [hideEmailInRoster, setHideEmailInRoster] = useState(savedValues.hideEmailInRoster);
  const [hidePhoneInRoster, setHidePhoneInRoster] = useState(savedValues.hidePhoneInRoster);
  const [preferredMethod, setPreferredMethod] = useState(savedValues.preferredMethod);
  const [venmoHandle, setVenmoHandle] = useState(savedValues.venmoHandle);
  const [paypalEmail, setPaypalEmail] = useState(savedValues.paypalEmail);
  const [zelleIdentifier, setZelleIdentifier] = useState(savedValues.zelleIdentifier);
  const [payoutNotes, setPayoutNotes] = useState(savedValues.payoutNotes);

  const [userSection, setUserSection] = useState<Section | null>(null);

  // Subscribe to member's section to get real-time instrument catalog
  useEffect(() => {
    const sectionId = profile.sectionId;
    if (!sectionId) return;

    const unsub = onSnapshot(doc(db, "sections", sectionId), (d) => {
      if (d.exists()) {
        const parsed = SectionSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) {
          setUserSection(parsed.data);
        }
      }
    });

    return () => {
      unsub();
      setUserSection(null);
    };
  }, [profile.sectionId]);

  // Available instruments combining section catalog and member qualifications
  const availableInstruments = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const add = (inst: string) => {
      const clean = (inst || "").trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        list.push(clean);
      }
    };

    (userSection?.instruments || []).forEach(add);
    (profile.instruments || []).forEach(add);
    if (selectedInstrument) add(selectedInstrument);

    return list;
  }, [userSection, profile.instruments, selectedInstrument]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute dirty state by comparing current form values against last saved baseline
  const isDirty = useMemo(() => {
    return (
      displayName !== savedValues.displayName ||
      realName !== savedValues.realName ||
      shirtSize !== savedValues.shirtSize ||
      selectedInstrument !== savedValues.selectedInstrument ||
      phone !== savedValues.phone ||
      smsConsent !== savedValues.smsConsent ||
      hideEmailInRoster !== savedValues.hideEmailInRoster ||
      hidePhoneInRoster !== savedValues.hidePhoneInRoster ||
      preferredMethod !== savedValues.preferredMethod ||
      venmoHandle !== savedValues.venmoHandle ||
      paypalEmail !== savedValues.paypalEmail ||
      zelleIdentifier !== savedValues.zelleIdentifier ||
      payoutNotes !== savedValues.payoutNotes
    );
  }, [
    displayName,
    realName,
    shirtSize,
    selectedInstrument,
    phone,
    smsConsent,
    hideEmailInRoster,
    hidePhoneInRoster,
    preferredMethod,
    venmoHandle,
    paypalEmail,
    zelleIdentifier,
    payoutNotes,
    savedValues,
  ]);

  // Protect against accidental window closing/navigation when changes are unsaved
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Discard changes and revert back to last saved baseline
  const handleDiscardChanges = () => {
    setDisplayName(savedValues.displayName);
    setRealName(savedValues.realName);
    setShirtSize(savedValues.shirtSize);
    setSelectedInstrument(savedValues.selectedInstrument);
    setPhone(savedValues.phone);
    setSmsConsent(savedValues.smsConsent);
    setHideEmailInRoster(savedValues.hideEmailInRoster);
    setHidePhoneInRoster(savedValues.hidePhoneInRoster);
    setPreferredMethod(savedValues.preferredMethod);
    setVenmoHandle(savedValues.venmoHandle);
    setPaypalEmail(savedValues.paypalEmail);
    setZelleIdentifier(savedValues.zelleIdentifier);
    setPayoutNotes(savedValues.payoutNotes);
    toast.info("Unsaved changes discarded.");
  };

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
      toast.success("Membership status updated to inactive.");
    } catch (err) {
      toast.error("Failed to deactivate membership: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLeavingBand(false);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile.uid || !isDirty || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const trimmedPhone = phone.trim();
      const updatedTimestamp = new Date().toISOString();
      const nextDisplayName = displayName.trim() || profile.displayName || "Musician";
      const nextRealName = realName.trim();
      const nextSelectedInstrument = selectedInstrument.trim();

      const updatedInstruments = nextSelectedInstrument
        ? Array.from(new Set([nextSelectedInstrument, ...(profile.instruments || [])]))
        : profile.instruments || [];

      // Ensure validation via schema
      const partialUpdate: Partial<User> = {
        displayName: nextDisplayName,
        realName: nextRealName,
        shirtSize: shirtSize.trim(),
        selectedInstrument: nextSelectedInstrument,
        instruments: updatedInstruments,
        phone: trimmedPhone,
        smsConsent: Boolean(smsConsent && trimmedPhone.length > 0),
        smsConsentUpdatedAt: updatedTimestamp,
        hideEmailInRoster: Boolean(hideEmailInRoster),
        hidePhoneInRoster: Boolean(hidePhoneInRoster),
        payoutPreferences: {
          preferredMethod: preferredMethod as FormValues["preferredMethod"],
          venmoHandle: venmoHandle.trim(),
          paypalEmail: paypalEmail.trim(),
          zelleIdentifier: zelleIdentifier.trim(),
          notes: payoutNotes.trim(),
        },
        updatedAt: updatedTimestamp,
      };

      await updateDoc(doc(db, "users", profile.uid), partialUpdate);

      // Advance baseline snapshot to newly saved values
      const newSavedValues: FormValues = {
        displayName: nextDisplayName,
        realName: nextRealName,
        shirtSize: shirtSize.trim(),
        selectedInstrument: nextSelectedInstrument,
        phone: trimmedPhone,
        smsConsent: Boolean(smsConsent && trimmedPhone.length > 0),
        hideEmailInRoster: Boolean(hideEmailInRoster),
        hidePhoneInRoster: Boolean(hidePhoneInRoster),
        preferredMethod: preferredMethod as FormValues["preferredMethod"],
        venmoHandle: venmoHandle.trim(),
        paypalEmail: paypalEmail.trim(),
        zelleIdentifier: zelleIdentifier.trim(),
        payoutNotes: payoutNotes.trim(),
      };

      setSavedValues(newSavedValues);
      setDisplayName(newSavedValues.displayName);
      setRealName(newSavedValues.realName);
      setShirtSize(newSavedValues.shirtSize);
      setSelectedInstrument(newSavedValues.selectedInstrument);
      setPhone(newSavedValues.phone);
      setSmsConsent(newSavedValues.smsConsent);
      setVenmoHandle(newSavedValues.venmoHandle);
      setPaypalEmail(newSavedValues.paypalEmail);
      setZelleIdentifier(newSavedValues.zelleIdentifier);
      setPayoutNotes(newSavedValues.payoutNotes);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      toast.success("Profile & SMS preferences saved successfully!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      const msg = err instanceof Error ? err.message : "Failed to update profile preferences.";
      setErrorMessage(msg);
      toast.error(`Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`p-4 sm:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in transition-all ${isDirty ? "pb-28 sm:pb-32" : ""}`}>
      {/* Top Header & Breadcrumb */}
      <div className="space-y-1">
        <PortalBreadcrumb />
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

      <form id="profileForm" onSubmit={handleSaveProfile} className="space-y-6">
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
                Display Name * (Stage Moniker / Portal Handle)
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
              <p className="text-[10px] text-slate-500 mt-1">This name appears throughout the portal, call sheets, attendance roll calls, and setlists.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Real Name (Legal / Full Name)
              </label>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="e.g. Jordan Alexander Davis"
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="w-full border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
              />
              <p className="text-[10px] text-slate-500 mt-1">Your legal name for management rosters, tax receipts, and direct payout verifications.</p>
            </div>
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

          {/* Section & Active Gig Instrument Selection */}
          <div className="space-y-4 pt-4 border-t" style={{ borderColor: "var(--ebb-border)" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span>Assigned Section &amp; Active Gig Instrument</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select your active instrument from your section. You can switch this at any time for different gigs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Section:</span>
                <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center gap-1">
                  <Music className="w-3 h-3" />
                  {userSection?.name || (profile.sectionId ? profile.sectionId.toUpperCase() : "General Ensemble")}
                </span>
              </div>
            </div>

            {/* Instrument Selection Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">
                  Select Active Instrument for Gigs:
                </span>
                {selectedInstrument && (
                  <span className="text-[11px] text-amber-400 font-medium">
                    Current: <strong className="text-white">{selectedInstrument}</strong>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {availableInstruments.map((inst) => {
                  const isSelected = selectedInstrument === inst;
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => setSelectedInstrument(inst)}
                      className={`text-xs px-3 py-2 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                        isSelected
                          ? "bg-amber-400/15 border-amber-400 text-amber-300 font-bold shadow-xs ring-1 ring-amber-400/30"
                          : "bg-black/20 hover:bg-white/5 border-slate-700/80 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? "bg-amber-400 border-amber-400 text-slate-950"
                            : "border-slate-600"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-3" />}
                      </div>
                      <span>{inst}</span>
                      {isSelected && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
                {availableInstruments.length === 0 && (
                  <div className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-2 w-full">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      No instruments configured in your section catalog yet. Your section leader or an administrator can add instruments in the Section Studio.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Band Apparel & Shirt Size Preference */}
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: "var(--ebb-border)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-amber-400" />
                    <span>Band Apparel &amp; Shirt Size Preference</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select your shirt size for band t-shirts, uniforms, and official tour merchandise.
                  </p>
                </div>

                {shirtSize && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Selected:</span>
                    <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20 font-mono">
                      {shirtSize}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShirtSize("")}
                      className="text-[11px] text-slate-400 hover:text-rose-400 underline cursor-pointer ml-1"
                      title="Clear shirt size preference"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {SHIRT_SIZES.map((size) => {
                  const isSelected = shirtSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setShirtSize(isSelected ? "" : size)}
                      className={`text-xs px-3.5 py-2 rounded-xl border flex items-center gap-2 transition cursor-pointer font-medium ${
                        isSelected
                          ? "bg-amber-400/15 border-amber-400 text-amber-300 font-bold shadow-xs ring-1 ring-amber-400/30"
                          : "bg-black/20 hover:bg-white/5 border-slate-700/80 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? "bg-amber-400 border-amber-400 text-slate-950"
                            : "border-slate-600"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-3" />}
                      </div>
                      <span className="font-mono font-bold">{size}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RBAC Roles Info Chips */}
            <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">Active Portal Permissions (RBAC):</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {(profile.roles || ["member"]).map((r, idx) => (
                  <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md font-bold capitalize bg-slate-800 text-slate-200 border border-slate-700">
                    {r.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Device & Progressive Web App (PWA) Hub */}
        <PortalPwaCard />

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

        {/* Section: Directory Privacy & Contact Visibility */}
        <div 
          style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
          className="border rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--ebb-border)" }}>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Directory Privacy & Contact Visibility</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    hideEmailInRoster && hidePhoneInRoster
                      ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                      : hideEmailInRoster || hidePhoneInRoster
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  }`}>
                    {hideEmailInRoster && hidePhoneInRoster 
                      ? "Fully Private" 
                      : hideEmailInRoster || hidePhoneInRoster 
                      ? "Partially Private" 
                      : "Directory Visible"}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Control whether your email address and phone number are visible to fellow musicians in the Member Directory (<Link href="/portal/roster" className="text-amber-400 hover:underline">/portal/roster</Link>).
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Leadership Access Guarantee Banner */}
            <div
              className="p-3.5 rounded-xl border flex items-start gap-2.5 text-xs text-slate-300"
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                borderColor: "rgba(59, 130, 246, 0.25)",
              }}
            >
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-sky-300">Leadership Access Notice:</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Band administrators, section leaders, and gig coordinators always retain administrative access to your verified contact information so they can send official downbeat call sheets and emergency schedule changes.
                </p>
              </div>
            </div>

            {/* Privacy Toggles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Toggle 1: Email Address Privacy */}
              <div
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="border rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      <span>Email Privacy</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setHideEmailInRoster(!hideEmailInRoster)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        hideEmailInRoster ? "bg-purple-600" : "bg-slate-700"
                      }`}
                      role="switch"
                      aria-checked={hideEmailInRoster}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          hideEmailInRoster ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Hide your email address from fellow band members in the member directory and help documents.
                  </p>
                </div>

                <div className="text-[10px] font-mono pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500">Directory status:</span>
                  <span className={hideEmailInRoster ? "text-purple-400 font-bold" : "text-emerald-400 font-medium"}>
                    {hideEmailInRoster ? "Hidden (Private)" : "Visible to Members"}
                  </span>
                </div>
              </div>

              {/* Toggle 2: Phone Number Privacy */}
              <div
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="border rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>Phone Privacy</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setHidePhoneInRoster(!hidePhoneInRoster)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        hidePhoneInRoster ? "bg-purple-600" : "bg-slate-700"
                      }`}
                      role="switch"
                      aria-checked={hidePhoneInRoster}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          hidePhoneInRoster ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Hide your phone number from the member roster. You will still receive SMS alerts if opted into SMS above.
                  </p>
                </div>

                <div className="text-[10px] font-mono pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500">Directory status:</span>
                  <span className={hidePhoneInRoster ? "text-purple-400 font-bold" : "text-emerald-400 font-medium"}>
                    {hidePhoneInRoster ? "Hidden (Private)" : "Visible to Members"}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Directory Preview Box */}
            <div
              className="p-3.5 rounded-xl border bg-slate-950/60 border-slate-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Preview: What Fellow Band Members See In /portal/roster</span>
                </span>
                <span className="font-mono text-[10px] text-slate-500">Live Preview</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/90 space-y-1.5 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {hideEmailInRoster ? (
                    <span className="text-slate-500 italic flex items-center gap-1 font-sans">
                      <span>Email Private</span>
                      <EyeOff className="w-3 h-3 text-slate-600" />
                    </span>
                  ) : (
                    <span className="text-slate-300">{profile.email}</span>
                  )}
                </div>
                {phone.trim() ? (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    {hidePhoneInRoster ? (
                      <span className="text-slate-500 italic flex items-center gap-1 font-sans">
                        <span>Phone Private</span>
                        <EyeOff className="w-3 h-3 text-slate-600" />
                      </span>
                    ) : (
                      <span className="text-slate-300">{phone}</span>
                    )}
                  </div>
                ) : null}
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

          <div className="flex items-center gap-3">
            {isDirty && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Discard Changes</span>
              </button>
            )}

            <button
              type="submit"
              disabled={!isDirty || isSaving}
              className={`font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-md ${
                !isDirty
                  ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed"
                  : "bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer shadow-amber-500/20"
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Preferences...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isDirty ? "Save Profile & SMS Preferences" : "Saved (No Changes)"}</span>
                </>
              )}
            </button>
          </div>
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

      {/* Sticky Bottom Bar for Unsaved Changes */}
      <UnsavedChangesBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={() => handleSaveProfile()}
        onDiscard={handleDiscardChanges}
        formId="profileForm"
        message="You have unsaved profile changes"
        subMessage="Save your updates or discard to restore saved settings."
        saveLabel="Save Profile Preferences"
        savingLabel="Saving Profile..."
        discardLabel="Discard"
      />
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
