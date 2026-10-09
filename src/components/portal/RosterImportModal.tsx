"use client";

import React, { useState, useRef } from "react";
import { User, UserSchema } from "@/lib/schema/user";
import { Section } from "@/lib/schema/section";
import { InviteSchema } from "@/lib/schema/invite";
import { 
  doc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Check, 
  Mail,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { 
  ParsedRosterMember, 
  parseRosterFromCsv, 
  parseRosterFromJson 
} from "@/lib/portal/rosterDataIo";
import { toast } from "@/lib/context/ToastContext";

interface RosterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsers: User[];
  sections: Section[];
  onImportComplete?: () => void;
}

export default function RosterImportModal({
  isOpen,
  onClose,
  currentUsers,
  sections,
  onImportComplete,
}: RosterImportModalProps) {
  // Step 1: "select" (upload file or paste), Step 2: "preview", Step 3: "complete"
  const [step, setStep] = useState<"select" | "preview" | "complete">("select");
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<"csv" | "json" | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);

  // Parsed items & validation
  const [parsedMembers, setParsedMembers] = useState<ParsedRosterMember[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Import options
  const [updateExisting, setUpdateExisting] = useState(true);
  const [createInvites, setCreateInvites] = useState(true);

  // Execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [importResult, setImportResult] = useState<{
    addedCount: number;
    updatedCount: number;
    invitesCount: number;
    failedCount: number;
  }>({ addedCount: 0, updatedCount: 0, invitesCount: 0, failedCount: 0 });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Existing user email lookup map
  const existingEmailMap = new Map<string, User>();
  currentUsers.forEach((u) => {
    if (u.email) {
      existingEmailMap.set(u.email.toLowerCase().trim(), u);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      const isJson = file.name.toLowerCase().endsWith(".json") || content.trim().startsWith("{") || content.trim().startsWith("[");
      setFileType(isJson ? "json" : "csv");

      try {
        let members: ParsedRosterMember[] = [];
        if (isJson) {
          members = parseRosterFromJson(content, sections);
        } else {
          members = parseRosterFromCsv(content, sections);
        }

        if (members.length === 0) {
          setParseError("No valid roster records could be identified in the file.");
        } else {
          setParsedMembers(members);
          setStep("preview");
        }
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Failed to parse file.");
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setParseError("Could not read the selected file.");
      setIsParsing(false);
    };

    reader.readAsText(file);
  };

  const handlePasteParse = () => {
    if (!rawText.trim()) {
      setParseError("Please paste CSV or JSON content first.");
      return;
    }

    setParseError(null);
    setIsParsing(true);
    const isJson = rawText.trim().startsWith("{") || rawText.trim().startsWith("[");
    setFileType(isJson ? "json" : "csv");
    setFileName(isJson ? "pasted-roster.json" : "pasted-roster.csv");

    try {
      let members: ParsedRosterMember[] = [];
      if (isJson) {
        members = parseRosterFromJson(rawText, sections);
      } else {
        members = parseRosterFromCsv(rawText, sections);
      }

      if (members.length === 0) {
        setParseError("No valid member records found in the pasted text.");
      } else {
        setParsedMembers(members);
        setStep("preview");
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse text.");
    } finally {
      setIsParsing(false);
    }
  };

  // Analyze preview statistics
  const validMembers = parsedMembers.filter((m) => !m.errors || m.errors.length === 0);
  const invalidMembers = parsedMembers.filter((m) => m.errors && m.errors.length > 0);

  const newMembersCount = validMembers.filter(
    (m) => !existingEmailMap.has(m.email.toLowerCase().trim())
  ).length;

  const existingMembersCount = validMembers.filter((m) =>
    existingEmailMap.has(m.email.toLowerCase().trim())
  ).length;

  // Execute the import into Firestore
  const handleExecuteImport = async () => {
    if (validMembers.length === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: validMembers.length });

    let addedCount = 0;
    let updatedCount = 0;
    let invitesCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validMembers.length; i++) {
      const member = validMembers[i];
      setImportProgress({ current: i + 1, total: validMembers.length });

      const emailKey = member.email.toLowerCase().trim();
      const existingUser = existingEmailMap.get(emailKey);

      try {
        let targetUid = existingUser?.uid;
        let isUpdate = false;

        if (existingUser) {
          if (!updateExisting) {
            continue; // Skip updating this member
          }
          isUpdate = true;
          targetUid = existingUser.uid;
        } else {
          targetUid =
            member.uid ||
            `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }

        // 1. Write or update user profile document
        const userDocRef = doc(db, "users", targetUid);
        const userPayload = {
          schemaVersion: 1,
          uid: targetUid,
          email: emailKey,
          displayName: member.displayName.trim(),
          sectionId: member.sectionId || null,
          instruments: member.instruments || [],
          roles: member.roles.length > 0 ? member.roles : ["member"],
          favoriteToolIds: existingUser?.favoriteToolIds || [],
          portalThemeSchemeId: existingUser?.portalThemeSchemeId || "eagleburger-gold",
          portalThemeMode: existingUser?.portalThemeMode || "dark",
          status: member.status || "active",
          phone: member.phone || existingUser?.phone || "",
          smsConsent: existingUser?.smsConsent ?? false,
          smsConsentUpdatedAt: existingUser?.smsConsentUpdatedAt || "",
          hideEmailInRoster: member.hideEmailInRoster ?? existingUser?.hideEmailInRoster ?? false,
          hidePhoneInRoster: member.hidePhoneInRoster ?? existingUser?.hidePhoneInRoster ?? false,
          payoutPreferences: {
            preferredMethod:
              member.payoutMethod ||
              existingUser?.payoutPreferences?.preferredMethod ||
              "venmo",
            venmoHandle:
              member.venmoHandle ||
              existingUser?.payoutPreferences?.venmoHandle ||
              "",
            paypalEmail:
              member.paypalEmail ||
              existingUser?.payoutPreferences?.paypalEmail ||
              "",
            zelleIdentifier:
              member.zelleIdentifier ||
              existingUser?.payoutPreferences?.zelleIdentifier ||
              "",
            notes: member.notes || existingUser?.payoutPreferences?.notes || "",
          },
          notificationPreferences: existingUser?.notificationPreferences || {
            gigAlerts: true,
            logisticsChanges: true,
            rehearsalNotices: true,
            broadcasts: true,
            suggestionActivity: true,
            emailDigest: false,
            smsEmergencyOnly: true,
            updatedAt: new Date().toISOString(),
          },
          createdAt: existingUser?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const validatedUser = UserSchema.parse(userPayload);
        await setDoc(userDocRef, validatedUser, { merge: true });

        if (isUpdate) {
          updatedCount++;
        } else {
          addedCount++;
        }

        // 2. Optionally create or ensure an active pending invitation record in invites
        if (createInvites) {
          try {
            // Check if an invite already exists for this email
            const invQuery = query(
              collection(db, "invites"),
              where("email", "==", emailKey)
            );
            const invSnap = await getDocs(invQuery);

            if (invSnap.empty) {
              const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
              const invitePayload = {
                token,
                email: emailKey,
                displayName: member.displayName.trim(),
                sectionId: member.sectionId || null,
                instruments: member.instruments || [],
                notes: `Migrated from Beta Roster on ${new Date().toLocaleDateString()}`,
                roles: member.roles.length > 0 ? member.roles : ["member"],
                status: "pending" as const,
                createdAt: new Date().toISOString(),
                claimedAt: null,
                claimedByUid: null,
                revokedAt: null,
                lastEmailSentAt: null,
              };

              const validatedInvite = InviteSchema.parse(invitePayload);
              await setDoc(doc(db, "invites", token), validatedInvite);
              invitesCount++;
            } else {
              // Update pending invites with latest section / instruments / roles
              const pendingDocs = invSnap.docs.filter(
                (d) => d.data().status === "pending"
              );
              for (const pDoc of pendingDocs) {
                await updateDoc(doc(db, "invites", pDoc.id), {
                  displayName: member.displayName.trim(),
                  sectionId: member.sectionId || null,
                  instruments: member.instruments || [],
                  roles: member.roles.length > 0 ? member.roles : ["member"],
                });
                invitesCount++;
              }
            }
          } catch (invErr) {
            console.warn("Could not sync invite for imported user:", emailKey, invErr);
          }
        }
      } catch (err) {
        console.error("Failed to import user:", member.email, err);
        failedCount++;
      }
    }

    setImportResult({
      addedCount,
      updatedCount,
      invitesCount,
      failedCount,
    });

    setIsImporting(false);
    setStep("complete");

    toast.success(
      `Import complete: ${addedCount} added, ${updatedCount} updated${
        createInvites ? `, ${invitesCount} invites generated` : ""
      }!`
    );

    if (onImportComplete) {
      onImportComplete();
    }
  };

  const resetModal = () => {
    setStep("select");
    setFileName("");
    setFileType(null);
    setRawText("");
    setParsedMembers([]);
    setParseError(null);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: SELECT FILE OR PASTE */}
        {step === "select" && (
          <div className="space-y-6 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-yellow-400 tracking-wider">
                    Roster Import &amp; Production Sync
                  </span>
                  <h2 className="text-xl font-bold text-white font-arvo">
                    Import Band Roster
                  </h2>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                Upload a <strong className="text-white">CSV</strong> spreadsheet or <strong className="text-white">JSON</strong> roster export to populate your members, section assignments, instruments, and onboarding invitations.
              </p>
            </div>

            {/* Error Message */}
            {parseError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <div className="font-bold">Parsing Error</div>
                  <div className="text-[11px] opacity-90">{parseError}</div>
                </div>
              </div>
            )}

            {/* Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-yellow-400 rounded-3xl p-8 text-center space-y-3 cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-slate-800 group-hover:bg-yellow-400/20 text-slate-400 group-hover:text-yellow-400 mx-auto flex items-center justify-center transition">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm text-white">
                  Drop your CSV or JSON file here, or click to browse
                </div>
                <div className="text-xs text-slate-400">
                  Supports exported beta rosters, Google Sheets CSVs, or database backups
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-mono text-slate-500">
                <span className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> .CSV
                </span>
                <span className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  <FileCode className="w-3.5 h-3.5 text-yellow-400" /> .JSON
                </span>
              </div>
            </div>

            {/* Paste Alternative */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Or Paste Raw CSV / JSON</span>
                {rawText.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRawText("")}
                    className="text-slate-500 hover:text-rose-400 transition"
                  >
                    Clear
                  </button>
                )}
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Name,Email,Section,Instruments\n"Dave Passmore",davidpassmore@gmail.com,Percussion,"Snare Drum"`}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-yellow-400"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isParsing || !rawText.trim()}
                  onClick={handlePasteParse}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isParsing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Parse Pasted Content</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & CONFIGURE IMPORT */}
        {step === "preview" && (
          <div className="space-y-5 overflow-y-auto pr-1 flex-1">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition mr-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-base font-bold text-white font-arvo">
                    Import Preview &amp; Verification
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    File: <span className="font-mono text-yellow-400">{fileName}</span> ({fileType?.toUpperCase()})
                  </p>
                </div>
              </div>
            </div>

            {/* Statistics Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Total Rows</div>
                <div className="text-lg font-bold font-mono text-white pt-0.5">{parsedMembers.length}</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                <div className="text-[10px] font-mono text-emerald-400 uppercase">New Members</div>
                <div className="text-lg font-bold font-mono text-emerald-300 pt-0.5">+{newMembersCount}</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                <div className="text-[10px] font-mono text-amber-400 uppercase">Existing Members</div>
                <div className="text-lg font-bold font-mono text-amber-300 pt-0.5">{existingMembersCount}</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                <div className="text-[10px] font-mono text-rose-400 uppercase">Errors</div>
                <div className="text-lg font-bold font-mono text-rose-300 pt-0.5">{invalidMembers.length}</div>
              </div>
            </div>

            {/* Import Options Checkboxes */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-yellow-400" />
                <span>Import Configuration</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Option 1: Update Existing */}
                <label className="flex items-start gap-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-yellow-400 focus:ring-yellow-400/20"
                  />
                  <div>
                    <span className="font-semibold block text-white">
                      Update existing members with matching email address
                    </span>
                    <span className="text-[11px] text-slate-400 block pt-0.5">
                      Syncs latest section assignments, instrument lists, and contact info without overwriting their existing user ID or credentials.
                    </span>
                  </div>
                </label>

                {/* Option 2: Generate Invites (Option C Production Compatibility) */}
                <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 pt-1">
                  <input
                    type="checkbox"
                    checked={createInvites}
                    onChange={(e) => setCreateInvites(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-yellow-400 focus:ring-yellow-400/20"
                  />
                  <div>
                    <span className="font-semibold block text-white flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-yellow-400" />
                      Auto-generate pending invitations for imported members
                    </span>
                    <span className="text-[11px] text-slate-400 block pt-0.5">
                      Ensures imported musicians can immediately claim their accounts and log into Production under strict invite-only access.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Members Preview Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Members Preview ({validMembers.length} ready)
                </span>
                {invalidMembers.length > 0 && (
                  <span className="text-rose-400 text-[11px] flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {invalidMembers.length} rows skipped due to errors
                  </span>
                )}
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Musician</th>
                      <th className="py-2.5 px-3">Section</th>
                      <th className="py-2.5 px-3">Instruments</th>
                      <th className="py-2.5 px-3">Roles</th>
                      <th className="py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {validMembers.slice(0, 50).map((m, idx) => {
                      const isExisting = existingEmailMap.has(m.email.toLowerCase().trim());
                      return (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3">
                            <div className="font-semibold text-white leading-tight">
                              {m.displayName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {m.email}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                              {m.sectionName}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-400">
                            {m.instruments.length > 0
                              ? m.instruments.slice(0, 2).join(", ") +
                                (m.instruments.length > 2 ? ` +${m.instruments.length - 2}` : "")
                              : "—"}
                          </td>
                          <td className="py-2 px-3 text-[11px]">
                            <span className="text-[10px] font-mono text-yellow-400/90">
                              {m.roles.join(", ")}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {isExisting ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                                Update
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                                New Member
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                disabled={isImporting || validMembers.length === 0}
                onClick={handleExecuteImport}
                className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      Importing ({importProgress.current} / {importProgress.total})...
                    </span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Import {validMembers.length} Members</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: COMPLETED SUCCESS VIEW */}
        {step === "complete" && (
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white font-arvo">
                Roster Successfully Synchronized!
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Your band members and section assignments are now live in the Firestore database.
              </p>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-[10px] font-mono text-emerald-400 uppercase">New Members</div>
                <div className="text-xl font-bold font-mono text-white pt-0.5">
                  +{importResult.addedCount}
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-[10px] font-mono text-amber-400 uppercase">Updated</div>
                <div className="text-xl font-bold font-mono text-white pt-0.5">
                  {importResult.updatedCount}
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-[10px] font-mono text-yellow-400 uppercase">Invites Issued</div>
                <div className="text-xl font-bold font-mono text-white pt-0.5">
                  {importResult.invitesCount}
                </div>
              </div>
            </div>

            {createInvites && importResult.invitesCount > 0 && (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 max-w-md mx-auto text-[11px] text-slate-400 text-left">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5 pb-1">
                  <Mail className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Onboarding Readiness</span>
                </div>
                <p>
                  Invitations were automatically prepared for all new members. You can batch-email or copy their claim links in the{" "}
                  <strong className="text-white">Invitations tab</strong> at any time.
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  resetModal();
                }}
                className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

