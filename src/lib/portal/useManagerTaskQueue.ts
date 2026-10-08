"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import {
  canManageGigs,
  canManageCatalog,
  canManageContent,
  canManageContactInbox,
  canManageFinances,
  canManageAuditions,
  canManageRoster,
  isAdmin,
  isSectionLeader,
} from "@/lib/auth/permissions";
import { NotificationSchema, AppNotification } from "@/lib/schema/notification";

export interface ManagerTaskItem {
  id: string;
  category:
    | "inquiries"
    | "suggestions"
    | "comments"
    | "contacts"
    | "reimbursements"
    | "auditions"
    | "onboarding";
  title: string;
  description: string;
  count: number;
  href: string;
  priority: "urgent" | "normal" | "low";
}

export interface ManagerTaskQueueResult {
  totalCount: number;
  managerTaskCount: number;
  dispatchCount: number;
  tasks: ManagerTaskItem[];
  recentDispatches: AppNotification[];
  loading: boolean;
  markDispatchAsRead: (notificationId: string) => Promise<void>;
}

export function useManagerTaskQueue(): ManagerTaskQueueResult {
  const { profile, loading: authLoading } = useAuth();

  // Task queue sub-counts
  const [inquiryCount, setInquiryCount] = useState(0);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [flaggedCommentCount, setFlaggedCommentCount] = useState(0);
  const [contactInboxCount, setContactInboxCount] = useState(0);
  const [reimbursementCount, setReimbursementCount] = useState(0);
  const [auditionCount, setAuditionCount] = useState(0);
  const [pendingUserCount, setPendingUserCount] = useState(0);

  // In-app broadcast dispatches
  const [dispatches, setDispatches] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const isUserAdmin = isAdmin(profile);
  const hasGigPerms = canManageGigs(profile);
  const hasCatalogPerms = canManageCatalog(profile);
  const hasCommunityPerms = canManageContent(profile) || canManageContactInbox(profile);
  const hasFinancePerms = canManageFinances(profile);
  const hasAuditionPerms = canManageAuditions(profile);
  const hasRosterPerms = canManageRoster(profile);

  // 1. Subscribe to personal dispatches / notifications
  useEffect(() => {
    if (authLoading || !profile?.uid) return;

    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(25)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const unreadList: AppNotification[] = [];
        snap.forEach((d) => {
          const parsed = NotificationSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            const n = parsed.data;
            const isForMe =
              n.recipientUid === "all" ||
              n.recipientUid === profile.uid ||
              (profile.sectionId && n.recipientUid === `section:${profile.sectionId}`) ||
              (profile.roles && profile.roles.some((r) => n.recipientUid === `role:${r}`));
            const isRead = (n.readUids || []).includes(profile.uid);
            if (isForMe && !isRead) {
              unreadList.push(n);
            }
          }
        });
        setDispatches(unreadList);
        setLoading(false);
      },
      (err) => {
        console.warn("Notice: notifications subscriber note:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading, profile?.uid, profile?.sectionId, profile?.roles]);

  // 2. Subscribe to Pending Gig Inquiries (Gig Manager / Admin)
  useEffect(() => {
    if (authLoading || (!hasGigPerms && !isUserAdmin)) {
      setInquiryCount(0);
      return;
    }

    const q = query(collection(db, "inquiries"), where("status", "==", "pending"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setInquiryCount(snap.size);
      },
      (err) => console.warn("Notice: inquiries count subscriber note:", err)
    );

    return () => unsub();
  }, [authLoading, hasGigPerms, isUserAdmin]);

  // 3. Subscribe to Song Suggestions Awaiting Review (Catalog Manager / Admin)
  useEffect(() => {
    if (authLoading || (!hasCatalogPerms && !isUserAdmin)) {
      setSuggestionCount(0);
      return;
    }

    const unsub = onSnapshot(
      collection(db, "suggestions"),
      (snap) => {
        let count = 0;
        snap.forEach((d) => {
          const data = d.data();
          const st = data.status;
          if (st === "submitted" || st === "under_review" || st === "pitched" || st === "in_review") {
            count++;
          }
        });
        setSuggestionCount(count);
      },
      (err) => console.warn("Notice: suggestions count subscriber note:", err)
    );

    return () => unsub();
  }, [authLoading, hasCatalogPerms, isUserAdmin]);

  // 4. Subscribe to Flagged Comments (Community Manager / Admin)
  useEffect(() => {
    if (authLoading || (!hasCommunityPerms && !isUserAdmin)) {
      setFlaggedCommentCount(0);
      return;
    }

    const q = query(collection(db, "comments"), where("isFlagged", "==", true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setFlaggedCommentCount(snap.size);
      },
      (err) => console.warn("Notice: flagged comments subscriber note:", err)
    );

    return () => unsub();
  }, [authLoading, hasCommunityPerms, isUserAdmin]);

  // 5. Subscribe to Unread Contact Messages (Community / Web / Admin)
  useEffect(() => {
    if (authLoading || (!hasCommunityPerms && !isUserAdmin)) {
      setContactInboxCount(0);
      return;
    }

    const q = query(collection(db, "contact_messages"), where("status", "==", "unread"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setContactInboxCount(snap.size);
      },
      (err) => console.warn("Notice: contact inbox count subscriber note:", err)
    );

    return () => unsub();
  }, [authLoading, hasCommunityPerms, isUserAdmin]);

  // 6. Subscribe to Submitted Reimbursements (Treasurer / Admin)
  useEffect(() => {
    if (authLoading || (!hasFinancePerms && !isUserAdmin)) {
      setReimbursementCount(0);
      return;
    }

    const q = query(collection(db, "reimbursements"), where("status", "==", "submitted"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReimbursementCount(snap.size);
      },
      (err) => console.warn("Notice: reimbursements count subscriber note:", err)
    );

    return () => unsub();
  }, [authLoading, hasFinancePerms, isUserAdmin]);

  // 7. Subscribe to Musician Auditions (Membership Manager / Section Leader / Admin)
  useEffect(() => {
    if (authLoading || (!hasAuditionPerms && !isUserAdmin)) {
      setAuditionCount(0);
      return;
    }

    const unsub = onSnapshot(
      collection(db, "auditions"),
      (snap) => {
        let count = 0;
        const mySection = profile?.sectionId;
        const leaderOnly = !isUserAdmin && !hasRosterPerms && isSectionLeader(profile);

        snap.forEach((d) => {
          const data = d.data();
          const st = data.status;
          if (st === "new" || st === "under_review") {
            if (leaderOnly && mySection) {
              if (data.targetSectionId === mySection) {
                count++;
              }
            } else {
              count++;
            }
          }
        });
        setAuditionCount(count);
      },
      (err) => console.warn("Notice: auditions count subscriber note:", err)
    );

    return () => unsub();
  }, [authLoading, hasAuditionPerms, isUserAdmin, hasRosterPerms, profile]);

  // 8. Subscribe to Pending Account Approvals / Onboarding (Roster / Admin)
  useEffect(() => {
    if (authLoading || (!hasRosterPerms && !isUserAdmin)) {
      setPendingUserCount(0);
      return;
    }

    const q = query(collection(db, "users"), where("status", "==", "pending"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPendingUserCount(snap.size);
      },
      (err) => console.warn("Notice: pending users subscriber note:", err)
    );

    return () => unsub();
  }, [authLoading, hasRosterPerms, isUserAdmin]);

  // Mark a dispatch as read
  const markDispatchAsRead = useCallback(
    async (notificationId: string) => {
      if (!profile?.uid || !notificationId) return;
      try {
        await updateDoc(doc(db, "notifications", notificationId), {
          readUids: arrayUnion(profile.uid),
          updatedAt: new Date().toISOString(),
        });
        setDispatches((prev) => prev.filter((n) => n.id !== notificationId));
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    },
    [profile?.uid]
  );

  // Synthesize task list
  const tasks = useMemo<ManagerTaskItem[]>(() => {
    const list: ManagerTaskItem[] = [];

    if (flaggedCommentCount > 0) {
      list.push({
        id: "flagged-comments",
        category: "comments",
        title: "Comment Moderation",
        description: `${flaggedCommentCount} comment${flaggedCommentCount === 1 ? "" : "s"} flagged by members for review`,
        count: flaggedCommentCount,
        href: "/admin/comments",
        priority: "urgent",
      });
    }

    if (inquiryCount > 0) {
      list.push({
        id: "booking-inquiries",
        category: "inquiries",
        title: "Booking Inquiries",
        description: `${inquiryCount} new performance inquiry lead${inquiryCount === 1 ? "" : "s"} submitted`,
        count: inquiryCount,
        href: "/admin/inquiries",
        priority: "normal",
      });
    }

    if (suggestionCount > 0) {
      list.push({
        id: "tune-suggestions",
        category: "suggestions",
        title: "Song Pitches & Feedback",
        description: `${suggestionCount} suggestion${suggestionCount === 1 ? "" : "s"} awaiting catalog review`,
        count: suggestionCount,
        href: "/admin/suggestions",
        priority: "normal",
      });
    }

    if (contactInboxCount > 0) {
      list.push({
        id: "contact-inbox",
        category: "contacts",
        title: "Public Contact Messages",
        description: `${contactInboxCount} unread message${contactInboxCount === 1 ? "" : "s"} in community inbox`,
        count: contactInboxCount,
        href: "/admin/contact-inbox",
        priority: "normal",
      });
    }

    if (reimbursementCount > 0) {
      list.push({
        id: "expense-claims",
        category: "reimbursements",
        title: "Expense Claims",
        description: `${reimbursementCount} reimbursement claim${reimbursementCount === 1 ? "" : "s"} pending review`,
        count: reimbursementCount,
        href: "/portal/reimbursements",
        priority: "normal",
      });
    }

    if (auditionCount > 0) {
      list.push({
        id: "musician-auditions",
        category: "auditions",
        title: "Musician Auditions",
        description: `${auditionCount} prospective player application${auditionCount === 1 ? "" : "s"} to review`,
        count: auditionCount,
        href: "/admin/auditions",
        priority: "normal",
      });
    }

    if (pendingUserCount > 0) {
      list.push({
        id: "pending-onboarding",
        category: "onboarding",
        title: "Member Onboarding",
        description: `${pendingUserCount} new account${pendingUserCount === 1 ? "" : "s"} pending roster approval`,
        count: pendingUserCount,
        href: "/admin/roster",
        priority: "normal",
      });
    }

    return list;
  }, [
    flaggedCommentCount,
    inquiryCount,
    suggestionCount,
    contactInboxCount,
    reimbursementCount,
    auditionCount,
    pendingUserCount,
  ]);

  const managerTaskCount = useMemo(() => {
    return tasks.reduce((sum, t) => sum + t.count, 0);
  }, [tasks]);

  const dispatchCount = dispatches.length;
  const totalCount = managerTaskCount + dispatchCount;

  return {
    totalCount,
    managerTaskCount,
    dispatchCount,
    tasks,
    recentDispatches: dispatches,
    loading,
    markDispatchAsRead,
  };
}

