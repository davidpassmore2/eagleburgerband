"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { 
  ListMusic, 
  Plus, 
  Trash2, 
  Music, 
  Loader2, 
  AlertCircle 
} from "lucide-react";

type MasterSetlist = {
  id: string;
  name: string;
  description?: string;
  songCount?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminSetlistsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [setlists, setSetlists] = useState<MasterSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "setlists"),
      (snap) => {
        const list: MasterSetlist[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as MasterSetlist);
        });

        list.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setSetlists(list);
        setLoading(false);
      },
      (error) => {
        console.error("Setlists listener error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading master setlists...
      </div>
    );
  }

  if (!canManageGigs(profile)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold">
        Manager or Admin privileges required to edit master setlist templates.
      </div>
    );
  }

  const handleCreateSetlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      await addDoc(collection(db, "setlists"), {
        name: newTitle.trim(),
        songCount: 0,
        tags: ["Master"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNewTitle("");
    } catch (err) {
      alert("Failed to create setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSetlist = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "setlists", id));
    } catch (err) {
      alert("Failed to delete setlist: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Admin Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {setlists.length} template(s)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Setlist Templates</h1>
          <p className="text-xs text-slate-400">
            Define reusable master setlists, standard parade blocks, and festival repertoires.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreateSetlist}
        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3"
      >
        <div className="relative flex-1 w-full">
          <Music className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            required
            placeholder="New template title (e.g. 'Standard 45-Min Parade Block')..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
          />
        </div>
        <button
          type="submit"
          disabled={isCreating}
          className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 w-full sm:w-auto shrink-0"
        >
          {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {isCreating ? "Adding..." : "Add Template"}
        </button>
      </form>

      {setlists.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 text-slate-600" />
          No master setlist templates defined yet. Create one above to establish a baseline set.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {setlists.map((sl) => (
            <div
              key={sl.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-yellow-400 shrink-0" />
                  <h2 className="text-sm font-bold text-white truncate">{sl.name}</h2>
                </div>
                {sl.tags && (
                  <div className="flex flex-wrap gap-1">
                    {sl.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDeleteSetlist(sl.id, sl.name)}
                className="text-slate-500 hover:text-rose-400 p-2 transition rounded-lg hover:bg-slate-800 shrink-0"
                title="Delete Template"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}