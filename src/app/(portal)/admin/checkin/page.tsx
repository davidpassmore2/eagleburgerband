"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs, canManageSections } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  UserCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowRight, 
  Loader2, 
  ShieldAlert,
  Users
} from "lucide-react";

interface GigItem {
  id: string;
  date: string;
  status: string;
  publicDetails?: {
    title: string;
    venue: string;
  };
  internalLogistics?: {
    title: string;
    callTime: string;
    downbeat: string;
    unloadingAddress: string;
  };
}

export default function CheckInSelectorPage() {
  const { profile, loading: authLoading } = useAuth();
  const [gigs, setGigs] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const q = query(collection(db, "gigs"), orderBy("date", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: GigItem[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as GigItem);
        });
        setGigs(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading gigs for check-in:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading downbeat check-in schedules...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  const hasPermission = Boolean(userProfile && (canManageGigs(userProfile) || canManageSections(userProfile)));

  if (!hasPermission) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Section Leader or Gig Manager permissions required to access day-of roll call.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Stage 22 Kiosk
            </span>
            <span className="text-xs font-mono text-slate-400">Day-of Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Downbeat Check-In Kiosk</h1>
          <p className="text-xs text-slate-400">
            Select a performance call sheet to launch the live on-site roll call and track member arrival times.
          </p>
        </div>
      </div>

      {/* Gig Selection Cards */}
      <div className="space-y-3">
        {gigs.map((gig) => {
          const title = gig.internalLogistics?.title || gig.publicDetails?.title || "Eagleburger Performance";
          const venue = gig.publicDetails?.venue || gig.internalLogistics?.unloadingAddress || "Location TBD";
          const callTime = gig.internalLogistics?.callTime || "TBD";
          const downbeat = gig.internalLogistics?.downbeat || "TBD";

          return (
            <div
              key={gig.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {gig.date}
                  </span>
                  <span className="text-sm font-bold text-white truncate">{title}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Call: <strong className="text-slate-200">{callTime}</strong> | Downbeat:{" "}
                    <strong className="text-slate-200">{downbeat}</strong>
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{venue}</span>
                  </span>
                </div>
              </div>

              <Link
                href={`/portal/checkin/${gig.id}`}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow shrink-0"
              >
                <UserCheck className="w-4 h-4" />
                <span>Launch Roll Call</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          );
        })}

        {gigs.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
            No scheduled performances available for check-in.
          </div>
        )}
      </div>
    </div>
  );
}