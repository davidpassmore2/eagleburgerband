"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  doc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canDispatchBroadcasts, isAdmin } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import {
  NotificationSchema,
  NotificationCategory,
  NotificationPriority,
  AppNotification,
  NotificationPreferences,
} from "@/lib/schema/notification";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Calendar,
  Truck,
  Music,
  Megaphone,
  AlertTriangle,
  ExternalLink,
  Sliders,
  Send,
  X,
  Flame,
  CheckCircle2,
  Trash2,
  Inbox,
  Loader2,
  Info,
  Clock,
  MailCheck,
  Palmtree,
} from "lucide-react";

export default function MemberNotificationsPage() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const currentUserId = firebaseUser?.uid || profile?.uid || "";
  const userProfile = profile as unknown as User;
  const canBroadcast = Boolean(userProfile && (canDispatchBroadcasts(userProfile) || isAdmin(userProfile)));

  const [activeTab, setActiveTab] = useState<"inbox" | "preferences">("inbox");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [onlyUnread, setOnlyUnread] = useState(false);

  const defaultPreferences: NotificationPreferences = useMemo(() => {
    return userProfile?.notificationPreferences || {
      gigAlerts: true,
      logisticsChanges: true,
      rehearsalNotices: true,
      broadcasts: true,
      suggestionActivity: true,
      emailDigest: false,
      smsEmergencyOnly: true,
      updatedAt: new Date().toISOString(),
    };
  }, [userProfile]);

  const [customPreferences, setCustomPreferences] = useState<NotificationPreferences | null>(null);
  const preferences = customPreferences ?? defaultPreferences;
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [prefSaveSuccess, setPrefSaveSuccess] = useState(false);

  // Leadership Broadcast Composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastCategory, setBroadcastCategory] = useState<NotificationCategory>("broadcast");
  const [broadcastPriority, setBroadcastPriority] = useState<NotificationPriority>("normal");
  const [broadcastRecipient, setBroadcastRecipient] = useState<string>("all");
  const [broadcastActionUrl, setBroadcastActionUrl] = useState("");
  const [broadcastActionLabel, setBroadcastActionLabel] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [togglingHiatus, setTogglingHiatus] = useState(false);
  const isOnHiatus = Boolean(userProfile?.onHiatus || userProfile?.status === "hiatus");

  const handleToggleHiatus = async () => {
    if (!currentUserId) return;
    setTogglingHiatus(true);
    const nextVal = !isOnHiatus;
    try {
      await updateDoc(doc(db, "users", currentUserId), {
        onHiatus: nextVal,
        status: nextVal ? "hiatus" : "active",
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to update hiatus:", err);
    } finally {
      setTogglingHiatus(false);
    }
  };

  // Subscribe to real-time notifications
  useEffect(() => {
    if (authLoading || !currentUserId) return;

    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: AppNotification[] = [];
        snap.forEach((d) => {
          const raw = d.data();
          const parsed = NotificationSchema.safeParse({ id: d.id, ...raw });
          if (parsed.success) {
            const notif = parsed.data;
            // Check if notification is meant for this user:
            // "all", matches user uid, matches user section, or matches user roles
            const isForUser =
              notif.recipientUid === "all" ||
              notif.recipientUid === currentUserId ||
              (userProfile?.sectionId && notif.recipientUid === `section:${userProfile.sectionId}`) ||
              (userProfile?.roles && userProfile.roles.some((r) => notif.recipientUid === `role:${r}`));

            if (isForUser) {
              list.push(notif);
            }
          }
        });
        setNotifications(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching notifications:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading, currentUserId, userProfile]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const isRead = (n.readUids || []).includes(currentUserId);
      if (onlyUnread && isRead) return false;

      if (categoryFilter === "gigs_logistics") {
        return n.category === "gig_alert" || n.category === "logistics_change";
      }
      if (categoryFilter === "rehearsals") {
        return n.category === "rehearsal_notice";
      }
      if (categoryFilter === "announcements") {
        return n.category === "broadcast" || n.category === "suggestion_activity" || n.category === "system";
      }
      if (categoryFilter !== "all" && n.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [notifications, onlyUnread, categoryFilter, currentUserId]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !(n.readUids || []).includes(currentUserId)).length;
  }, [notifications, currentUserId]);

  // Mark single notification read / unread toggle
  const handleToggleRead = async (notif: AppNotification) => {
    if (!currentUserId) return;
    const isRead = (notif.readUids || []).includes(currentUserId);
    const notifRef = doc(db, "notifications", notif.id);

    try {
      if (isRead) {
        await setDoc(notifRef, { readUids: arrayRemove(currentUserId) }, { merge: true });
      } else {
        await setDoc(notifRef, { readUids: arrayUnion(currentUserId) }, { merge: true });
      }
    } catch (err) {
      console.error("Error updating notification status:", err);
    }
  };

  // Mark all currently visible as read
  const handleMarkAllRead = async () => {
    if (!currentUserId || filteredNotifications.length === 0) return;
    try {
      const updates = filteredNotifications
        .filter((n) => !(n.readUids || []).includes(currentUserId))
        .map((n) =>
          setDoc(doc(db, "notifications", n.id), { readUids: arrayUnion(currentUserId) }, { merge: true })
        );
      await Promise.all(updates);
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  // Delete notification (Admin or author)
  const handleDeleteNotification = async (notifId: string) => {
    if (!confirm("Are you sure you want to permanently delete this notification for everyone?")) return;
    try {
      await deleteDoc(doc(db, "notifications", notifId));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  // Save Preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    setSavingPreferences(true);
    setPrefSaveSuccess(false);

    try {
      const updated = {
        ...preferences,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(
        doc(db, "users", currentUserId),
        { notificationPreferences: updated },
        { merge: true }
      );
      setCustomPreferences(updated);
      setPrefSaveSuccess(true);
      setTimeout(() => setPrefSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save notification preferences:", err);
    } finally {
      setSavingPreferences(false);
    }
  };

  // Dispatch Broadcast Notification
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setSendingBroadcast(true);
    setBroadcastSuccess(false);

    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const payload: AppNotification = {
        id: notifId,
        recipientUid: broadcastRecipient,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        category: broadcastCategory,
        priority: broadcastPriority,
        readUids: [currentUserId],
        actionUrl: broadcastActionUrl.trim(),
        actionLabel: broadcastActionLabel.trim() || (broadcastActionUrl ? "View Details" : ""),
        createdByUid: currentUserId,
        createdByName: userProfile?.displayName || "Leadership",
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validated = NotificationSchema.parse(payload);
      await setDoc(doc(db, "notifications", notifId), validated);

      setBroadcastSuccess(true);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastActionUrl("");
      setBroadcastActionLabel("");
      setTimeout(() => {
        setIsComposerOpen(false);
        setBroadcastSuccess(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to dispatch broadcast:", err);
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Helper for Category styling & icon
  const getCategoryConfig = (cat: NotificationCategory) => {
    switch (cat) {
      case "gig_alert":
        return {
          icon: Calendar,
          label: "Gig Alert",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        };
      case "logistics_change":
        return {
          icon: Truck,
          label: "Logistics",
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        };
      case "rehearsal_notice":
        return {
          icon: Music,
          label: "Rehearsal",
          color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
        };
      case "suggestion_activity":
        return {
          icon: CheckCircle2,
          label: "Repertoire",
          color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        };
      case "system":
        return {
          icon: Info,
          label: "System",
          color: "text-slate-400 bg-slate-800 border-slate-700",
        };
      case "broadcast":
      default:
        return {
          icon: Megaphone,
          label: "Announcement",
          color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
        };
    }
  };

  // Helper for human-readable time (pure, no impure Date.now() in render)
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Syncing notification inbox & dispatch logs...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Member Communications
            </span>
            {unreadCount > 0 ? (
              <span className="text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
                {unreadCount} Unread
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <MailCheck className="w-3.5 h-3.5" /> All caught up
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-yellow-400" /> Notifications & Dispatch Feed
          </h1>
          <p className="text-xs text-slate-400">
            Real-time gig alerts, call-sheet logistics adjustments, rehearsal call updates, and band announcements.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {canBroadcast && (
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
            >
              <Send className="w-4 h-4" /> Send Announcement
            </button>
          )}

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("inbox")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "inbox"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Inbox
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preferences")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "preferences"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Preferences
            </button>
          </div>
        </div>
      </div>

      {/* Main Inbox View */}
      {activeTab === "inbox" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                  categoryFilter === "all"
                    ? "bg-yellow-400 text-slate-950 border-yellow-400"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("gigs_logistics")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                  categoryFilter === "gigs_logistics"
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black"
                    : "bg-slate-900 text-emerald-400 border-slate-800 hover:text-white"
                }`}
              >
                Gigs & Logistics
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("rehearsals")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                  categoryFilter === "rehearsals"
                    ? "bg-sky-400 text-slate-950 border-sky-300 font-black"
                    : "bg-slate-900 text-sky-400 border-slate-800 hover:text-white"
                }`}
              >
                Rehearsals
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("announcements")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                  categoryFilter === "announcements"
                    ? "bg-purple-500 text-white border-purple-400 font-black"
                    : "bg-slate-900 text-purple-400 border-slate-800 hover:text-white"
                }`}
              >
                Announcements
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyUnread}
                  onChange={(e) => setOnlyUnread(e.target.checked)}
                  className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-900"
                />
                <span>Unread only</span>
              </label>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-slate-400 hover:text-yellow-400 font-semibold flex items-center gap-1 transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const isRead = (notif.readUids || []).includes(currentUserId);
              const catConfig = getCategoryConfig(notif.category);
              const CatIcon = catConfig.icon;
              const isUrgent = notif.priority === "urgent";

              return (
                <div
                  key={notif.id}
                  className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all shadow-sm ${
                    !isRead
                      ? "border-yellow-400/40 bg-slate-900/90 ring-1 ring-yellow-400/20"
                      : "border-slate-800/80 hover:border-slate-700 opacity-90 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Category Icon */}
                      <div className={`p-2 rounded-xl border shrink-0 ${catConfig.color}`}>
                        <CatIcon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${catConfig.color}`}
                          >
                            {catConfig.label}
                          </span>

                          {isUrgent && (
                            <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Urgent
                            </span>
                          )}

                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(notif.createdAt)}
                          </span>

                          {notif.createdByName && (
                            <span className="text-[11px] text-slate-400">
                              • From <strong className="text-slate-300 font-semibold">{notif.createdByName}</strong>
                            </span>
                          )}
                        </div>

                        <h2 className="text-sm sm:text-base font-extrabold text-white">
                          {notif.title}
                        </h2>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                          {notif.message}
                        </p>

                        {/* Action Link button */}
                        {notif.actionUrl && (
                          <div className="pt-2">
                            <Link
                              href={notif.actionUrl}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 px-3 py-1.5 rounded-lg transition"
                            >
                              <span>{notif.actionLabel || "View Details"}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleRead(notif)}
                        className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                          isRead
                            ? "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700"
                            : "bg-yellow-400 text-slate-950 border-yellow-400 hover:bg-yellow-300"
                        }`}
                        title={isRead ? "Mark as unread" : "Mark as read"}
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isRead ? "Read" : "Unread"}</span>
                      </button>

                      {canBroadcast && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNotification(notif.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredNotifications.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Notifications Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {onlyUnread
                    ? "You've caught up on all unread notifications! Check the 'All' tab to review previous updates."
                    : "No notifications matched your current filter criteria."}
                </p>
                {onlyUnread && (
                  <button
                    type="button"
                    onClick={() => setOnlyUnread(false)}
                    className="text-xs font-bold text-yellow-400 hover:text-yellow-300"
                  >
                    View All Notifications
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preferences Tab View */}
      {activeTab === "preferences" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl max-w-2xl mx-auto">
          <div className="border-b border-slate-800 pb-4 space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-yellow-400" />
              Member Notification Preferences
            </h2>
            <p className="text-xs text-slate-400">
              Customize which alerts you want to receive inside the portal, by email, or for emergency gig calls.
            </p>
          </div>

          {/* Master Hiatus Safeguard Banner */}
          <div
            className={`rounded-xl p-4 border transition ${
              isOnHiatus
                ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                : "bg-slate-950 border-slate-800 text-slate-300"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Palmtree
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isOnHiatus ? "text-amber-400" : "text-slate-500"
                  }`}
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Hiatus Mode (Master Dispatch Mute)</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                        isOnHiatus
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {isOnHiatus ? "On Hiatus" : "Active"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {isOnHiatus
                      ? "Hiatus is active. You will receive ZERO gig dispatches or availability requests until resumed."
                      : "When enabled, you are temporarily relieved of band calls and will receive no gig availability or dispatch emails."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={togglingHiatus}
                onClick={handleToggleHiatus}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer disabled:opacity-50 ${
                  isOnHiatus
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold"
                    : "bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/30"
                }`}
              >
                {togglingHiatus ? "Updating..." : isOnHiatus ? "Resume Active" : "Take Hiatus"}
              </button>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400">
                In-App Alert Subscriptions
              </h3>

              <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
                <label className="flex items-center justify-between pt-2 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">Gig Alerts & Call Times</span>
                    <span className="text-[11px] text-slate-400">
                      New shows booked, call time postings, and stage schedule releases.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.gigAlerts}
                    onChange={(e) => setCustomPreferences({ ...preferences, gigAlerts: e.target.checked })}
                    className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-900 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between pt-3 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">Logistics & Venue Shifts</span>
                    <span className="text-[11px] text-slate-400">
                      Attire changes, staging area adjustments, parking updates, and weather plans.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.logisticsChanges}
                    onChange={(e) => setCustomPreferences({ ...preferences, logisticsChanges: e.target.checked })}
                    className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-900 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between pt-3 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">Rehearsal Calls & Sectionals</span>
                    <span className="text-[11px] text-slate-400">
                      Weekly rehearsal reminders, sectional practice calls, and attendance deadlines.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.rehearsalNotices}
                    onChange={(e) => setCustomPreferences({ ...preferences, rehearsalNotices: e.target.checked })}
                    className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-900 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between pt-3 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">Band-Wide Broadcasts</span>
                    <span className="text-[11px] text-slate-400">
                      Official announcements, leadership letters, and community news.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.broadcasts}
                    onChange={(e) => setCustomPreferences({ ...preferences, broadcasts: e.target.checked })}
                    className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-900 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between pt-3 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">Repertoire & Tune Proposals</span>
                    <span className="text-[11px] text-slate-400">
                      Updates when suggested tunes are reviewed, approved, or charted.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.suggestionActivity}
                    onChange={(e) => setCustomPreferences({ ...preferences, suggestionActivity: e.target.checked })}
                    className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-900 h-4 w-4"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400">
                Delivery Channels & Frequency
              </h3>

              <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
                <label className="flex items-center justify-between pt-2 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">Weekly Email Digest</span>
                    <span className="text-[11px] text-slate-400">
                      Receive a consolidated summary of upcoming gigs, rehearsals, and pending RSVPs.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.emailDigest}
                    onChange={(e) => setCustomPreferences({ ...preferences, emailDigest: e.target.checked })}
                    className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-900 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between pt-3 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">SMS Urgent Alert Safeguard</span>
                    <span className="text-[11px] text-slate-400">
                      Only dispatch SMS for critical day-of-show weather or step-off changes.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.smsEmergencyOnly}
                    onChange={(e) => setCustomPreferences({ ...preferences, smsEmergencyOnly: e.target.checked })}
                    className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-900 h-4 w-4"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {prefSaveSuccess && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Preferences saved successfully!
                </span>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={savingPreferences}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {savingPreferences && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Preferences
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Leadership Broadcast Composer Modal */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-yellow-400" />
                Broadcast Announcement
              </h2>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weather Plan Update for Saturday Parade"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={broadcastCategory}
                    onChange={(e) => setBroadcastCategory(e.target.value as NotificationCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="broadcast">Announcement</option>
                    <option value="gig_alert">Gig Alert</option>
                    <option value="logistics_change">Logistics Change</option>
                    <option value="rehearsal_notice">Rehearsal Notice</option>
                    <option value="suggestion_activity">Repertoire Update</option>
                    <option value="system">System Notice</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Priority</label>
                  <select
                    value={broadcastPriority}
                    onChange={(e) => setBroadcastPriority(e.target.value as NotificationPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Audience</label>
                  <select
                    value={broadcastRecipient}
                    onChange={(e) => setBroadcastRecipient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="all">Entire Band Roster</option>
                    <option value="section:drumline">Drumline & Percussion</option>
                    <option value="section:sousaphones">Sousaphones</option>
                    <option value="section:trombones">Trombones</option>
                    <option value="section:trumpets">Trumpets</option>
                    <option value="section:saxophones">Saxophones</option>
                    <option value="section:auxiliary">Auxiliary</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Message Content *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your message for band members..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Action URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /portal/gigs/gig_123 or /portal/library"
                    value={broadcastActionUrl}
                    onChange={(e) => setBroadcastActionUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Action Button Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. View Call Sheet"
                    value={broadcastActionLabel}
                    onChange={(e) => setBroadcastActionLabel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              {broadcastSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Broadcast dispatched to member inboxes successfully!
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {sendingBroadcast && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Dispatch Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
