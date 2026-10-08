// src/lib/portal/gigDispatchEngine.ts
import { collection, collectionGroup, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { User } from "@/lib/schema/user";
import { BlackoutDate } from "@/lib/schema/blackout";

export interface ResolvedMusician {
  uid: string;
  email: string;
  displayName: string;
  sectionId?: string | null;
  instruments?: string[];
}

export interface AvailabilityResolutionResult {
  eligibleRecipients: ResolvedMusician[];
  totalActiveMembers: number;
  excludedHiatusCount: number;
  excludedBlackoutCount: number;
  blackedOutMusicians: { uid: string; displayName: string; reason?: string }[];
  hiatusMusicians: { uid: string; displayName: string }[];
}

export interface ConfirmedResolutionResult {
  confirmedRecipients: ResolvedMusician[];
  totalAttendingCount: number;
  totalProbableCount: number;
  totalCommittedCount: number;
  excludedHiatusCount: number;
  hiatusMusicians: { uid: string; displayName: string }[];
}

/**
 * Resolves the eligible recipient list for an initial gig availability dispatch.
 * 
 * Rules:
 * 1. Must be an active member (status !== "inactive" && status !== "pending").
 * 2. Members with "hiatus" status or onHiatus === true are STRICTLY EXCLUDED.
 * 3. Members who have blacked out the gig date are STRICTLY EXCLUDED.
 * 4. Members with gigAlerts explicitly disabled in notificationPreferences are excluded.
 */
export async function resolveGigAvailabilityRecipients(
  gigDate: string
): Promise<AvailabilityResolutionResult> {
  const normalizedGigDate = (gigDate || "").split("T")[0].trim();

  // 1. Fetch all band members
  const usersSnap = await getDocs(collection(db, "users"));
  const allUsers: User[] = [];
  usersSnap.forEach((d) => {
    const data = d.data() as User;
    allUsers.push({
      ...data,
      uid: d.id,
    });
  });

  // 2. Fetch all blackouts across all users
  const blackedOutMap = new Map<string, { uid: string; reason?: string }>();
  try {
    const blackoutsSnap = await getDocs(collectionGroup(db, "blackouts"));
    blackoutsSnap.forEach((d) => {
      const data = d.data() as Partial<BlackoutDate>;
      const uid = data.uid || d.ref.parent?.parent?.id;
      if (!uid) return;

      const start = (data.startDate || "").split("T")[0].trim();
      const end = (data.endDate || data.startDate || "").split("T")[0].trim();

      if (start && normalizedGigDate >= start && normalizedGigDate <= end) {
        blackedOutMap.set(uid, {
          uid,
          reason: data.reason || "Scheduled blackout",
        });
      }
    });
  } catch (err) {
    console.warn("Notice: collectionGroup blackouts fetch fell back:", err);
  }

  const eligibleRecipients: ResolvedMusician[] = [];
  const blackedOutMusicians: { uid: string; displayName: string; reason?: string }[] = [];
  const hiatusMusicians: { uid: string; displayName: string }[] = [];
  let totalActiveMembers = 0;

  for (const user of allUsers) {
    // Basic account validation
    if (!user.email || !user.email.includes("@")) continue;
    if (user.status === "inactive" || user.status === "pending") continue;

    totalActiveMembers++;

    // Hiatus Guard: Mute all gig dispatches if member is on hiatus
    const isOnHiatus = Boolean(user.onHiatus || user.status === "hiatus");
    if (isOnHiatus) {
      hiatusMusicians.push({
        uid: user.uid,
        displayName: user.displayName || "Musician",
      });
      continue;
    }

    // Blackout Date Guard: Exclude if member has blacked out this date
    if (blackedOutMap.has(user.uid)) {
      const bo = blackedOutMap.get(user.uid);
      blackedOutMusicians.push({
        uid: user.uid,
        displayName: user.displayName || "Musician",
        reason: bo?.reason,
      });
      continue;
    }

    // Notification Preferences Guard
    if (user.notificationPreferences?.gigAlerts === false) {
      continue;
    }

    eligibleRecipients.push({
      uid: user.uid,
      email: user.email.trim().toLowerCase(),
      displayName: user.displayName || "Musician",
      sectionId: user.sectionId,
      instruments: user.instruments || [],
    });
  }

  return {
    eligibleRecipients,
    totalActiveMembers,
    excludedHiatusCount: hiatusMusicians.length,
    excludedBlackoutCount: blackedOutMusicians.length,
    blackedOutMusicians,
    hiatusMusicians,
  };
}

/**
 * Resolves the confirmed recipient list for a confirmed gig dispatch.
 * 
 * Rules:
 * 1. Musician must have RSVP'd "attending" (in) or "probable" for the gig.
 * 2. Musician must NOT be on hiatus.
 * 3. Musician must have a valid email.
 */
export async function resolveGigConfirmedRecipients(
  gigId: string
): Promise<ConfirmedResolutionResult> {
  const rsvpsSnap = await getDocs(collection(db, "gigs", gigId, "rsvps"));
  const attendingUids: string[] = [];
  const probableUids: string[] = [];
  const committedUids: string[] = [];

  rsvpsSnap.forEach((d) => {
    const data = d.data();
    if (data.status === "attending") {
      attendingUids.push(d.id);
      committedUids.push(d.id);
    } else if (data.status === "probable") {
      probableUids.push(d.id);
      committedUids.push(d.id);
    }
  });

  const confirmedRecipients: ResolvedMusician[] = [];
  const hiatusMusicians: { uid: string; displayName: string }[] = [];

  // Query each committed user (attending or probable) to verify active and non-hiatus status
  for (const uid of committedUids) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) continue;

      const user = userDoc.data() as User;
      if (!user.email || !user.email.includes("@")) continue;
      if (user.status === "inactive") continue;

      // Hiatus check
      const isOnHiatus = Boolean(user.onHiatus || user.status === "hiatus");
      if (isOnHiatus) {
        hiatusMusicians.push({
          uid,
          displayName: user.displayName || "Musician",
        });
        continue;
      }

      confirmedRecipients.push({
        uid,
        email: user.email.trim().toLowerCase(),
        displayName: user.displayName || "Musician",
        sectionId: user.sectionId,
        instruments: user.instruments || [],
      });
    } catch (err) {
      console.warn("Notice: Error fetching attending user profile:", uid, err);
    }
  }

  return {
    confirmedRecipients,
    totalAttendingCount: attendingUids.length,
    totalProbableCount: probableUids.length,
    totalCommittedCount: committedUids.length,
    excludedHiatusCount: hiatusMusicians.length,
    hiatusMusicians,
  };
}

