"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { BlackoutDate, BlackoutDateSchema } from "@/lib/schema/blackout";

/**
 * Normalizes date string into YYYY-MM-DD format
 */
export function normalizeDateOnly(dateStr?: string | null): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0].trim();
}

/**
 * Checks whether an event date falls within any of the user's blackout windows.
 */
export function isDateInUserBlackout(
  eventDateStr: string | undefined | null,
  blackouts: BlackoutDate[]
): boolean {
  if (!eventDateStr || !blackouts || blackouts.length === 0) return false;
  const eventDate = normalizeDateOnly(eventDateStr);
  if (!eventDate) return false;

  return blackouts.some((bo) => {
    const start = normalizeDateOnly(bo.startDate);
    const end = normalizeDateOnly(bo.endDate || bo.startDate);
    if (!start) return false;
    return eventDate >= start && eventDate <= end;
  });
}

/**
 * Hook to subscribe to the current user's personal blackout dates in real-time.
 */
export function useUserBlackouts() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const uid = profile?.uid || firebaseUser?.uid;

  useEffect(() => {
    if (!uid) return;

    const unsub = onSnapshot(
      collection(db, "users", uid, "blackouts"),
      (snap) => {
        const list: BlackoutDate[] = [];
        snap.forEach((d) => {
          const parsed = BlackoutDateSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            list.push(parsed.data);
          } else {
            const data = d.data();
            list.push({
              id: d.id,
              uid: uid,
              userName: data.userName || "Musician",
              startDate: data.startDate || "",
              endDate: data.endDate || data.startDate || "",
              reason: data.reason || "",
              createdAt: data.createdAt || "",
            });
          }
        });
        setBlackouts(list);
        setIsFetching(false);
      },
      (err) => {
        console.warn("Notice: user blackouts subscriber note:", err);
        setIsFetching(false);
      }
    );

    return () => unsub();
  }, [uid]);

  const checkIsDateBlackedOut = useMemo(() => {
    return (eventDateStr: string | undefined | null) => isDateInUserBlackout(eventDateStr, blackouts);
  }, [blackouts]);

  const loading = authLoading || (Boolean(uid) && isFetching);

  return {
    blackouts,
    loading,
    isDateInBlackout: checkIsDateBlackedOut,
  };
}
