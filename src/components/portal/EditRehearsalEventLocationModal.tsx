"use client";

import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  RehearsalSession,
  RehearsalSessionSchema,
  RehearsalLocation,
  RehearsalConfig,
} from "@/lib/schema/rehearsal";
import { formatFriendlyDate } from "@/lib/utils/dateTimeFormat";
import { toast } from "@/lib/context/ToastContext";
import {
  MapPin,
  X,
  Check,
  Building,
  RotateCcw,
  Loader2,
  Navigation,
  ExternalLink,
} from "lucide-react";

interface EditRehearsalEventLocationModalProps {
  session: RehearsalSession | null;
  onClose: () => void;
  locations: RehearsalLocation[];
  config: RehearsalConfig;
  onSaveSuccess?: () => void;
}

export default function EditRehearsalEventLocationModal({
  session,
  onClose,
  locations,
  config,
  onSaveSuccess,
}: EditRehearsalEventLocationModalProps) {
  if (!session) return null;
  return (
    <EditRehearsalEventLocationForm
      key={session.id}
      session={session}
      onClose={onClose}
      locations={locations}
      config={config}
      onSaveSuccess={onSaveSuccess}
    />
  );
}

function EditRehearsalEventLocationForm({
  session,
  onClose,
  locations,
  config,
  onSaveSuccess,
}: {
  session: RehearsalSession;
  onClose: () => void;
  locations: RehearsalLocation[];
  config: RehearsalConfig;
  onSaveSuccess?: () => void;
}) {
  const [mode, setMode] = useState<"saved" | "custom">(() => {
    // If current session matches a saved location, default to saved
    if (session.locationId && locations.some((l) => l.id === session.locationId)) {
      return "saved";
    }
    // If it matches default or matches any saved location name, default to saved
    if (locations.some((l) => l.name === session.locationName)) {
      return "saved";
    }
    return session.locationId ? "saved" : "custom";
  });

  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    const match = locations.find(
      (l) => l.id === session.locationId || l.name === session.locationName
    );
    return match?.id || locations[0]?.id || "";
  });

  // Custom location fields
  const [customName, setCustomName] = useState(() => session.locationName || "");
  const [customAddress, setCustomAddress] = useState(() => session.locationAddress || "");
  const [customLat, setCustomLat] = useState(() => String(session.lat || 40.4533));
  const [customLng, setCustomLng] = useState(() => String(session.lng || -80.0076));
  const [locationNotes, setLocationNotes] = useState(() => session.locationNotes || "");
  const [agendaNotes, setAgendaNotes] = useState(() => session.agenda || "");

  const [isSaving, setIsSaving] = useState(false);

  // Quick preset to default recurring location
  const handleRevertToDefault = () => {
    const defaultLoc =
      locations.find((l) => l.id === config.defaultLocationId || l.isDefault) || locations[0];

    if (defaultLoc) {
      setSelectedLocationId(defaultLoc.id);
      setCustomName(defaultLoc.name);
      setCustomAddress(defaultLoc.address);
      setCustomLat(String(defaultLoc.lat));
      setCustomLng(String(defaultLoc.lng));
      setLocationNotes(defaultLoc.parkingNotes || "");
      setMode("saved");
    } else {
      setCustomName(config.defaultLocationName);
      setCustomAddress(config.defaultLocationAddress);
      setCustomLat(String(config.defaultLat));
      setCustomLng(String(config.defaultLng));
      setLocationNotes("");
      setMode("custom");
    }
    toast.info(`Reset to default: ${config.defaultLocationName}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let finalLocationId = "";
      let finalLocationName = "";
      let finalLocationAddress = "";
      let finalLat = 40.4533;
      let finalLng = -80.0076;
      let finalNotes = locationNotes.trim();

      if (mode === "saved") {
        const selectedLoc = locations.find((l) => l.id === selectedLocationId);
        if (!selectedLoc) {
          toast.error("Please select a valid saved location.");
          setIsSaving(false);
          return;
        }
        finalLocationId = selectedLoc.id;
        finalLocationName = selectedLoc.name;
        finalLocationAddress = selectedLoc.address;
        finalLat = selectedLoc.lat;
        finalLng = selectedLoc.lng;
        // If user didn't write custom notes, use the saved location's parking notes
        if (!finalNotes && selectedLoc.parkingNotes) {
          finalNotes = selectedLoc.parkingNotes;
        }
      } else {
        if (!customName.trim()) {
          toast.error("Location name is required.");
          setIsSaving(false);
          return;
        }
        finalLocationId = "";
        finalLocationName = customName.trim();
        finalLocationAddress = customAddress.trim();
        const parsedLat = parseFloat(customLat);
        const parsedLng = parseFloat(customLng);
        finalLat = !isNaN(parsedLat) ? parsedLat : 40.4533;
        finalLng = !isNaN(parsedLng) ? parsedLng : -80.0076;
      }

      const updatedSessionData = {
        ...session,
        locationId: finalLocationId,
        locationName: finalLocationName,
        locationAddress: finalLocationAddress,
        lat: finalLat,
        lng: finalLng,
        locationNotes: finalNotes,
        agenda: agendaNotes.trim(),
        updatedAt: new Date().toISOString(),
      };

      const parsed = RehearsalSessionSchema.parse(updatedSessionData);

      await setDoc(doc(db, "rehearsals", session.id), parsed, { merge: true });

      toast.success(
        `Updated location for ${formatFriendlyDate(session.date)} to "${finalLocationName}".`
      );
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error(
        "Failed to update rehearsal location: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedSavedLoc = locations.find((l) => l.id === selectedLocationId);
  const isCurrentlyDefault =
    session.locationName === config.defaultLocationName ||
    (config.defaultLocationId && session.locationId === config.defaultLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Edit Rehearsal Location
                </h3>
                <span className="text-xs text-yellow-400 font-semibold font-mono">
                  {formatFriendlyDate(session.date, {
                    includeDayOfWeek: true,
                    includeYear: true,
                  })}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Location & Default indicator */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
              Current Event Location:
            </span>
            <span className="font-bold text-slate-200">
              {session.locationName || "Unassigned"}
            </span>
            {session.locationAddress && (
              <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                {session.locationAddress}
              </span>
            )}
          </div>
          {!isCurrentlyDefault && (
            <button
              type="button"
              onClick={handleRevertToDefault}
              className="text-[11px] font-bold text-slate-400 hover:text-yellow-400 flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 transition"
              title="Reset location to standard recurring default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Default</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Location Source
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setMode("saved")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  mode === "saved"
                    ? "bg-yellow-400 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Saved Band Location</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  mode === "custom"
                    ? "bg-yellow-400 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Custom / One-Off Location</span>
              </button>
            </div>
          </div>

          {/* Mode: Saved Locations Selector */}
          {mode === "saved" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Select Rehearsal Venue / Grounds
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 transition"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.isDefault ? "★ (Default)" : ""} {loc.address ? `— ${loc.address}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Location Details Preview */}
              {selectedSavedLoc && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                      <span>{selectedSavedLoc.name}</span>
                    </span>
                    {selectedSavedLoc.isDefault && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300">
                        Default
                      </span>
                    )}
                  </div>
                  {selectedSavedLoc.address && (
                    <p className="text-slate-400 text-[11px]">{selectedSavedLoc.address}</p>
                  )}
                  {selectedSavedLoc.parkingNotes && (
                    <p className="text-slate-400 text-[11px] italic pt-1 border-t border-slate-800/60">
                      <strong>Parking:</strong> {selectedSavedLoc.parkingNotes}
                    </p>
                  )}
                  {selectedSavedLoc.lat && selectedSavedLoc.lng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedSavedLoc.lat},${selectedSavedLoc.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-yellow-400 hover:underline flex items-center gap-1 pt-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Preview in Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mode: Custom / One-Off Location Fields */}
          {mode === "custom" && (
            <div className="space-y-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Location / Venue Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frick Park Hollow, West End Overlook"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Street Address / Cross Streets
                </label>
                <input
                  type="text"
                  placeholder="e.g. Beechwood Blvd & Forbes Ave"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Session Parking / Access Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Parking &amp; Arrival Notes (Specific to this rehearsal)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Free street parking after 6 PM, assemble near the pavillion arch..."
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400 leading-relaxed"
            />
          </div>

          {/* Session Agenda Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Rehearsal Agenda / Focus (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Bring repertoire binder, sound check for upcoming Bloomfield parade"
              value={agendaNotes}
              onChange={(e) => setAgendaNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-yellow-400/10"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Location</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
