"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageCatalog } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Music, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  Search, 
  ShieldAlert 
} from "lucide-react";

interface SongChart {
  id: string;
  title: string;
  artist?: string;
  arranger?: string;
  keySignature?: string;
  tempoBpm?: number;
  driveLink?: string;
  tags?: string[];
  notes?: string;
}

export default function CatalogAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [songs, setSongs] = useState<SongChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    arranger: "Eagleburger",
    keySignature: "Bb Major",
    tempoBpm: 120,
    driveLink: "",
    tags: "Street Beat, Parade",
  });

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(collection(db, "songs"), (snap) => {
      const list: SongChart[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SongChart));
      list.sort((a, b) => a.title.localeCompare(b.title));
      setSongs(list);
      setLoading(false);
    });

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading repertoire charts...
      </div>
    );
  }

  if (!canManageCatalog(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Catalog Manager privileges required to modify sheet music charts.
      </div>
    );
  }

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsCreating(true);
    try {
      const songId = `song_${formData.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const payload = {
        id: songId,
        title: formData.title.trim(),
        artist: formData.artist.trim(),
        arranger: formData.arranger.trim(),
        keySignature: formData.keySignature.trim(),
        tempoBpm: Number(formData.tempoBpm) || 120,
        driveLink: formData.driveLink.trim(),
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "songs", songId), payload, { merge: true });
      await setDoc(doc(db, "tunes", songId), payload, { merge: true });

      setFormData({
        title: "",
        artist: "",
        arranger: "Eagleburger",
        keySignature: "Bb Major",
        tempoBpm: 120,
        driveLink: "",
        tags: "Street Beat, Parade",
      });
    } catch (err) {
      alert("Failed to add chart: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete chart "${title}" from the catalog?`)) return;
    try {
      await deleteDoc(doc(db, "songs", id));
      await deleteDoc(doc(db, "tunes", id));
    } catch (err) {
      alert("Failed to delete chart: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const filtered = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Admin Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {songs.length} Repertoire Chart(s)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Repertoire Catalog</h1>
          <p className="text-xs text-slate-400">
            Maintain sheet music links, musical keys, arrangements, and set tags.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleAddSong}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-yellow-400" /> Add New Sheet Music Chart
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Iron City Funk"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Original Artist</label>
            <input
              type="text"
              placeholder="e.g. Traditional"
              value={formData.artist}
              onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Key</label>
              <input
                type="text"
                placeholder="Bb Major"
                value={formData.keySignature}
                onChange={(e) => setFormData({ ...formData, keySignature: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">BPM</label>
              <input
                type="number"
                placeholder="120"
                value={formData.tempoBpm}
                onChange={(e) => setFormData({ ...formData, tempoBpm: parseInt(e.target.value, 10) || 120 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Google Drive Folder / Chart Link</label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={formData.driveLink}
              onChange={(e) => setFormData({ ...formData, driveLink: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="Funk, Opener, Crowd Favorite"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isCreating}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {isCreating ? "Adding Chart..." : "Save to Catalog"}
          </button>
        </div>
      </form>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Filter repertoire by title, artist, or tags (e.g. 'Styx', 'Funk')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((song) => (
          <div
            key={song.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 shadow hover:border-slate-700 transition"
          >
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="w-4 h-4 text-yellow-400 shrink-0" />
                  <h3 className="font-bold text-white text-sm truncate">{song.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(song.id, song.title)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition rounded"
                  title="Delete chart"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {song.artist && (
                <div className="text-xs text-slate-400 truncate">{song.artist}</div>
              )}

              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 pt-1">
                {song.keySignature && (
                  <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {song.keySignature}
                  </span>
                )}
                {song.tempoBpm && (
                  <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {song.tempoBpm} BPM
                  </span>
                )}
              </div>

              {song.tags && song.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {song.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-400 border border-slate-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {song.driveLink && (
              <a
                href={song.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 pt-2 border-t border-slate-800"
              >
                <span>View Sheet Music</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}