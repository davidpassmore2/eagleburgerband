"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { isSectionLeader } from "@/lib/auth/permissions";
import { Section, SectionSchema } from "@/lib/schema/section";
import { 
  ShieldAlert, 
  Users, 
  Music, 
  Phone, 
  Mail, 
  Plus, 
  Trash2,
  ShieldCheck
} from "lucide-react";

type SectionMember = {
  uid: string;
  displayName: string;
  email: string;
  sectionId?: string;
  instruments: string[];
  phone?: string;
  roles?: string[];
  [key: string]: unknown;
};

type SectionData = Section & {
  leaderUid?: string;
  leaderUids?: string[];
  [key: string]: unknown;
};

export default function SectionLeaderManagePage() {
  const { profile, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<SectionData[]>([]);
  const [users, setUsers] = useState<SectionMember[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [instrumentInputs, setInstrumentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubSec = onSnapshot(collection(db, "sections"), (snap) => {
      const list: SectionData[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        const parsed = SectionSchema.safeParse(raw);
        if (parsed.success) {
          list.push({ ...parsed.data, ...raw } as SectionData);
        } else {
          list.push(raw as SectionData);
        }
      });
      list.sort((a, b) => a.order - b.order);
      setSections(list);
      if (list.length > 0 && !activeSectionId) {
        setActiveSectionId(profile?.sectionId || list[0].id);
      }
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: SectionMember[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        list.push({
          uid: raw.uid || d.id,
          displayName: raw.displayName || "Unnamed Musician",
          email: raw.email || "",
          sectionId: raw.sectionId || "",
          instruments: Array.isArray(raw.instruments) ? raw.instruments : [],
          phone: typeof raw.phone === "string" ? raw.phone : undefined,
          roles: Array.isArray(raw.roles) ? raw.roles : [],
          ...raw,
        });
      });
      setUsers(list);
    });

    return () => {
      unsubSec();
      unsubUsers();
    };
  }, [profile?.sectionId, activeSectionId]);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying authorization...</div>;
  if (!isSectionLeader(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Section Leader or Administrator credentials required.</span>
      </div>
    );
  }

  const currentSection = sections.find((s) => s.id === activeSectionId);
  const sectionMembers = users.filter((u) => u.sectionId === activeSectionId);

  const handleAddInstrument = async (userId: string, currentInstruments: string[]) => {
    const newInst = instrumentInputs[userId]?.trim();
    if (!newInst) return;

    const updated = [...currentInstruments, newInst];
    await updateDoc(doc(db, "users", userId), {
      instruments: updated,
      updatedAt: new Date().toISOString(),
    });

    setInstrumentInputs((prev) => ({ ...prev, [userId]: "" }));
  };

  const handleRemoveInstrument = async (userId: string, currentInstruments: string[], instToRemove: string) => {
    const updated = currentInstruments.filter((inst) => inst !== instToRemove);
    await updateDoc(doc(db, "users", userId), {
      instruments: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const checkIsLeader = (member: SectionMember): boolean => {
    if (!currentSection) return false;
    
    // Check roles array
    if (member.roles && member.roles.includes("section_leader")) return true;
    
    // Check single leaderUid on section
    if (currentSection.leaderUid && currentSection.leaderUid === member.uid) return true;
    
    // Check leaderUids array on section
    if (Array.isArray(currentSection.leaderUids) && currentSection.leaderUids.includes(member.uid)) return true;

    // Check seed default director
    if (member.email === "director@eagleburgerband.com" && currentSection.id === "sec_low_brass") return true;

    return false;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-yellow-400 w-6 h-6" /> Section Leader Roster Hub
          </h1>
          <p className="text-slate-400 text-sm">
            Manage your section roster, track part assignments, and verify active instruments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase">Section:</label>
          <select
            value={activeSectionId}
            onChange={(e) => setActiveSectionId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-semibold"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentSection && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{currentSection.name} Roster</h2>
            <span className="text-xs font-mono text-yellow-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-bold">
              {sectionMembers.length} Active Players
            </span>
          </div>
          <p className="text-xs text-slate-400">{currentSection.description}</p>
        </div>
      )}

      <div className="space-y-3">
        {sectionMembers.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            No performers currently assigned to this section.
          </div>
        ) : (
          sectionMembers.map((member) => {
            const isLeader = checkIsLeader(member);

            return (
              <div
                key={member.uid}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{member.displayName}</span>
                    {isLeader && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/30">
                        <ShieldCheck className="w-3 h-3" /> Section Leader
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      {member.email}
                    </span>
                    {member.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {member.phone}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {member.instruments.map((inst, i) => (
                      <span
                        key={i}
                        className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-2 py-0.5 rounded flex items-center gap-1.5"
                      >
                        <Music className="w-3 h-3 text-yellow-400" />
                        {inst}
                        <button
                          type="button"
                          onClick={() => handleRemoveInstrument(member.uid, member.instruments, inst)}
                          className="text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="e.g. 1st Trombone"
                    value={instrumentInputs[member.uid] || ""}
                    onChange={(e) =>
                      setInstrumentInputs((prev) => ({
                        ...prev,
                        [member.uid]: e.target.value,
                      }))
                    }
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 flex-1 md:w-40"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddInstrument(member.uid, member.instruments)}
                    className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded text-xs transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Part
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}