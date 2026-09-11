"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { buildRepertoireAnalytics, normalizeSongTitle, TuneStat, GigData } from "@/lib/repertoire/analytics";
import { 
  Music2, 
  Search, 
  ExternalLink, 
  Flame, 
  Archive, 
  RotateCcw,
  Sparkles,
  Filter
} from "lucide-react";

type Song = {
  id: string;
  title: string;
  artist?: string;
  arranger?: string;
  keySignature?: string;
  tempoBpm?: number;
  driveLink?: string;
  tags?: string[];
};

export default function RepertoireLibraryPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [, setGigs] = useState<GigData[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, TuneStat>>({});
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "frequent" | "vault" | "unplayed">("all");
  const [loading, setLoading] = useState(true);

  // Listen to library charts
  useEffect(() => {
    const qSongs = query(collection(db, "songs"), orderBy("title", "asc"));
    const unsubSongs = onSnapshot(qSongs, (snap) => {
      const list: Song[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Song);
      });
      setSongs(list);
      setLoading(false);
    });

    // Listen to gigs to calculate live analytics
    const qGigs = query(collection(db, "gigs"), orderBy("date", "desc"));
    const unsubGigs = onSnapshot(qGigs, (snap) => {
      const list: GigData[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as GigData);
      });
      setGigs(list);
      setAnalytics(buildRepertoireAnalytics(list));
    });

    return () => {
      unsubSongs();
      unsubGigs();
    };
  }, []);

  if (loading) {
    return <div className="p-8 text-slate-400">Loading repertoire catalog...</div>;
  }

  // Filter and search
  const filteredSongs = songs.filter((song) => {
    const norm = normalizeSongTitle(song.title);
    const stat = analytics[norm];

    const matchesSearch =
      song.title.toLowerCase().includes(search.toLowerCase()) ||
      (song.artist && song.artist.toLowerCase().includes(search.toLowerCase())) ||
      (song.arranger && song.arranger.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterCategory === "all") return true;
    if (filterCategory === "unplayed") return !stat || stat.playCount === 0;
    if (filterCategory === "frequent") return stat?.statusCategory === "frequent";
    if (filterCategory === "vault") return stat?.statusCategory === "vault";

    return true;
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Chart Library & Analytics
            </span>
            <span className="text-xs font-mono text-slate-400">
              {songs.length} charts active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Repertoire Catalog</h1>
          <p className="text-xs text-slate-400">
            Browse sheet music charts, track performance frequencies, and monitor repertoire rotation across all gigs.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search title, artist, arranger..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
          />
        </div>
      </div>

      {/* Rotation Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5 text-yellow-400" /> Filter:
        </span>

        <button
          type="button"
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
            filterCategory === "all"
              ? "bg-yellow-400 text-slate-950 border-yellow-400"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          All Repertoire ({songs.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory("frequent")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
            filterCategory === "frequent"
              ? "bg-amber-400 text-slate-950 border-amber-400"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" /> Frequently Played
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory("vault")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
            filterCategory === "vault"
              ? "bg-purple-500 text-white border-purple-400"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          <Archive className="w-3.5 h-3.5 text-purple-400" /> In The Vault (&gt;90 Days)
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory("unplayed")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
            filterCategory === "unplayed"
              ? "bg-slate-700 text-white border-slate-600"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Unperformed
        </button>
      </div>

      {/* Repertoire Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredSongs.map((song) => {
          const norm = normalizeSongTitle(song.title);
          const stat = analytics[norm];

          return (
            <div
              key={song.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-slate-700 transition"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Music2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      {song.title}
                    </h2>
                    {song.artist && (
                      <p className="text-xs text-slate-400">By {song.artist}</p>
                    )}
                  </div>

                  {song.keySignature && (
                    <span className="text-[10px] font-mono font-bold text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                      {song.keySignature}
                    </span>
                  )}
                </div>

                {song.arranger && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Arranged by: {song.arranger}
                  </p>
                )}
              </div>

              {/* Performance History / Rotation Badge */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {stat ? (
                    <>
                      <span className="bg-slate-950 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-800">
                        Played {stat.playCount} {stat.playCount === 1 ? "time" : "times"}
                      </span>

                      {stat.statusCategory === "frequent" && (
                        <span className="bg-amber-400/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Recent Rotation
                        </span>
                      )}

                      {stat.statusCategory === "vault" && (
                        <span className="bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                          <Archive className="w-3 h-3" /> In Vault
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Ready for setlists
                    </span>
                  )}
                </div>

                {song.driveLink && (
                  <a
                    href={song.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300 font-semibold text-xs flex items-center gap-1"
                  >
                    Charts <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}