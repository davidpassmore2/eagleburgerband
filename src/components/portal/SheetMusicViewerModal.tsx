"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  ExternalLink, 
  Music, 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  FileText, 
  Info,
  Clock,
  KeyRound,
  Compass
} from "lucide-react";
import type { UnifiedTune } from "@/app/(portal)/portal/library/page";

interface SheetMusicViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tune: UnifiedTune | null;
  userSectionId?: string | null;
}

export default function SheetMusicViewerModal({
  isOpen,
  onClose,
  tune,
  userSectionId,
}: SheetMusicViewerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pause audio on cleanup / unmount
  useEffect(() => {
    const audioEl = audioRef.current;
    return () => {
      if (audioEl) {
        audioEl.pause();
      }
    };
  }, []);

  if (!isOpen || !tune) return null;

  const audioSrc = tune.audioSampleUrl || tune.audioReferenceUrl || "";

  const togglePlay = () => {
    if (!audioRef.current || !audioSrc) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Convert Google Drive view URL to preview embed URL if possible
  const getEmbeddableDriveUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      // Check for /file/d/<id>/
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch && fileMatch[1]) {
        return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
      }
      // Check for id=<id> query param
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
      }
    } catch {
      return null;
    }
    return null;
  };

  const embedUrl = getEmbeddableDriveUrl(tune.driveLink);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      <div 
        className={`bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullScreen 
            ? "w-full h-full max-w-none rounded-none border-none" 
            : "w-full max-w-4xl max-h-[92vh]"
        }`}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 shrink-0">
                <Music className="w-4 h-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
                {tune.title}
              </h2>
            </div>
            <p className="text-xs text-slate-400 truncate">
              {tune.artist && <span>Original: {tune.artist}</span>}
              {tune.arranger && <span className="ml-2 pl-2 border-l border-slate-800">Arranged by {tune.arranger}</span>}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isFullScreen ? "Exit Fullscreen" : "Enter Stand Mode (Fullscreen)"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Metadata Badges Strip */}
          <div className="flex flex-wrap items-center gap-2">
            {tune.keySignature && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-yellow-400">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                Key: {tune.keySignature}
              </span>
            )}
            {tune.tempoBpm && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-emerald-400">
                <Compass className="w-3.5 h-3.5 text-slate-500" />
                Tempo: {tune.tempoBpm} BPM
              </span>
            )}
            {tune.meter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-sky-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Meter: {tune.meter}
              </span>
            )}
            {tune.status && (
              <span className="px-2.5 py-1 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-[11px] font-mono font-bold text-yellow-300 uppercase">
                {tune.status}
              </span>
            )}
            {userSectionId && (
              <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-[11px] font-mono text-slate-300">
                Your Section: {userSectionId.toUpperCase()}
              </span>
            )}
          </div>

          {/* Performance Notes Card */}
          {tune.notes && (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300">
              <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">Performance & Rehearsal Notes:</strong>
                <span>{tune.notes}</span>
              </div>
            </div>
          )}

          {/* Audio Reference Player */}
          {audioSrc && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Volume2 className="w-4 h-4 text-yellow-400" />
                  <span>Audio Reference Track</span>
                </div>
                <span className="font-mono text-slate-400">
                  {formatSeconds(currentTime)} / {formatSeconds(duration)}
                </span>
              </div>

              <audio
                ref={audioRef}
                src={audioSrc}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 transition font-bold cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                      setCurrentTime(0);
                    }
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Restart Audio"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 accent-yellow-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Sheet Music Charts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-yellow-400" />
                <span>Sheet Music & Repertoire Charts</span>
              </h3>

              {tune.driveLink && (
                <a
                  href={tune.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/20 text-xs font-bold transition"
                >
                  <span>Open Folder in Google Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Embedded Drive Preview if supported, otherwise Action Card */}
            {embedUrl ? (
              <div className="w-full aspect-[4/3] max-h-[60vh] rounded-2xl border border-slate-800 overflow-hidden bg-slate-950">
                <iframe
                  src={embedUrl}
                  title={`${tune.title} Chart Preview`}
                  className="w-full h-full border-none"
                  allow="autoplay"
                />
              </div>
            ) : tune.driveLink ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-white font-bold text-sm">Full Band Chart Folder Available</h4>
                  <p className="text-xs text-slate-400">
                    Individual instrument parts (Trumpets, Trombones, Sousaphones, Drumline battery, and Woodwinds) are organized in the band&apos;s cloud chart folder.
                  </p>
                </div>
                <div>
                  <a
                    href={tune.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs transition shadow-lg shadow-yellow-400/10"
                  >
                    <span>Launch Google Drive Music Charts</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
                No external chart link has been attached to this chart yet. Contact your Catalog Manager or Section Leader.
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Eagleburger Band Musician Repertoire &copy; 2026</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

