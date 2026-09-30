"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canViewRepertoireAnalytics } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { buildSetlistUsageAnalytics } from "@/lib/repertoire/analytics";
import { Setlist, isReusableSetlistTemplate } from "@/lib/schema/setlist";
import { 
  Flame, 
  Snowflake, 
  ArrowLeft, 
  Loader2, 
  ShieldAlert, 
  Search,
  GitCommit,
  ListMusic,
  Music,
  Layers,
  Sparkles,
  ExternalLink,
  TrendingUp
} from "lucide-react";

interface SongDoc {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  active?: boolean;
}

interface GigDoc {
  id: string;
  date: string;
  status: string;
  publicDetails?: { title?: string };
  internalLogistics?: { title?: string; setlistId?: string };
  setlistId?: string;
  setlist?: {
    songId?: string;
    title: string;
  }[];
}

interface TuneStat {
  songId: string;
  title: string;
  artist: string;
  genre: string;
  playCount: number;
  lastPerformedDate: string | null;
  daysSinceLastPlayed: number | null;
  pairedTunes: Record<string, number>;
}

export default function CatalogAnalyticsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [songs, setSongs] = useState<SongDoc[]>([]);
  const [gigs, setGigs] = useState<GigDoc[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"repertoire" | "setlists">("repertoire");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "hot" | "dormant">("all");
  const [setlistCategoryFilter, setSetlistCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (authLoading) return;

    const unsubSongs = onSnapshot(
      collection(db, "tunes"),
      (snap) => {
        const list: SongDoc[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            title: data.title || "Untitled Song",
            artist: data.artist || "Unknown",
            genre: data.genre || "Brass / Street",
            active: data.active !== false && data.status !== "archived",
          });
        });
        setSongs(list);
      },
      (err) => console.warn("Notice: tunes fetch note:", err)
    );

    const qGigs = query(collection(db, "gigs"), orderBy("date", "desc"));
    const unsubGigs = onSnapshot(
      qGigs,
      (snap) => {
        const list: GigDoc[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            date: data.date || "",
            status: data.status || "upcoming",
            publicDetails: data.publicDetails,
            internalLogistics: data.internalLogistics,
            setlistId: data.setlistId || data.internalLogistics?.setlistId,
            setlist: data.setlist,
          });
        });
        setGigs(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading gigs for analytics:", err);
        setLoading(false);
      }
    );

    const unsubSetlists = onSnapshot(
      collection(db, "setlists"),
      (snap) => {
        const list: Setlist[] = [];
        const seenIds = new Set<string>();
        snap.forEach((d) => {
          const data = d.data();
          if (isReusableSetlistTemplate(d.id, data) && !seenIds.has(d.id)) {
            seenIds.add(d.id);
            list.push({ id: d.id, ...data } as Setlist);
          }
        });
        setSetlists(list);
      },
      (err) => console.warn("Notice: setlists fetch note:", err)
    );

    return () => {
      unsubSongs();
      unsubGigs();
      unsubSetlists();
    };
  }, [authLoading]);

  // Compute analytics
  const tuneStats = useMemo(() => {
    const statsMap: Record<string, TuneStat> = {};
    const now = new Date().getTime();

    // 1. Seed with catalog songs
    songs.forEach((s) => {
      const key = s.id || s.title.toLowerCase().trim();
      statsMap[key] = {
        songId: key,
        title: s.title,
        artist: s.artist || "Unknown",
        genre: s.genre || "Brass / Street",
        playCount: 0,
        lastPerformedDate: null,
        daysSinceLastPlayed: null,
        pairedTunes: {},
      };
    });

    // 2. Walk through historical gigs and setlists
    gigs.forEach((gig) => {
      const items = Array.isArray(gig.setlist) ? gig.setlist : [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || (!item.songId && !item.title)) continue;

        const key = item.songId || item.title.toLowerCase().trim();

        if (!statsMap[key]) {
          statsMap[key] = {
            songId: key,
            title: item.title || "Untitled",
            artist: "Unknown",
            genre: "General",
            playCount: 0,
            lastPerformedDate: null,
            daysSinceLastPlayed: null,
            pairedTunes: {},
          };
        }

        const stat = statsMap[key];
        stat.playCount += 1;

        if (gig.date) {
          if (!stat.lastPerformedDate || gig.date > stat.lastPerformedDate) {
            stat.lastPerformedDate = gig.date;
            const diffDays = Math.floor((now - new Date(gig.date).getTime()) / (1000 * 60 * 60 * 24));
            stat.daysSinceLastPlayed = diffDays >= 0 ? diffDays : 0;
          }
        }

        // Pair tracking (transition to next song in setlist)
        if (i < items.length - 1) {
          const nextItem = items[i + 1];
          const nextTitle = nextItem?.title || "Next Song";
          stat.pairedTunes[nextTitle] = (stat.pairedTunes[nextTitle] || 0) + 1;
        }
      }
    });

    return Object.values(statsMap).sort((a, b) => b.playCount - a.playCount);
  }, [songs, gigs]);

  // Compute setlist analytics
  const setlistStats = useMemo(() => {
    return buildSetlistUsageAnalytics(setlists, gigs);
  }, [setlists, gigs]);

  const totalSetlistDeployments = useMemo(() => {
    return setlistStats.reduce((sum, s) => sum + s.usageCount, 0);
  }, [setlistStats]);

  const topReusedSetlist = setlistStats[0] || null;

  const avgTunesPerSetlist = useMemo(() => {
    if (setlistStats.length === 0) return 0;
    const total = setlistStats.reduce((sum, s) => sum + s.tuneCount, 0);
    return Math.round(total / setlistStats.length);
  }, [setlistStats]);

  const filteredSetlistStats = useMemo(() => {
    return setlistStats.filter((sl) => {
      const matchesSearch =
        sl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sl.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        sl.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (setlistCategoryFilter !== "all" && sl.category !== setlistCategoryFilter) return false;
      return true;
    });
  }, [setlistStats, searchQuery, setlistCategoryFilter]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Crunching repertoire & setlist performance metrics...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  if (!userProfile || !canViewRepertoireAnalytics(userProfile)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Setlist Manager or Catalog Manager privileges required to view repertoire analytics.
      </div>
    );
  }

  const filteredStats = tuneStats.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === "hot") {
      return t.playCount >= 3;
    }
    if (filterMode === "dormant") {
      return t.playCount === 0 || (t.daysSinceLastPlayed !== null && t.daysSinceLastPlayed > 60);
    }
    return true;
  });

  const totalPlays = tuneStats.reduce((sum, s) => sum + s.playCount, 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/catalog"
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Return to Catalog"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Stage 36 Analytics
            </span>
            <span className="text-xs font-mono text-slate-400">
              {tuneStats.length} Charts • {setlists.length} Reusable Setlists
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Repertoire & Setlist Analytics</h1>
          <p className="text-xs text-slate-400">
            Track tune rotation frequency, setlist reuse across gigs, and transition pairings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/setlists"
            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm"
          >
            <ListMusic className="w-4 h-4" />
            <span>Setlist Studio</span>
          </Link>

          <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold">Tune Plays</div>
              <div className="text-xl font-black text-yellow-400">{totalPlays}</div>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold">Setlist Runs</div>
              <div className="text-xl font-black text-white">{totalSetlistDeployments}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab("repertoire")}
          className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === "repertoire"
              ? "border-yellow-400 text-yellow-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Repertoire Health & Rotation</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
            {tuneStats.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("setlists")}
          className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === "setlists"
              ? "border-yellow-400 text-yellow-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Setlist Circulation & Reuse</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-400 font-bold">
            {setlistStats.length}
          </span>
        </button>
      </div>

      {activeTab === "repertoire" ? (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search repertoire by song title or artist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setFilterMode("all")}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition border ${
                  filterMode === "all"
                    ? "bg-yellow-400 text-slate-950 border-yellow-400"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                All Charts
              </button>
              <button
                onClick={() => setFilterMode("hot")}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition border flex items-center gap-1 ${
                  filterMode === "hot"
                    ? "bg-amber-500 text-slate-950 border-amber-500"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Heavy Rotation</span>
              </button>
              <button
                onClick={() => setFilterMode("dormant")}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition border flex items-center gap-1 ${
                  filterMode === "dormant"
                    ? "bg-sky-500 text-slate-950 border-sky-500"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-sky-400"
                }`}
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span>Dormant / Shelved</span>
              </button>
            </div>
          </div>

          {/* Metrics Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-[10px] uppercase text-slate-400">
                    <th className="py-3 px-4">Tune Title & Artist</th>
                    <th className="py-3 px-3 text-center">Plays</th>
                    <th className="py-3 px-4">Last Performed</th>
                    <th className="py-3 px-4">Freshness / Velocity</th>
                    <th className="py-3 px-4">Top Next Tune Pairing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStats.map((stat, idx) => {
                    const topPairing = Object.entries(stat.pairedTunes).sort((a, b) => b[1] - a[1])[0];
                    const rowKey = `${stat.songId || stat.title || "chart"}_${idx}`;

                    return (
                      <tr key={rowKey} className="hover:bg-slate-850/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-xs">{stat.title}</div>
                          <div className="text-[11px] text-slate-400">{stat.artist}</div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-black text-yellow-400 text-sm bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                            {stat.playCount}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-300">
                          {stat.lastPerformedDate ? (
                            <span>{stat.lastPerformedDate}</span>
                          ) : (
                            <span className="text-slate-600">Never logged</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {stat.daysSinceLastPlayed === null ? (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              Unplayed
                            </span>
                          ) : stat.daysSinceLastPlayed <= 30 ? (
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 w-fit">
                              <Flame className="w-3 h-3 text-amber-400" /> {stat.daysSinceLastPlayed}d ago
                            </span>
                          ) : stat.daysSinceLastPlayed <= 90 ? (
                            <span className="text-[10px] font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {stat.daysSinceLastPlayed}d ago
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 flex items-center gap-1 w-fit">
                              <Snowflake className="w-3 h-3 text-sky-400" /> {stat.daysSinceLastPlayed}d ago
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-400">
                          {topPairing ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                              <GitCommit className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                              <span className="truncate max-w-[180px] font-medium">{topPairing[0]}</span>
                              <span className="text-[10px] font-mono text-slate-500">({topPairing[1]}x)</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStats.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        No repertoire analytics match your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Master Setlists
                </span>
                <Layers className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">{setlistStats.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Ready for gig assignment</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Total Reuses / Deployments
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2">{totalSetlistDeployments}</div>
              <div className="text-[11px] text-slate-500 mt-1">Assigned across historical & upcoming gigs</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Top Reused Setlist
                </span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-sm font-bold text-white mt-2 truncate">
                {topReusedSetlist ? topReusedSetlist.name : "None yet"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                {topReusedSetlist ? `${topReusedSetlist.usageCount} gig assignments` : "Create setlists to begin"}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Avg Charts / Setlist
                </span>
                <Music className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-sky-400 mt-2">{avgTunesPerSetlist}</div>
              <div className="text-[11px] text-slate-500 mt-1">Average tunes per sequence</div>
            </div>
          </div>

          {/* Setlist Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search setlists by name, tag, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["all", "parade", "festival", "stage", "party", "acoustic"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSetlistCategoryFilter(cat)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold uppercase font-mono tracking-wider transition border shrink-0 ${
                    setlistCategoryFilter === cat
                      ? "bg-yellow-400 text-slate-950 border-yellow-400"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Setlist Usage Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-[10px] uppercase text-slate-400">
                    <th className="py-3 px-4">Setlist Name & Category</th>
                    <th className="py-3 px-3 text-center">Charts</th>
                    <th className="py-3 px-3 text-center">Est. Time</th>
                    <th className="py-3 px-3 text-center">Times Reused</th>
                    <th className="py-3 px-4">Last Deployed</th>
                    <th className="py-3 px-4">Assigned Gigs</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSetlistStats.map((sl) => (
                    <tr key={sl.setlistId} className="hover:bg-slate-850/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs flex items-center gap-2">
                          <ListMusic className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          <span>{sl.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {sl.category}
                          </span>
                          {sl.tags.slice(0, 2).map((t, idx) => (
                            <span key={idx} className="text-[10px] font-mono text-slate-500">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-white text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {sl.tuneCount}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-mono text-slate-400 text-xs">
                          {sl.targetDurationMinutes}m
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg border ${
                          sl.usageCount >= 3
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : sl.usageCount >= 1
                            ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
                            : "bg-slate-950 text-slate-500 border-slate-800"
                        }`}>
                          {sl.usageCount}x
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {sl.lastUsedDate ? (
                          <div>
                            <div className="text-white text-xs">{sl.lastUsedDate}</div>
                            {sl.lastUsedGigTitle && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                {sl.lastUsedGigTitle}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">Not yet assigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {sl.assignedGigs.length > 0 ? (
                            sl.assignedGigs.slice(0, 3).map((g) => (
                              <span
                                key={g.id}
                                className="text-[10px] font-mono bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-[130px]"
                                title={`${g.title} (${g.date})`}
                              >
                                {g.title}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-600 font-mono">—</span>
                          )}
                          {sl.assignedGigs.length > 3 && (
                            <span className="text-[10px] font-mono text-slate-500">
                              +{sl.assignedGigs.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href="/admin/setlists"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-400 hover:text-yellow-300 bg-yellow-400/10 hover:bg-yellow-400/20 px-2.5 py-1 rounded-lg border border-yellow-400/20 transition"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filteredSetlistStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        No reusable setlists match the current search or filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}