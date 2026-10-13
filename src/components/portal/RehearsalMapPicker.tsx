"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Plus,
  Save,
  MessageSquare,
  Navigation,
  Check,
  Star,
  ExternalLink,
  Trash2,
  Send,
  Loader2,
  Compass,
  Building,
  Sparkles,
} from "lucide-react";
import { RehearsalLocation, RehearsalComment } from "@/lib/schema/rehearsal";
import { useAuth } from "@/lib/context/AuthContext";
import { toast } from "@/lib/context/ToastContext";
import { reverseGeocodeCoordinates } from "@/lib/geo/reverseGeocode";
import { formatEasternTimestamp } from "@/lib/utils/dateTimeFormat";

interface RehearsalMapPickerProps {
  locations: RehearsalLocation[];
  selectedLocationId?: string;
  onSelectLocation?: (location: RehearsalLocation) => void;
  onSaveLocation: (locationData: Partial<RehearsalLocation>) => Promise<void>;
  onAddLocationComment?: (locationId: string, comment: string) => Promise<void>;
  onDeleteLocation?: (locationId: string) => Promise<void>;
  readOnly?: boolean;
}

const PITTSBURGH_PRESETS = [
  {
    name: "Allegheny Commons East Park",
    address: "Arch St & W Ohio St",
    lat: 40.4533,
    lng: -80.0076,
    parkingNotes: "Free street parking along Arch St & East Commons.",
  },
  {
    name: "Mattress Factory Garden",
    address: "500 Sampsonia Way",
    lat: 40.4572,
    lng: -80.0125,
    parkingNotes: "Museum lot across Jacksonia St.",
  },
  {
    name: "Millvale Riverfront Pavilion",
    address: "River Front Dr, Millvale",
    lat: 40.4812,
    lng: -79.9751,
    parkingNotes: "Ample paved lot adjacent to bike trail & pavilion.",
  },
  {
    name: "Highland Park Reservoir Entry",
    address: "Reservoir Dr & N Highland Ave",
    lat: 40.4735,
    lng: -79.914,
    parkingNotes: "Free public lot next to fountain.",
  },
  {
    name: "Lawrenceville 43rd St Bandshell",
    address: "43rd St & Butler St",
    lat: 40.4705,
    lng: -79.9602,
    parkingNotes: "Metred city parking or loading dock access.",
  },
];

export default function RehearsalMapPicker({
  locations,
  selectedLocationId,
  onSelectLocation,
  onSaveLocation,
  onAddLocationComment,
  onDeleteLocation,
  readOnly = false,
}: RehearsalMapPickerProps) {
  const { profile } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Active coordinates
  const activeLocation = locations.find((l) => l.id === selectedLocationId) || locations[0];
  const [currentLat, setCurrentLat] = useState<number>(activeLocation?.lat || 40.4533);
  const [currentLng, setCurrentLng] = useState<number>(activeLocation?.lng || -80.0076);

  // Form mode
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [lastResolvedAddress, setLastResolvedAddress] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "Pittsburgh, PA",
    parkingNotes: "",
    accessNotes: "",
    isDefault: false,
  });

  const autoNormalizeAddress = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const result = await reverseGeocodeCoordinates(lat, lng);
      if (result) {
        setLastResolvedAddress(result.streetAddress || result.fullAddress);
        setFormData((prev) => ({
          ...prev,
          name: prev.name.trim() ? prev.name : result.name || prev.name,
          address: result.streetAddress || prev.address,
          city: result.city || prev.city,
        }));
      }
    } catch (err) {
      console.warn("Reverse geocode error:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Sync state if selected location changes
  useEffect(() => {
    if (activeLocation && !isAddingNew) {
      setCurrentLat(activeLocation.lat);
      setCurrentLng(activeLocation.lng);
      if (markerRef.current && mapInstanceRef.current) {
        markerRef.current.setLatLng([activeLocation.lat, activeLocation.lng]);
        mapInstanceRef.current.setView([activeLocation.lat, activeLocation.lng], 15);
      }
    }
  }, [activeLocation, isAddingNew]);

  // Leaflet map setup
  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;

    let isCancelled = false;

    import("leaflet").then((L) => {
      if (isCancelled || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 15,
        scrollWheelZoom: false,
      });

      mapInstanceRef.current = map;

      // OpenStreetMap standard tile layer (free, no API key required)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Yellow Pin Marker
      const createPinIcon = (label?: string) =>
        L.divIcon({
          className: "rehearsal-custom-pin",
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 38px;
              height: 38px;
              background: #facc15;
              border: 3px solid #0f172a;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
              cursor: pointer;
            ">
              <div style="
                width: 14px;
                height: 14px;
                background: #0f172a;
                border-radius: 50%;
                transform: rotate(45deg);
              "></div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -38],
        });

      const marker = L.marker([currentLat, currentLng], {
        icon: createPinIcon(),
        draggable: !readOnly,
      }).addTo(map);

      markerRef.current = marker;

      // Handle dragend to update coordinates & auto-normalize address
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        const lat = Number(position.lat.toFixed(6));
        const lng = Number(position.lng.toFixed(6));
        setCurrentLat(lat);
        setCurrentLng(lng);
        autoNormalizeAddress(lat, lng);
      });

      // Handle map click to reposition pin & auto-normalize address
      if (!readOnly) {
        map.on("click", (e: any) => {
          const lat = Number(e.latlng.lat.toFixed(6));
          const lng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([lat, lng]);
          setCurrentLat(lat);
          setCurrentLng(lng);
          autoNormalizeAddress(lat, lng);
        });
      }

      // Invalidate size in stages
      setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mounted, readOnly]);

  const handleApplyPreset = (preset: (typeof PITTSBURGH_PRESETS)[0]) => {
    setCurrentLat(preset.lat);
    setCurrentLng(preset.lng);
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      address: preset.address,
      parkingNotes: preset.parkingNotes,
    }));

    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([preset.lat, preset.lng]);
      mapInstanceRef.current.setView([preset.lat, preset.lng], 16);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a location name.");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveLocation({
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        lat: currentLat,
        lng: currentLng,
        parkingNotes: formData.parkingNotes.trim(),
        accessNotes: formData.accessNotes.trim(),
        isDefault: formData.isDefault,
      });

      setIsAddingNew(false);
      setFormData({
        name: "",
        address: "",
        city: "Pittsburgh, PA",
        parkingNotes: "",
        accessNotes: "",
        isDefault: false,
      });
      toast.success("Rehearsal location saved successfully.");
    } catch (err) {
      toast.error("Failed to save location: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostComment = async () => {
    if (!activeLocation || !newCommentText.trim() || !onAddLocationComment) return;
    setIsSubmittingComment(true);
    try {
      await onAddLocationComment(activeLocation.id, newCommentText.trim());
      setNewCommentText("");
      toast.success("Location tip / comment added.");
    } catch (err) {
      toast.error("Failed to add comment: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Location Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              Interactive Leaflet Pin
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {locations.length} Saved Location{locations.length === 1 ? "" : "s"}
            </span>
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-yellow-400" />
            {isAddingNew
              ? "Drop Pin & Save New Rehearsal Ground"
              : activeLocation?.name || "Rehearsal Locations"}
          </h3>
          {activeLocation && !isAddingNew && (
            <p className="text-xs text-slate-400">
              {activeLocation.address ? `${activeLocation.address}, ` : ""}
              {activeLocation.city}
            </p>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {isAddingNew ? (
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(true);
                  setFormData({
                    name: "",
                    address: "",
                    city: "Pittsburgh, PA",
                    parkingNotes: "",
                    accessNotes: "",
                    isDefault: locations.length === 0,
                  });
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Location</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Location Selector Tabs if multiple saved */}
      {!isAddingNew && locations.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {locations.map((loc) => {
            const isSelected = (activeLocation?.id || "") === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => onSelectLocation?.(loc)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition border flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold shadow-md"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>{loc.name}</span>
                {loc.isDefault && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      isSelected ? "bg-black/20 text-slate-950" : "bg-yellow-400/20 text-yellow-300"
                    }`}
                  >
                    Default
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Grid: Map on Left, Details/Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Map Container */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative min-h-[380px] shadow-lg flex flex-col">
          <div ref={mapContainerRef} className="w-full flex-1 min-h-[340px] z-0" />

          {/* Coordinates Bar */}
          <div className="bg-slate-950/90 border-t border-slate-800 px-3 py-2 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-yellow-400" />
              <span>
                Lat: <strong className="text-white">{currentLat}</strong>, Lng:{" "}
                <strong className="text-white">{currentLng}</strong>
              </span>
            </div>
            {!readOnly && (
              <span className="text-[10px] text-amber-400/90">
                Tip: Drag the pin or click the map to reposition
              </span>
            )}
          </div>
        </div>

        {/* Right Panel: Form (if adding) or Location Info & Comments */}
        <div className="lg:col-span-5 space-y-4">
          {isAddingNew ? (
            /* Add Location Form with Presets */
            <form
              onSubmit={handleSave}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Save New Rehearsal Ground
                </span>
                <span className="text-[10px] text-yellow-400 font-mono">Pin Position Active</span>
              </div>

              {/* Quick Presets Dropdown/Buttons */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Quick Pittsburgh Preset:
                </label>
                <div className="flex flex-wrap gap-1">
                  {PITTSBURGH_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-950 text-slate-300 border border-slate-800 hover:border-yellow-400/50 hover:text-white transition"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Allegheny Commons East Park"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300 block">Street Address</label>
                    <button
                      type="button"
                      disabled={isGeocoding}
                      onClick={() => autoNormalizeAddress(currentLat, currentLng)}
                      className="text-[10px] text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-semibold transition"
                      title="Auto-fill address via OpenStreetMap"
                    >
                      {isGeocoding ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Resolving...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>From Pin</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Arch St & W Ohio St"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">City / Area</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              {lastResolvedAddress && (
                <div className="text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">OSM Normalized: {lastResolvedAddress}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Parking & Unloading Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Where can musicians unload tuba, drums, stands? Street vs lot..."
                  value={formData.parkingNotes}
                  onChange={(e) => setFormData({ ...formData, parkingNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Access & Venue Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Gate code, door buzzers, rain shelter options..."
                  value={formData.accessNotes}
                  onChange={(e) => setFormData({ ...formData, accessNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-950"
                />
                <span className="text-xs text-slate-300">
                  Set as default weekly rehearsal location
                </span>
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Location & Pin</span>
              </button>
            </form>
          ) : activeLocation ? (
            /* Selected Location Details & Comments */
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{activeLocation.name}</h4>
                    <p className="text-xs text-slate-400">
                      {activeLocation.address ? `${activeLocation.address}, ` : ""}
                      {activeLocation.city}
                    </p>
                  </div>
                  {activeLocation.isDefault && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400" /> Default Ground
                    </span>
                  )}
                </div>

                {activeLocation.parkingNotes && (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      🚗 Parking & Unloading:
                    </span>
                    <p className="text-xs text-slate-300">{activeLocation.parkingNotes}</p>
                  </div>
                )}

                {activeLocation.accessNotes && (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                      🔑 Shelter & Access Notes:
                    </span>
                    <p className="text-xs text-slate-300">{activeLocation.accessNotes}</p>
                  </div>
                )}

                {/* External Maps Directions Link */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeLocation.lat},${activeLocation.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions in Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {!readOnly && onDeleteLocation && (
                    <button
                      type="button"
                      onClick={() => onDeleteLocation(activeLocation.id)}
                      className="text-xs text-slate-500 hover:text-red-400 transition p-1"
                      title="Delete location"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Location Comments / Tips */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Location Tips & Comments ({(activeLocation.comments || []).length})
                  </span>
                </div>

                {/* Comment list */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(activeLocation.comments || []).length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      No comments on this location yet. Share tips on acoustics, shade, or parking!
                    </div>
                  ) : (
                    activeLocation.comments.map((comm) => (
                      <div
                        key={comm.id}
                        className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-white">{comm.authorName}</span>
                          <span>{formatEasternTimestamp(comm.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-300">{comm.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input */}
                {onAddLocationComment && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <input
                      type="text"
                      placeholder="Add a tip about this location..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                    />
                    <button
                      type="button"
                      disabled={isSubmittingComment || !newCommentText.trim()}
                      onClick={handlePostComment}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-yellow-400 text-slate-950 hover:bg-yellow-300 disabled:opacity-40 transition flex items-center gap-1 shrink-0"
                    >
                      {isSubmittingComment ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      <span>Post</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
              No rehearsal locations saved yet. Click &quot;Add Location&quot; to set a map pin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

