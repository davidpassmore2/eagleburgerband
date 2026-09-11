"use client";

import React from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { Role } from "@/lib/auth/permissions";
import { 
  ShieldAlert, 
  X, 
  SlidersHorizontal, 
  UserCheck,
  Calendar,
  Music,
  Users,
  DollarSign,
  Globe,
  UserPlus,
  Package,
  Megaphone,
  User as UserIcon
} from "lucide-react";

interface RoleEmulationBannerProps {
  onOpenCustomModal?: () => void;
}

const PRESET_ROLES: { role: Role; label: string; icon: React.ReactNode }[] = [
  { role: "member", label: "Active Member", icon: <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> },
  { role: "section_leader", label: "Section Leader", icon: <Users className="w-3.5 h-3.5 text-indigo-400" /> },
  { role: "gig_manager", label: "Gig Operations", icon: <Calendar className="w-3.5 h-3.5 text-sky-400" /> },
  { role: "catalog_manager", label: "Music Librarian", icon: <Music className="w-3.5 h-3.5 text-emerald-400" /> },
  { role: "treasurer", label: "Treasurer", icon: <DollarSign className="w-3.5 h-3.5 text-emerald-300" /> },
  { role: "web_manager", label: "Web Manager", icon: <Globe className="w-3.5 h-3.5 text-cyan-400" /> },
  { role: "membership_manager", label: "Membership", icon: <UserPlus className="w-3.5 h-3.5 text-pink-400" /> },
  { role: "asset_manager", label: "Quartermaster", icon: <Package className="w-3.5 h-3.5 text-orange-400" /> },
  { role: "community_manager", label: "Community PR", icon: <Megaphone className="w-3.5 h-3.5 text-yellow-400" /> },
  { role: "guest", label: "Guest / Sub", icon: <UserIcon className="w-3.5 h-3.5 text-slate-400" /> },
  { role: "admin", label: "Full Administrator", icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> },
];

export function RoleEmulationBanner({ onOpenCustomModal }: RoleEmulationBannerProps) {
  const { isEmulating, isRealAdmin, emulatedRoles, setEmulatedRoles, clearEmulation } = useAuth();

  if (!isEmulating || !isRealAdmin || !emulatedRoles || emulatedRoles.length === 0) {
    return null;
  }

  const handleSelectRole = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      onOpenCustomModal?.();
    } else if (val) {
      setEmulatedRoles([val as Role]);
    }
  };

  return (
    <div 
      suppressHydrationWarning
      className="sticky top-0 z-50 border-b shadow-lg transition-all"
      style={{
        backgroundColor: "#1c1404",
        borderColor: "#b45309",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        {/* Left: Emulation Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[11px] font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>ROLE EMULATION ACTIVE</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-200">
            <span className="text-slate-400">Viewing as:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {emulatedRoles.map((r) => (
                <span 
                  key={r}
                  className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] border"
                  style={{
                    backgroundColor: "rgba(250, 204, 21, 0.15)",
                    borderColor: "rgba(250, 204, 21, 0.35)",
                    color: "#fde047",
                  }}
                >
                  @{r}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions & Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {/* Quick Preset Dropdown */}
          <div className="flex items-center gap-1">
            <label htmlFor="quick-role-select" className="text-[11px] text-slate-400 hidden md:inline">
              Switch:
            </label>
            <select
              id="quick-role-select"
              suppressHydrationWarning
              value={emulatedRoles.length === 1 ? emulatedRoles[0] : "custom"}
              onChange={handleSelectRole}
              style={{
                backgroundColor: "#2a1c04",
                borderColor: "#b45309",
                color: "#fef08a",
              }}
              className="border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
            >
              {emulatedRoles.length > 1 && (
                <option value="custom">Multiple Roles ({emulatedRoles.length})</option>
              )}
              {PRESET_ROLES.map((p) => (
                <option key={p.role} value={p.role}>
                  {p.label} (@{p.role})
                </option>
              ))}
            </select>
          </div>

          {onOpenCustomModal && (
            <button
              type="button"
              suppressHydrationWarning
              onClick={onOpenCustomModal}
              title="Select multiple roles or customize permissions"
              style={{
                backgroundColor: "#2a1c04",
                borderColor: "#b45309",
                color: "#fef08a",
              }}
              className="px-2.5 py-1 rounded-lg border text-xs font-semibold transition hover:brightness-125 flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden sm:inline">Customize</span>
            </button>
          )}

          {/* Exit Emulation Button */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={clearEmulation}
            style={{
              backgroundColor: "#f59e0b",
              color: "#0f0b01",
            }}
            className="px-3 py-1 rounded-lg font-bold text-xs transition hover:bg-amber-400 flex items-center gap-1 shadow"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Emulation</span>
          </button>
        </div>
      </div>
    </div>
  );
}

