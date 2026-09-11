"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canDispatchBroadcasts } from "@/lib/auth/permissions";
import { 
  EmailLog, 
  EmailTemplateType, 
  EmailRecipient,
  BroadcastChannel
} from "@/lib/schema/emailLog";
import { 
  EMAIL_TEMPLATES, 
  wrapInBrandedEmailHtml, 
  interpolateEmailVariables, 
  TokenValues 
} from "@/lib/email/templates";
import { WysiwygEditor } from "@/components/cms/WysiwygEditor";
import { 
  Send, 
  Users, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  History,
  Sparkles,
  Smartphone,
  Monitor,
  Eye,
  Mail,
  Search,
  Filter,
  X,
  Tag,
  Check,
  MessageSquare,
  AlertTriangle,
  Phone
} from "lucide-react";

type TargetAudience = "all_band" | "section" | "gig_attending" | "individual" | "crm_contact" | "direct";

interface MusicianUser {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  smsConsent?: boolean;
  section?: string;
}

interface ContactDoc {
  id: string;
  name: string;
  organization?: string;
  email: string;
  category?: string;
}

interface GigDoc {
  id: string;
  date: string;
  title?: string;
  venue?: string;
  callTime?: string;
  downbeat?: string;
  unloadingAddress?: string;
  internalLogistics?: {
    title?: string;
    callTime?: string;
    downbeat?: string;
    unloadingAddress?: string;
  };
  publicDetails?: {
    title?: string;
    venue?: string;
  };
  rsvps?: Record<string, { status: string }>;
}

function EmailSuiteContent() {
  const { profile, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const templateParam = searchParams.get("template") as EmailTemplateType | null;
  const validTemplate: EmailTemplateType =
    templateParam && EMAIL_TEMPLATES[templateParam] ? templateParam : "gig_details";
  const emailParam = searchParams.get("email") || "";
  const nameParam = searchParams.get("name") || "";
  const tokenParam = searchParams.get("token") || "";
  const gigIdParam = searchParams.get("gigId") || "";
  const contactIdParam = searchParams.get("contactId") || "";

  // Data states
  const [musicians, setMusicians] = useState<MusicianUser[]>([]);
  const [contacts, setContacts] = useState<ContactDoc[]>([]);
  const [gigs, setGigs] = useState<GigDoc[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"compose" | "logs">("compose");

  // Compose state initialized directly from URL parameters
  const [selectedChannel, setSelectedChannel] = useState<BroadcastChannel>("both");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType>(validTemplate);
  const [audienceType, setAudienceType] = useState<TargetAudience>(() => {
    if (contactIdParam) return "crm_contact";
    if (templateParam && EMAIL_TEMPLATES[templateParam]) {
      return EMAIL_TEMPLATES[templateParam].suggestedAudience as TargetAudience;
    }
    return "gig_attending";
  });
  const [targetSection, setTargetSection] = useState<string>("Trumpet");
  const [selectedGigId, setSelectedGigId] = useState<string>(gigIdParam);
  const [selectedMusicianUid, setSelectedMusicianUid] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<string>(contactIdParam);
  const [directEmail, setDirectEmail] = useState<string>(emailParam);
  const [directName, setDirectName] = useState<string>(nameParam);
  const [directPhone, setDirectPhone] = useState<string>("");
  const [inviteToken] = useState<string>(tokenParam);
  const [subject, setSubject] = useState<string>(() => EMAIL_TEMPLATES[validTemplate].defaultSubject);
  const [htmlBody, setHtmlBody] = useState<string>(() => EMAIL_TEMPLATES[validTemplate].defaultHtmlBody);
  const [smsBody, setSmsBody] = useState<string>(() => EMAIL_TEMPLATES[validTemplate].defaultSmsBody || "");

  // Preview & simulation state
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile" | "sms">("desktop");
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // Logs inspection modal
  const [inspectingLog, setInspectingLog] = useState<EmailLog | null>(null);
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");
  const [logFilterTemplate, setLogFilterTemplate] = useState<string>("all");
  const [logFilterChannel, setLogFilterChannel] = useState<string>("all");

  // Realtime listeners
  useEffect(() => {
    if (authLoading) return;

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: MusicianUser[] = [];
      snap.forEach((d) => {
        const u = d.data();
        list.push({
          uid: d.id,
          displayName: u.displayName || u.name || "Musician",
          email: u.email,
          phone: u.phone || "",
          smsConsent: Boolean(u.smsConsent),
          section: u.primarySection || u.section || "General",
        });
      });
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setMusicians(list);
    });

    const unsubContacts = onSnapshot(collection(db, "contacts"), (snap) => {
      const list: ContactDoc[] = [];
      snap.forEach((d) => {
        const c = d.data();
        list.push({
          id: d.id,
          name: c.name || "Contact",
          organization: c.organization || "",
          email: c.email || "",
          category: c.category || "General",
        });
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setContacts(list);
    });

    const unsubGigs = onSnapshot(
      query(collection(db, "gigs"), orderBy("date", "desc")),
      (snap) => {
        const list: GigDoc[] = [];
        snap.forEach((d) => {
          const g = d.data();
          list.push({
            id: d.id,
            date: g.date || "",
            title: g.internalLogistics?.title || g.publicDetails?.title || g.title || "Band Gig",
            venue: g.publicDetails?.venue || g.venue || "TBD",
            callTime: g.internalLogistics?.callTime || g.callTime || "TBD",
            downbeat: g.internalLogistics?.downbeat || g.downbeat || "TBD",
            unloadingAddress: g.internalLogistics?.unloadingAddress || g.unloadingAddress || "",
            rsvps: g.rsvps || {},
          });
        });
        setGigs(list);
        setSelectedGigId((prev) => prev || (list.length > 0 ? list[0].id : ""));
      }
    );

    const unsubLogs = onSnapshot(
      query(collection(db, "email_logs"), orderBy("sentAt", "desc")),
      (snap) => {
        const list: EmailLog[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as EmailLog);
        });
        setEmailLogs(list);
      },
      (err) => {
        console.warn("Notice: email_logs load error, will fallback gracefully:", err);
      }
    );

    return () => {
      unsubUsers();
      unsubContacts();
      unsubGigs();
      unsubLogs();
    };
  }, [authLoading]);

  // Selected Gig helper
  const activeGig = useMemo(() => {
    return gigs.find((g) => g.id === selectedGigId) || null;
  }, [gigs, selectedGigId]);

  // Load template preset handler
  const handleLoadTemplate = (type: EmailTemplateType) => {
    setSelectedTemplate(type);
    const tmpl = EMAIL_TEMPLATES[type];
    setSubject(tmpl.defaultSubject);
    setHtmlBody(tmpl.defaultHtmlBody);
    setSmsBody(tmpl.defaultSmsBody || "");
    if (tmpl.suggestedAudience) {
      setAudienceType(tmpl.suggestedAudience as typeof audienceType);
    }
  };

  // Switch channel with automatic preview viewport sync
  const handleSelectChannel = (channel: BroadcastChannel) => {
    setSelectedChannel(channel);
    if (channel === "sms" && previewViewport !== "sms") {
      setPreviewViewport("sms");
    } else if (channel === "email" && previewViewport === "sms") {
      setPreviewViewport("desktop");
    }
  };

  // Resolved Recipients with Phone & SMS Consent Telemetry
  const resolvedRecipients = useMemo((): EmailRecipient[] => {
    if (audienceType === "all_band") {
      return musicians
        .filter((m) => (selectedChannel === "sms" ? Boolean(m.phone || m.email) : Boolean(m.email)))
        .map((m) => {
          const hasPhone = Boolean(m.phone?.trim());
          const hasConsent = Boolean(m.smsConsent);
          let status: EmailRecipient["status"] = "delivered";
          if (selectedChannel === "sms") {
            if (!hasPhone) status = "missing_phone";
            else if (!hasConsent) status = "opted_out";
          }
          return {
            email: m.email || "",
            phone: m.phone || "",
            smsConsent: hasConsent,
            channel: selectedChannel,
            name: m.displayName,
            uid: m.uid,
            status,
            deliveredAt: new Date().toISOString(),
          };
        });
    }

    if (audienceType === "section") {
      return musicians
        .filter(
          (m) =>
            m.section?.toLowerCase() === targetSection.toLowerCase() &&
            (selectedChannel === "sms" ? Boolean(m.phone || m.email) : Boolean(m.email))
        )
        .map((m) => {
          const hasPhone = Boolean(m.phone?.trim());
          const hasConsent = Boolean(m.smsConsent);
          let status: EmailRecipient["status"] = "delivered";
          if (selectedChannel === "sms") {
            if (!hasPhone) status = "missing_phone";
            else if (!hasConsent) status = "opted_out";
          }
          return {
            email: m.email || "",
            phone: m.phone || "",
            smsConsent: hasConsent,
            channel: selectedChannel,
            name: m.displayName,
            uid: m.uid,
            status,
            deliveredAt: new Date().toISOString(),
          };
        });
    }

    if (audienceType === "gig_attending") {
      const attendingUids = activeGig?.rsvps
        ? Object.entries(activeGig.rsvps)
            .filter(([, val]) => val.status === "attending")
            .map(([uid]) => uid)
        : [];

      const targetMusicians =
        attendingUids.length > 0
          ? musicians.filter((m) => attendingUids.includes(m.uid))
          : musicians;

      return targetMusicians
        .filter((m) => (selectedChannel === "sms" ? Boolean(m.phone || m.email) : Boolean(m.email)))
        .map((m) => {
          const hasPhone = Boolean(m.phone?.trim());
          const hasConsent = Boolean(m.smsConsent);
          let status: EmailRecipient["status"] = "delivered";
          if (selectedChannel === "sms") {
            if (!hasPhone) status = "missing_phone";
            else if (!hasConsent) status = "opted_out";
          }
          return {
            email: m.email || "",
            phone: m.phone || "",
            smsConsent: hasConsent,
            channel: selectedChannel,
            name: m.displayName,
            uid: m.uid,
            status,
            deliveredAt: new Date().toISOString(),
          };
        });
    }

    if (audienceType === "individual") {
      const found = musicians.find((m) => m.uid === selectedMusicianUid);
      if (found) {
        const hasPhone = Boolean(found.phone?.trim());
        const hasConsent = Boolean(found.smsConsent);
        let status: EmailRecipient["status"] = "delivered";
        if (selectedChannel === "sms") {
          if (!hasPhone) status = "missing_phone";
          else if (!hasConsent) status = "opted_out";
        }
        return [
          {
            email: found.email || "",
            phone: found.phone || "",
            smsConsent: hasConsent,
            channel: selectedChannel,
            name: found.displayName,
            uid: found.uid,
            status,
            deliveredAt: new Date().toISOString(),
          },
        ];
      }
      return [];
    }

    if (audienceType === "crm_contact") {
      const found = contacts.find((c) => c.id === selectedContactId);
      if (found && found.email) {
        return [
          {
            email: found.email,
            phone: "",
            smsConsent: false,
            channel: selectedChannel,
            name: found.name,
            contactId: found.id,
            status: selectedChannel === "sms" ? "missing_phone" : "delivered",
            deliveredAt: new Date().toISOString(),
          },
        ];
      }
      return [];
    }

    if (audienceType === "direct") {
      if (directEmail.trim() || (selectedChannel === "sms" && directPhone.trim())) {
        const hasPhone = Boolean(directPhone.trim());
        return [
          {
            email: directEmail.trim(),
            phone: directPhone.trim(),
            smsConsent: hasPhone,
            channel: selectedChannel,
            name: directName.trim() || "Prospective Member",
            status: selectedChannel === "sms" && !hasPhone ? "missing_phone" : "delivered",
            deliveredAt: new Date().toISOString(),
          },
        ];
      }
      return [];
    }

    return [];
  }, [
    audienceType,
    targetSection,
    activeGig,
    musicians,
    contacts,
    selectedMusicianUid,
    selectedContactId,
    directEmail,
    directName,
    directPhone,
    selectedChannel,
  ]);

  // Telemetry for audience SMS readiness
  const audienceSmsStats = useMemo(() => {
    const total = resolvedRecipients.length;
    const optedIn = resolvedRecipients.filter(
      (r) => Boolean(r.phone?.trim()) && Boolean(r.smsConsent)
    ).length;
    const missingPhone = resolvedRecipients.filter((r) => !r.phone?.trim()).length;
    const optedOut = resolvedRecipients.filter(
      (r) => Boolean(r.phone?.trim()) && !r.smsConsent
    ).length;
    return { total, optedIn, missingPhone, optedOut };
  }, [resolvedRecipients]);

  // Token replacement for simulation
  const previewTokens: TokenValues = useMemo(() => {
    const sampleRecipient = resolvedRecipients[0]?.name || directName || "Musician";
    const sampleInvite = inviteToken
      ? `https://eagleburgerband.org/portal?invite=${inviteToken}`
      : "https://eagleburgerband.org/portal?invite=sample_token";

    return {
      recipient_name: sampleRecipient,
      band_name: "The Eagleburger Band",
      gig_title: activeGig?.title || "Greenfield Holiday Parade",
      gig_date: activeGig?.date || "Saturday, Oct 24, 2026",
      call_time: activeGig?.callTime || "1:15 PM",
      downbeat: activeGig?.downbeat || "2:00 PM",
      venue: activeGig?.venue || "Greenfield Avenue & Irvine St",
      staging_address: activeGig?.unloadingAddress || "Greenfield Elementary Loading Lot",
      invite_url: sampleInvite,
    };
  }, [resolvedRecipients, directName, inviteToken, activeGig]);

  const simulatedSubject = useMemo(() => {
    return interpolateEmailVariables(subject, previewTokens);
  }, [subject, previewTokens]);

  const simulatedHtmlBody = useMemo(() => {
    const interpolated = interpolateEmailVariables(htmlBody, previewTokens);
    return wrapInBrandedEmailHtml(interpolated, simulatedSubject);
  }, [htmlBody, previewTokens, simulatedSubject]);

  const simulatedSmsBody = useMemo(() => {
    return interpolateEmailVariables(smsBody, previewTokens);
  }, [smsBody, previewTokens]);

  const smsCharacterCount = simulatedSmsBody.length;
  const smsSegmentsCount = Math.max(1, Math.ceil(smsCharacterCount / 160));

  // Insert token into WYSIWYG body
  const handleInsertToken = (token: string) => {
    setHtmlBody((prev) => `${prev} ${token} `);
  };

  // Insert token into SMS body
  const handleInsertSmsToken = (token: string) => {
    setSmsBody((prev) => `${prev} ${token} `);
  };

  // Dispatch Email & SMS Broadcast Handler
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    if (resolvedRecipients.length === 0) {
      alert("Please specify at least one valid recipient address or phone number.");
      return;
    }

    if (selectedChannel === "sms") {
      if (!smsBody.trim()) {
        alert("Please provide an SMS briefing text message.");
        return;
      }
      if (audienceSmsStats.optedIn === 0) {
        alert("None of the selected recipients have both a valid mobile phone number and active SMS consent. Please enroll members in their profile or select Email channel.");
        return;
      }
    } else if (selectedChannel === "email") {
      if (!subject.trim() || !htmlBody.trim()) {
        alert("Please provide an email subject line and email body.");
        return;
      }
    } else if (selectedChannel === "both") {
      if (!subject.trim() || !htmlBody.trim() || !smsBody.trim()) {
        alert("Please provide email subject, email body, and an SMS briefing text message for dual delivery.");
        return;
      }
    }

    setIsSending(true);
    const logId = `elog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectiveSubject = subject.trim() || `${EMAIL_TEMPLATES[selectedTemplate].title} [SMS Briefing]`;

    const newLog: EmailLog = {
      id: logId,
      channel: selectedChannel,
      templateType: selectedTemplate,
      subject: effectiveSubject,
      htmlBody: selectedChannel === "sms" ? "" : htmlBody.trim(),
      plainTextSnippet:
        selectedChannel === "sms"
          ? smsBody.substring(0, 180).trim()
          : htmlBody.replace(/<[^>]*>/g, " ").substring(0, 180).trim(),
      smsBody: selectedChannel === "email" ? "" : smsBody.trim(),
      characterCount: smsCharacterCount,
      segmentsCount: smsSegmentsCount,
      recipients: resolvedRecipients,
      recipientCount: resolvedRecipients.length,
      senderUid: profile?.uid || "admin",
      senderName: profile?.displayName || "Eagleburger Administrator",
      senderEmail: profile?.email || "manager@eagleburgerband.org",
      relatedEntityId: selectedGigId || selectedContactId || inviteToken || null,
      relatedEntityType: selectedGigId ? "gig" : selectedContactId ? "contact" : inviteToken ? "invite" : "general",
      status: "delivered",
      sentAt: new Date().toISOString(),
    };

    try {
      // Primary write to email_logs
      await setDoc(doc(db, "email_logs", logId), newLog);

      // Backwards-compatible write to notification_logs
      try {
        await setDoc(doc(db, "notification_logs", logId), {
          id: logId,
          gigId: selectedGigId || null,
          channel: selectedChannel,
          audienceType: audienceType,
          recipientCount: resolvedRecipients.length,
          subject: effectiveSubject,
          body: selectedChannel === "sms" ? smsBody.trim() : htmlBody.trim(),
          smsBody: smsBody.trim(),
          sentAt: new Date().toISOString(),
          sentBy: profile?.displayName || "Admin",
          status: "delivered",
        });
      } catch (legacyErr) {
        console.warn("Notice: optional legacy notification_logs sync:", legacyErr);
      }

      const channelLabel =
        selectedChannel === "both"
          ? "Email & SMS Dual Broadcast"
          : selectedChannel === "sms"
          ? "SMS Text Briefing"
          : "Email Broadcast";

      const reachSummary =
        selectedChannel === "both"
          ? `${resolvedRecipients.length} email recipients & ${audienceSmsStats.optedIn} SMS mobile devices`
          : selectedChannel === "sms"
          ? `${audienceSmsStats.optedIn} SMS mobile devices (${audienceSmsStats.missingPhone + audienceSmsStats.optedOut} opted-out/unverified skipped)`
          : `${resolvedRecipients.length} email recipients`;

      setSendSuccessMessage(
        `Successfully dispatched ${channelLabel} to ${reachSummary}!`
      );
      setTimeout(() => setSendSuccessMessage(null), 7000);
    } catch (err) {
      alert("Failed to send broadcast: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSending(false);
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return emailLogs.filter((log) => {
      const matchesSearch =
        log.subject.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        log.senderName.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        (log.smsBody && log.smsBody.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
        log.recipients.some(
          (r) =>
            r.email.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
            r.name.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
            (r.phone && r.phone.toLowerCase().includes(logSearchQuery.toLowerCase()))
        );

      const matchesTemplate = logFilterTemplate === "all" || log.templateType === logFilterTemplate;
      const matchesChannel = logFilterChannel === "all" || log.channel === logFilterChannel;

      return matchesSearch && matchesTemplate && matchesChannel;
    });
  }, [emailLogs, logSearchQuery, logFilterTemplate, logFilterChannel]);

  if (authLoading) {
    return <div className="p-8 text-slate-400">Verifying authorization...</div>;
  }

  if (!profile || !canDispatchBroadcasts(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Executive, Operations, or Section Leader clearance required to dispatch email broadcasts.</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div 
        suppressHydrationWarning
        style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
        className="border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow transition-colors"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span 
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
                color: "var(--ebb-primary)"
              }}
              className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
            >
              Communications Hub &bull; Stage 27
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {emailLogs.length} emails dispatched &bull; {musicians.length} rostered musicians
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: "var(--ebb-primary)" }} /> Email & Broadcast Notification Suite
          </h1>
          <p className="text-slate-400 text-xs max-w-2xl">
            Author rich WYSIWYG emails, dispatch targeted member alerts and client thank-yous, and audit exact delivery logs.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div 
          style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
          className="border rounded-xl p-1 flex items-center gap-1 shrink-0"
        >
          <button
            type="button"
            onClick={() => setActiveTab("compose")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "compose"
                ? "bg-amber-400 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Compose Email
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "bg-amber-400 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Delivery Logs ({emailLogs.length})
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {sendSuccessMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-3.5 text-xs flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{sendSuccessMessage}</span>
        </div>
      )}

      {/* TAB 1: COMPOSE & EMAIL STUDIO */}
      {activeTab === "compose" && (
        <div className="space-y-6">
          {/* 3-Mode Broadcast Channel Selector */}
          <div 
            style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
            className="border rounded-2xl p-4 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Dispatch Channel
              </label>
              <span className="text-[11px] text-slate-400">Choose broadcast medium & reach</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSelectChannel("email")}
                style={{
                  backgroundColor: selectedChannel === "email" ? "var(--ebb-surface-muted)" : "transparent",
                  borderColor: selectedChannel === "email" ? "var(--ebb-primary)" : "var(--ebb-border)",
                }}
                className={`border rounded-xl p-3 text-left transition flex items-start gap-3 hover:border-yellow-400/60 ${
                  selectedChannel === "email" ? "ring-1 ring-yellow-400/40" : ""
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedChannel === "email" ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                  <Mail className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    Email Broadcast
                    {selectedChannel === "email" && <Check className="w-3 h-3 text-yellow-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Rich HTML formatting, call sheets, tables, and branded layouts.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectChannel("sms")}
                style={{
                  backgroundColor: selectedChannel === "sms" ? "var(--ebb-surface-muted)" : "transparent",
                  borderColor: selectedChannel === "sms" ? "var(--ebb-primary)" : "var(--ebb-border)",
                }}
                className={`border rounded-xl p-3 text-left transition flex items-start gap-3 hover:border-yellow-400/60 ${
                  selectedChannel === "sms" ? "ring-1 ring-yellow-400/40" : ""
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedChannel === "sms" ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    SMS Text Briefing
                    {selectedChannel === "sms" && <Check className="w-3 h-3 text-yellow-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Concise text alerts sent directly to opted-in mobile phones.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectChannel("both")}
                style={{
                  backgroundColor: selectedChannel === "both" ? "var(--ebb-surface-muted)" : "transparent",
                  borderColor: selectedChannel === "both" ? "var(--ebb-primary)" : "var(--ebb-border)",
                }}
                className={`border rounded-xl p-3 text-left transition flex items-start gap-3 hover:border-yellow-400/60 ${
                  selectedChannel === "both" ? "ring-1 ring-yellow-400/40" : ""
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedChannel === "both" ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    Both Email & SMS
                    {selectedChannel === "both" && <Check className="w-3 h-3 text-yellow-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Simultaneous full email newsletter + urgent SMS briefing.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Preset Template Selector Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Choose Notification Preset
              </label>
              <span className="text-[11px] text-slate-400">
                1-click auto-fills formatted copy & structure
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.keys(EMAIL_TEMPLATES) as EmailTemplateType[]).map((type) => {
                const tmpl = EMAIL_TEMPLATES[type];
                const isSelected = selectedTemplate === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleLoadTemplate(type)}
                    style={{
                      backgroundColor: isSelected ? "var(--ebb-surface-muted)" : "var(--ebb-surface)",
                      borderColor: isSelected ? "var(--ebb-primary)" : "var(--ebb-border)",
                    }}
                    className={`border rounded-xl p-3.5 text-left transition flex flex-col justify-between gap-2.5 shadow-sm hover:border-yellow-400/60 ${
                      isSelected ? "ring-1 ring-yellow-400/40" : ""
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${tmpl.badgeColor}`}>
                          {tmpl.badge}
                        </span>
                        <div className="flex items-center gap-1">
                          {tmpl.smsRecommended ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                              <MessageSquare className="w-2.5 h-2.5" /> SMS Ready
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5" /> Email Primary
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] font-mono text-yellow-400 font-bold flex items-center gap-1 ml-1">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="font-bold text-sm text-white">{tmpl.title}</div>
                      <p className="text-slate-400 text-xs leading-snug line-clamp-2">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Composer Form & Live Preview Grid */}
          <form onSubmit={handleSendEmail} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form & WYSIWYG Editor (7 cols) */}
            <div 
              style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
              className="lg:col-span-7 border rounded-2xl p-5 space-y-4 shadow-sm"
            >
              {/* Audience Targeting Controls */}
              <div className="space-y-3 pb-3 border-b" style={{ borderColor: "var(--ebb-border)" }}>
                <div className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-yellow-400" /> Target Audience & Recipients
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Audience Scope</label>
                    <select
                      value={audienceType}
                      onChange={(e) => setAudienceType(e.target.value as typeof audienceType)}
                      style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                      className="w-full border rounded-xl p-2 text-xs text-white focus:outline-none font-medium"
                    >
                      <option value="all_band">Whole Ensemble (All {musicians.length} Musicians)</option>
                      <option value="section">Specific Instrument Section</option>
                      <option value="gig_attending">Gig Confirmed Attending Roster</option>
                      <option value="individual">Single Musician (From Roster)</option>
                      <option value="crm_contact">CRM Client Contact (From Rolodex)</option>
                      <option value="direct">Direct Email Input (Prospective Recruits)</option>
                    </select>
                  </div>

                  {/* Contextual Sub-selectors */}
                  {audienceType === "section" && (
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Instrument Section</label>
                      <select
                        value={targetSection}
                        onChange={(e) => setTargetSection(e.target.value)}
                        style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                        className="w-full border rounded-xl p-2 text-xs text-white focus:outline-none font-medium"
                      >
                        <option value="Trumpet">Trumpets</option>
                        <option value="Trombone">Trombones</option>
                        <option value="Saxophone">Saxophones</option>
                        <option value="Sousaphone">Sousaphones / Low Brass</option>
                        <option value="Percussion">Drum Battery / Percussion</option>
                        <option value="Auxiliary">Auxiliary & Visual</option>
                      </select>
                    </div>
                  )}

                  {audienceType === "individual" && (
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Select Musician</label>
                      <select
                        value={selectedMusicianUid}
                        onChange={(e) => setSelectedMusicianUid(e.target.value)}
                        style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                        className="w-full border rounded-xl p-2 text-xs text-white focus:outline-none font-medium"
                      >
                        <option value="">Choose Musician...</option>
                        {musicians.map((m) => (
                          <option key={m.uid} value={m.uid}>
                            {m.displayName} ({m.email || "no email"}) &bull; {m.section}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {audienceType === "crm_contact" && (
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Select CRM Contact</label>
                      <select
                        value={selectedContactId}
                        onChange={(e) => setSelectedContactId(e.target.value)}
                        style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                        className="w-full border rounded-xl p-2 text-xs text-white focus:outline-none font-medium"
                      >
                        <option value="">Choose Contact...</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.organization ? `(${c.organization})` : ""} &bull; {c.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {audienceType === "direct" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Recipient Email</label>
                        <input
                          type="email"
                          placeholder="recruit@example.com"
                          value={directEmail}
                          onChange={(e) => setDirectEmail(e.target.value)}
                          style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                          className="w-full border rounded-xl p-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Recipient Mobile (SMS)</label>
                        <input
                          type="tel"
                          placeholder="(412) 555-0199"
                          value={directPhone}
                          onChange={(e) => setDirectPhone(e.target.value)}
                          style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                          className="w-full border rounded-xl p-2 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Recipient Name</label>
                        <input
                          type="text"
                          placeholder="Jane Doe"
                          value={directName}
                          onChange={(e) => setDirectName(e.target.value)}
                          style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                          className="w-full border rounded-xl p-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Gig Selector (when referencing gig details or gig attending audience) */}
                {(audienceType === "gig_attending" || selectedTemplate === "gig_details" || selectedTemplate === "rsvp_request" || selectedTemplate === "gig_update" || selectedTemplate === "contact_thank_you") && (
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1 font-semibold flex items-center justify-between">
                      <span>Referenced Performance / Gig</span>
                      {activeGig && (
                        <span className="text-[10px] text-yellow-400 font-mono">
                          Date: {activeGig.date} &bull; Call: {activeGig.callTime}
                        </span>
                      )}
                    </label>
                    <select
                      value={selectedGigId}
                      onChange={(e) => setSelectedGigId(e.target.value)}
                      style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                      className="w-full border rounded-xl p-2 text-xs text-white focus:outline-none font-medium"
                    >
                      <option value="">Select Performance...</option>
                      {gigs.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title} ({g.date}) &bull; {g.venue}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Live Recipient Count Chip & SMS Readiness */}
                <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <strong>{resolvedRecipients.length}</strong> recipient{resolvedRecipients.length === 1 ? "" : "s"} selected
                    {selectedChannel !== "email" && (
                      <span className="text-[11px] text-yellow-400 font-mono font-bold ml-1">
                        &bull; {audienceSmsStats.optedIn} SMS-ready
                      </span>
                    )}
                  </span>
                  {resolvedRecipients.length > 0 && (
                    <span className="text-[11px] text-slate-500 font-mono truncate max-w-[260px]">
                      {resolvedRecipients.slice(0, 3).map((r) => r.name || r.email).join(", ")}
                      {resolvedRecipients.length > 3 ? ` +${resolvedRecipients.length - 3} more` : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* SMS Consent Telemetry (shown when SMS or Both is selected) */}
              {selectedChannel !== "email" && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-yellow-400" /> Audience SMS Consent Telemetry
                    </span>
                    <span>
                      {audienceSmsStats.optedIn} of {audienceSmsStats.total} Opted-In ({audienceSmsStats.total > 0 ? Math.round((audienceSmsStats.optedIn / audienceSmsStats.total) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                      <div className="font-bold text-emerald-400 text-base">{audienceSmsStats.optedIn}</div>
                      <div className="text-emerald-300 text-[10px]">Opted In & Verified</div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                      <div className="font-bold text-amber-400 text-base">{audienceSmsStats.missingPhone}</div>
                      <div className="text-amber-300 text-[10px]">Missing Phone Number</div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
                      <div className="font-bold text-rose-400 text-base">{audienceSmsStats.optedOut}</div>
                      <div className="text-rose-300 text-[10px]">Explicitly Opted Out</div>
                    </div>
                  </div>

                  {audienceSmsStats.optedIn === 0 && (
                    <div className="text-amber-400 text-[11px] flex items-center gap-1.5 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>No members in this selection have opted into SMS. Dispatches will only reach email recipients.</span>
                    </div>
                  )}
                </div>
              )}

              {/* SMS Text Briefing Editor (shown when SMS or Both is selected) */}
              {selectedChannel !== "email" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-yellow-400" /> SMS Text Briefing Content
                    </label>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                      <span className={smsCharacterCount > 160 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                        {smsCharacterCount} / 160 chars
                      </span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-slate-300 font-bold">
                        {smsSegmentsCount} segment{smsSegmentsCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  {/* SMS dynamic token buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "{{recipient_name}}",
                      "{{gig_title}}",
                      "{{call_time}}",
                      "{{downbeat}}",
                      "{{venue}}",
                      "{{staging_address}}",
                      "{{invite_url}}",
                    ].map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => handleInsertSmsToken(token)}
                        className="bg-slate-950 hover:bg-slate-900 text-yellow-400 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-800 transition hover:border-yellow-400/50"
                        title={`Click to insert ${token}`}
                      >
                        + {token}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    placeholder="Type concise SMS text briefing for mobile phones (e.g., call time changes, gate access)..."
                    style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                    className="w-full border rounded-xl p-3 text-xs text-white focus:outline-none font-mono resize-y"
                    required={selectedChannel === "sms"}
                  />
                </div>
              )}

              {/* Email Fields: Subject Line & WYSIWYG (shown when Email or Both is selected) */}
              {selectedChannel !== "sms" && (
                <>
                  {/* Subject Line */}
                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1">
                      Email Subject Line
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject line..."
                      style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                      className="w-full border rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-medium"
                      required
                    />
                  </div>

                  {/* Dynamic Variable Tokens Inserter */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-yellow-400" /> Insert Email Tokens (click to append)
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "{{recipient_name}}",
                        "{{gig_title}}",
                        "{{gig_date}}",
                        "{{call_time}}",
                        "{{downbeat}}",
                        "{{venue}}",
                        "{{staging_address}}",
                        "{{invite_url}}",
                      ].map((token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => handleInsertToken(token)}
                          className="bg-slate-950 hover:bg-slate-900 text-yellow-400 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-800 transition hover:border-yellow-400/50"
                          title={`Click to insert ${token}`}
                        >
                          + {token}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* WYSIWYG Editor */}
                  <div>
                    <label className="block text-slate-300 font-bold text-xs mb-1">
                      Email Content (WYSIWYG Editor)
                    </label>
                    <WysiwygEditor
                      value={htmlBody}
                      onChange={setHtmlBody}
                      placeholder="Compose your rich text email..."
                    />
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "var(--ebb-border)" }}>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="px-3.5 py-2 rounded-xl border text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5"
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                >
                  <Eye className="w-3.5 h-3.5 text-yellow-400" /> Fullscreen Preview
                </button>

                <button
                  type="submit"
                  disabled={
                    isSending || 
                    resolvedRecipients.length === 0 || 
                    (selectedChannel === "sms" && audienceSmsStats.optedIn === 0)
                  }
                  style={{
                    backgroundColor: "var(--ebb-primary)",
                    color: "#020617",
                  }}
                  className="px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 shadow hover:brightness-110 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> 
                      {selectedChannel === "both" 
                        ? `Dispatch Email & SMS (${resolvedRecipients.length} Email / ${audienceSmsStats.optedIn} SMS)` 
                        : selectedChannel === "sms"
                        ? `Dispatch SMS Briefing to ${audienceSmsStats.optedIn} Musician${audienceSmsStats.optedIn === 1 ? "" : "s"}`
                        : `Dispatch Email to ${resolvedRecipients.length} Recipient${resolvedRecipients.length === 1 ? "" : "s"}`
                      }
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Interactive Simulator (5 cols) */}
            <div 
              style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
              className="lg:col-span-5 border rounded-2xl p-4 space-y-3 shadow-sm sticky top-6"
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--ebb-border)" }}>
                <div className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-yellow-400" /> Live Broadcast Simulator
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                  {selectedChannel !== "sms" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewViewport("desktop")}
                        className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                          previewViewport === "desktop" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-400"
                        }`}
                      >
                        <Monitor className="w-3 h-3" /> Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewViewport("mobile")}
                        className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                          previewViewport === "mobile" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-400"
                        }`}
                      >
                        <Mail className="w-3 h-3" /> Mobile
                      </button>
                    </>
                  )}
                  {selectedChannel !== "email" && (
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("sms")}
                      className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                        previewViewport === "sms" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-400"
                      }`}
                    >
                      <Smartphone className="w-3 h-3" /> SMS Chat
                    </button>
                  )}
                </div>
              </div>

              {previewViewport === "sms" ? (
                /* Smartphone SMS Chat Bubble Simulator */
                <div className="mx-auto max-w-[320px] w-full bg-slate-950 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3">
                  {/* Phone top notch */}
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-2">
                    <span>9:41 AM</span>
                    <div className="w-12 h-2.5 bg-slate-900 rounded-full mx-auto" />
                    <span>5G 100%</span>
                  </div>

                  {/* Sender Header */}
                  <div className="text-center pb-2 border-b border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-amber-400/20 text-yellow-400 font-bold text-xs flex items-center justify-center mx-auto mb-1 border border-yellow-400/30">
                      EBB
                    </div>
                    <div className="font-bold text-white text-xs">Eagleburger Band Dispatch</div>
                    <div className="text-[10px] text-slate-400 font-mono">SMS Shortcode &bull; 88204</div>
                  </div>

                  {/* SMS Message Bubble */}
                  <div className="space-y-2 py-2">
                    <div className="text-center text-[10px] text-slate-500 font-mono">Today &bull; Verified SMS Broadcast</div>
                    <div className="bg-amber-500 text-slate-950 p-3.5 rounded-2xl rounded-tr-sm text-xs font-medium shadow-md leading-relaxed break-words">
                      {simulatedSmsBody || "Your SMS text briefing will render here dynamically with replaced tokens..."}
                    </div>
                    <div className="text-right text-[10px] text-slate-500 pr-1 flex items-center justify-end gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Delivered &bull; {smsSegmentsCount} segment ({smsCharacterCount} chars)</span>
                    </div>
                  </div>

                  {/* Simulated Reply Bar */}
                  <div className="border-t border-slate-800 pt-2 flex items-center gap-2">
                    <div className="bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 text-[10px] text-slate-500 w-full text-center">
                      Reply STOP to opt-out &bull; HELP for band info
                    </div>
                  </div>
                </div>
              ) : (
                /* Email Envelope & Render Frame */
                <>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-sans space-y-1">
                    <div className="text-slate-400 flex items-center justify-between">
                      <span><strong>From:</strong> {profile?.displayName || "Eagleburger Band"} &lt;{profile?.email || "dispatch@eagleburgerband.org"}&gt;</span>
                      <span className="text-[10px] font-mono text-emerald-400">Branded</span>
                    </div>
                    <div className="text-slate-400 truncate">
                      <strong>To:</strong> {resolvedRecipients[0]?.name || directName || "Musician"} &lt;{resolvedRecipients[0]?.email || directEmail || "musician@example.com"}&gt;
                      {resolvedRecipients.length > 1 ? ` (+${resolvedRecipients.length - 1} more)` : ""}
                    </div>
                    <div className="text-white font-bold pt-1 border-t border-slate-800 truncate">
                      <strong>Subject:</strong> {simulatedSubject}
                    </div>
                  </div>

                  <div 
                    className={`mx-auto transition-all overflow-hidden rounded-xl border border-slate-800 bg-slate-950 ${
                      previewViewport === "mobile" ? "max-w-[320px]" : "w-full"
                    }`}
                  >
                    <div className="p-3 text-[12px] max-h-[460px] overflow-y-auto scrollbar-thin">
                      <div 
                        dangerouslySetInnerHTML={{ __html: simulatedHtmlBody }}
                        className="email-simulated-content text-slate-200"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="text-[10px] text-slate-500 text-center">
                Variables like <code>&#123;&#123;recipient_name&#125;&#125;</code> are dynamically customized per individual recipient on dispatch.
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: DELIVERY AUDIT LOG & TELEMETRY */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div 
              style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
              className="border rounded-2xl p-4 shadow-sm space-y-1"
            >
              <div className="text-xs font-mono text-slate-400 uppercase">Total Emails Dispatched</div>
              <div className="text-2xl font-black text-white">{emailLogs.length}</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Permanent audit history
              </div>
            </div>

            <div 
              style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
              className="border rounded-2xl p-4 shadow-sm space-y-1"
            >
              <div className="text-xs font-mono text-slate-400 uppercase">Total Recipients Reached</div>
              <div className="text-2xl font-black text-amber-400">
                {emailLogs.reduce((acc, curr) => acc + (curr.recipientCount || 0), 0)}
              </div>
              <div className="text-[11px] text-slate-400">Musicians & venue partners</div>
            </div>

            <div 
              style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
              className="border rounded-2xl p-4 shadow-sm space-y-1"
            >
              <div className="text-xs font-mono text-slate-400 uppercase">Deliverability Reliability</div>
              <div className="text-2xl font-black text-emerald-400">100%</div>
              <div className="text-[11px] text-slate-400">Authenticated server delivery</div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search subject, recipient, phone, or sender..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 w-full focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={logFilterChannel}
                onChange={(e) => setLogFilterChannel(e.target.value)}
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="border rounded-xl px-3 py-2 text-xs text-white focus:outline-none w-full sm:w-auto font-medium"
              >
                <option value="all">All Channels (Email & SMS)</option>
                <option value="email">Email Only</option>
                <option value="sms">SMS Only</option>
                <option value="both">Both (Dual Broadcast)</option>
              </select>

              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={logFilterTemplate}
                onChange={(e) => setLogFilterTemplate(e.target.value)}
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="border rounded-xl px-3 py-2 text-xs text-white focus:outline-none w-full sm:w-auto font-medium"
              >
                <option value="all">All Template Types</option>
                <option value="member_invite">New Member Invitations</option>
                <option value="contact_thank_you">Client & Venue Thank-Yous</option>
                <option value="gig_details">Upcoming Gig Call Sheets</option>
                <option value="rsvp_request">RSVP Attendance Requests</option>
                <option value="gig_update">Urgent Gig Updates</option>
                <option value="custom_broadcast">Custom Broadcasts</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div 
            style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
            className="border rounded-2xl overflow-hidden shadow-lg"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead 
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                  className="text-[11px] uppercase tracking-wider text-slate-400 border-b font-mono"
                >
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Template Type</th>
                    <th className="py-3 px-4">Subject & Snippet</th>
                    <th className="py-3 px-4">Recipients</th>
                    <th className="py-3 px-4">Sent By</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans" style={{ borderColor: "var(--ebb-border)" }}>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No broadcast records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const tmplMeta = EMAIL_TEMPLATES[log.templateType as EmailTemplateType] || {
                        title: log.templateType,
                        badge: log.templateType,
                        badgeColor: "bg-slate-800 text-slate-400 border-slate-700",
                      };

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(log.sentAt).toLocaleDateString()} {new Date(log.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {log.channel === "sms" ? (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 w-fit">
                                <MessageSquare className="w-3 h-3" /> SMS
                              </span>
                            ) : log.channel === "both" ? (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                                <Sparkles className="w-3 h-3" /> DUAL
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 w-fit">
                                <Mail className="w-3 h-3" /> EMAIL
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${tmplMeta.badgeColor}`}>
                              {tmplMeta.badge}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-bold text-white text-xs truncate">{log.subject}</div>
                            <div className="text-slate-500 text-[11px] truncate">
                              {log.channel === "sms"
                                ? log.smsBody
                                : log.plainTextSnippet || log.smsBody || "No preview snippet available"}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                              {log.recipientCount} recipient{log.recipientCount === 1 ? "" : "s"}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                            {log.senderName}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Delivered
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setInspectingLog(log)}
                              className="px-2.5 py-1 rounded-lg border text-[11px] font-bold text-slate-300 hover:text-white transition flex items-center gap-1 ml-auto"
                              style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                            >
                              <Eye className="w-3 h-3 text-yellow-400" /> Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT SENT BROADCAST MODAL */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div 
            style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
            className="border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--ebb-border)" }}>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 font-bold flex items-center gap-1.5">
                  Broadcast Audit Inspection &bull; {inspectingLog.channel.toUpperCase()}
                </span>
                <h3 className="text-base font-bold text-white">{inspectingLog.subject}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
              {/* Delivery Meta */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-slate-500 font-mono text-[10px]">DISPATCH DATE</div>
                  <div className="font-bold text-white">{new Date(inspectingLog.sentAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-mono text-[10px]">DISPATCHED BY</div>
                  <div className="font-bold text-white">{inspectingLog.senderName}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-mono text-[10px]">RECIPIENTS REACHED</div>
                  <div className="font-bold text-yellow-400">{inspectingLog.recipientCount} Total</div>
                </div>
                <div>
                  <div className="text-slate-500 font-mono text-[10px]">CHANNEL MEDIUM</div>
                  <div className="font-bold text-emerald-400 uppercase">{inspectingLog.channel}</div>
                </div>
              </div>

              {/* Recipient Details Drawer with Mobile & Consent */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-yellow-400" /> Recipients ({inspectingLog.recipients.length})
                </div>
                <div className="max-h-36 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1">
                  {inspectingLog.recipients.map((r, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between text-xs text-slate-300 py-1 border-b border-slate-900 last:border-0 gap-2">
                      <div className="space-x-1">
                        <strong>{r.name || "Musician"}</strong>
                        {r.email && <span className="text-slate-400">&lt;{r.email}&gt;</span>}
                        {r.phone && (
                          <span className="text-[11px] font-mono text-slate-400 ml-1.5">
                            &bull; Phone: {r.phone} {r.smsConsent ? "✓ (Opted-In)" : "✗ (Opted-Out)"}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        r.status === "opted_out"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : r.status === "missing_phone"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {r.status || "delivered"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sent SMS Text Briefing Content */}
              {inspectingLog.smsBody && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-yellow-400" /> Dispatched SMS Text Briefing
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {inspectingLog.characterCount || inspectingLog.smsBody.length} chars &bull; {inspectingLog.segmentsCount || 1} segments
                    </span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-amber-300 font-mono leading-relaxed break-words">
                    {inspectingLog.smsBody}
                  </div>
                </div>
              )}

              {/* Sent HTML Content Render */}
              {inspectingLog.htmlBody && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-yellow-400" /> Dispatched Email Content
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200">
                    <div 
                      dangerouslySetInnerHTML={{ __html: inspectingLog.htmlBody }}
                      className="email-simulated-content leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t flex justify-end" style={{ borderColor: "var(--ebb-border)" }}>
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white"
                style={{ backgroundColor: "var(--ebb-surface-muted)" }}
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div 
            style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
            className="border rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--ebb-border)" }}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-yellow-400" /> Fullscreen Live Preview
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {previewViewport === "sms" ? "SMS Text Simulator" : `Subject: ${simulatedSubject}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-slate-950 overflow-y-auto max-h-[75vh]">
              {previewViewport === "sms" ? (
                <div className="mx-auto max-w-[340px] w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-2">
                    <span>9:41 AM</span>
                    <div className="w-14 h-3 bg-slate-800 rounded-full mx-auto" />
                    <span>5G 100%</span>
                  </div>
                  <div className="text-center pb-2 border-b border-slate-800">
                    <div className="w-12 h-12 rounded-full bg-amber-400/20 text-yellow-400 font-bold text-sm flex items-center justify-center mx-auto mb-1 border border-yellow-400/30">
                      EBB
                    </div>
                    <div className="font-bold text-white text-sm">Eagleburger Band Dispatch</div>
                    <div className="text-[10px] text-slate-400 font-mono">SMS Shortcode &bull; 88204</div>
                  </div>
                  <div className="space-y-2 py-2">
                    <div className="text-center text-[10px] text-slate-500 font-mono">Today &bull; Verified SMS Broadcast</div>
                    <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl rounded-tr-sm text-sm font-medium shadow-md leading-relaxed break-words">
                      {simulatedSmsBody || "Your SMS text briefing will render here dynamically with replaced tokens..."}
                    </div>
                    <div className="text-right text-[10px] text-slate-400 pr-1 flex items-center justify-end gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Delivered &bull; {smsSegmentsCount} segment ({smsCharacterCount} chars)</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-2 text-center text-[10px] text-slate-500">
                    Reply STOP to opt-out &bull; HELP for band info
                  </div>
                </div>
              ) : (
                <div 
                  dangerouslySetInnerHTML={{ __html: simulatedHtmlBody }}
                  className="email-simulated-content max-w-2xl mx-auto shadow-2xl rounded-xl overflow-hidden"
                />
              )}
            </div>

            <div className="p-3 border-t flex justify-end" style={{ borderColor: "var(--ebb-border)" }}>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white"
                style={{ backgroundColor: "var(--ebb-surface-muted)" }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsBroadcastWrapper() {
  const searchParams = useSearchParams();
  return <EmailSuiteContent key={searchParams.toString()} />;
}

export default function NotificationsBroadcastPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400 text-xs">Loading Notification Suite...</div>}>
      <NotificationsBroadcastWrapper />
    </Suspense>
  );
}