"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  Music, 
  Search, 
  Headphones, 
  FileText,
  UserCheck
} from "lucide-react";

type Tune = {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
  tempo?: string;
  meter?: string;
  driveLink?: string;
  audioSampleUrl?: string;
  chartContactName?: string;
  tags?: string[];
  notes?: string;
  status: string;
};

export default function PerformerLibraryPage() {
  const [tunes, setTunes] = useState<Tune[]>([]);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tunes"), (snap) => {
      const list: Tune[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        if (raw.status !== "archived") {
          list.push({
            id: d.id,
            title: raw.title || "Untitled",
            artist: raw.artist || "",
            keySignature: raw.keySignature || "",
            tempo: raw.tempo || "",
            meter: raw.meter || "4/4",
            driveLink: raw.driveLink || "",
            audioSampleUrl: raw.audioSampleUrl || "",
            chartContactName: raw.chartContactName || "",
            tags: Array.isArray(raw.tags) ? raw.tags : [],
            notes: raw.notes || "",
            status: raw.status || "active",
          });
        }
      });
      list.sort((a, b) => a.title.localeCompare(b.title));
      setTunes(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const allTags = Array.from(new Set(tunes.flatMap((t) => t.tags || []))).sort();

  const filtered = tunes.filter((t) => {
    const q = search.toLowerCase();
    const matchQ =
      t.title.toLowerCase().includes(q) ||
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.keySignature && t.keySignature.toLowerCase().includes(q)) ||
      (t.chartContactName && t.chartContactName.toLowerCase().includes(q));
    const matchTag = activeTag === "all" || (t.tags && t.tags.includes(activeTag));
    return matchQ && matchTag;
  });

  if (loading) return <div className="p-8 text-slate-400">Loading digital music book...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Music className="text-yellow-400 w-6 h-6" /> Band Sheet Music Book
        </h1>
        <p className="text-slate-400 text-sm">
          Instant mobile access to charts, keys, tempos, and rehearsal recordings.
        </p>
      </div>

      {/* Search & Tag Pills */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search chart title, artist, key, or charting lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 w-full focus:outline-none focus:border-yellow-400"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTag("all")}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition font-medium text-[11px] ${
                activeTag === "all"
                  ? "bg-yellow-400 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              All ({tunes.length})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition font-medium text-[11px] ${
                  activeTag === tag
                    ? "bg-yellow-400 text-slate-950 font-bold"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            No charts found matching your search.
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{t.title}</h3>
                    {t.artist && <p className="text-xs text-slate-400">{t.artist}</p>}
                  </div>
                  {t.keySignature && (
                    <span className="font-mono text-xs font-bold text-yellow-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                      {t.keySignature}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px] font-mono mt-2">
                  {t.tempo && <span>{t.tempo} BPM</span>}
                  {t.meter && <span>{t.meter}</span>}
                  {t.chartContactName && (
                    <span className="text-slate-300 flex items-center gap-1 font-sans">
                      <UserCheck className="w-3 h-3 text-yellow-400" />
                      {t.chartContactName}
                    </span>
                  )}
                  {t.status === "in_rehearsal" && (
                    <span className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase">
                      Rehearsing
                    </span>
                  )}
                </div>

                {t.notes && (
                  <p className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded mt-2 border border-slate-800/40">
                    {t.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                {t.driveLink ? (
                  <a
                    href={t.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition"
                  >
                    <FileText className="w-3.5 h-3.5" /> View Chart
                  </a>
                ) : (
                  <span className="flex-1 text-center py-1.5 text-slate-600 text-xs">
                    No PDF attached
                  </span>
                )}

                {t.audioSampleUrl && (
                  <a
                    href={t.audioSampleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition border border-slate-700"
                    title="Listen to audio recording"
                  >
                    <Headphones className="w-3.5 h-3.5 text-yellow-400" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}