"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { Role } from "@/lib/auth/permissions";
import {
  ShieldAlert,
  X,
  Check,
  CheckCircle2,
  Sparkles,
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
  User as UserIcon,
  RotateCcw,
} from "lucide-react";

interface RoleEmulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoleOption {
  role: Role;
  title: string;
  badge: string;
  target: string;
  description: string;
  icon: React.ReactNode;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "member",
    title: "Active Musician",
    badge: "Core Member",
    target: "Performing Band Members",
    description: "Standard musician clearance. Accesses Home Base, Gig Central, Music Vault, and Musician Directory.",
    icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
  },
  {
    role: "section_leader",
    title: "Section Leader",
    badge: "Section Lead",
    target: "Instrument Voicing Principals",
    description: "Manages section attendance, part balance, and executes Downbeat Check-In roll calls on gig day.",
    icon: <Users className="w-4 h-4 text-indigo-400" />,
  },
  {
    role: "gig_manager",
    title: "Gig Operations Manager",
    badge: "Performance Ops",
    target: "Gig Coordinators & Event Leads",
    description: "Schedules gigs, edits staging logistics, issues Call Sheet Dispatches, and triages inbound gig inquiries.",
    icon: <Calendar className="w-4 h-4 text-sky-400" />,
  },
  {
    role: "catalog_manager",
    title: "Music Librarian",
    badge: "Music Catalog",
    target: "Librarians & Arrangers",
    description: "Manages repertoire charts, uploads sheet music PDFs, organizes setlists, and reviews song suggestions.",
    icon: <Music className="w-4 h-4 text-emerald-400" />,
  },
  {
    role: "treasurer",
    title: "Band Treasurer",
    badge: "Finance Officer",
    target: "Treasurer & Bookkeepers",
    description: "Accesses the Financial Ledger, reconciles gig payouts, and manages the Charitable Giving system.",
    icon: <DollarSign className="w-4 h-4 text-emerald-300" />,
  },
  {
    role: "web_manager",
    title: "Web & Content Manager",
    badge: "Public Brand",
    target: "Webmasters & Marketers",
    description: "Authors CMS pages in the Headless Studio, customizes theme palettes, and configures SEO share cards.",
    icon: <Globe className="w-4 h-4 text-cyan-400" />,
  },
  {
    role: "membership_manager",
    title: "Membership Coordinator",
    badge: "Personnel",
    target: "Recruitment Leads & Secretary",
    description: "Generates onboarding invitations, edits member profiles, and manages section assignments.",
    icon: <UserPlus className="w-4 h-4 text-pink-400" />,
  },
  {
    role: "asset_manager",
    title: "Equipment Quartermaster",
    badge: "Gear Custody",
    target: "Quartermasters & Drum Techs",
    description: "Tracks marching drums, harnesses, sousaphone stands, banners, and gear maintenance checkout logs.",
    icon: <Package className="w-4 h-4 text-orange-400" />,
  },
  {
    role: "community_manager",
    title: "Community & PR Manager",
    badge: "Community PR",
    target: "PR Leads & Event Liaisons",
    description: "Triages client booking inquiries, oversees charitable beneficiaries, and moderates fan comments.",
    icon: <Megaphone className="w-4 h-4 text-yellow-400" />,
  },
  {
    role: "guest",
    title: "Guest Musician / Sub",
    badge: "Substitute",
    target: "Temporary Performers",
    description: "Limited read-only access restricted to specific assigned gig call sheets and practice sheet music parts.",
    icon: <UserIcon className="w-4 h-4 text-slate-400" />,
  },
  {
    role: "admin",
    title: "Full Administrator",
    badge: "Executive",
    target: "Band Directors & Tech Leads",
    description: "Full, unrestricted access across all 23 workspaces, user role controls, and security administration.",
    icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
  },
];

export function RoleEmulationModal({ isOpen, onClose }: RoleEmulationModalProps) {
  const { isEmulating, isRealAdmin, emulatedRoles, setEmulatedRoles, clearEmulation } = useAuth();
  const [customRoles, setCustomRoles] = useState<Role[] | null>(null);
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  if (!isOpen || !isRealAdmin) return null;

  const effectiveSelectedRoles = customRoles ?? (emulatedRoles && emulatedRoles.length > 0 ? emulatedRoles : ["member"]);

  const handleApplySingleRole = (role: Role) => {
    setEmulatedRoles([role]);
    setCustomRoles(null);
    onClose();
  };

  const toggleCustomRole = (role: Role) => {
    const current = effectiveSelectedRoles;
    if (current.includes(role)) {
      // Prevent deselecting all roles
      if (current.length === 1) return;
      setCustomRoles(current.filter((r) => r !== role));
    } else {
      setCustomRoles([...current, role]);
    }
  };

  const handleApplyCustomRoles = () => {
    if (effectiveSelectedRoles.length > 0) {
      setEmulatedRoles(effectiveSelectedRoles);
      setCustomRoles(null);
      onClose();
    }
  };

  const handleClearEmulation = () => {
    clearEmulation();
    setCustomRoles(null);
    onClose();
  };

  const handleClose = () => {
    setCustomRoles(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        suppressHydrationWarning
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden my-8 transition-colors flex flex-col"
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
      >
        {/* Header */}
        <div 
          className="p-5 sm:p-6 border-b flex items-start justify-between gap-4 shrink-0"
          style={{ borderColor: "var(--ebb-border)" }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div 
                className="p-2 rounded-xl border flex items-center justify-center"
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "var(--ebb-border)",
                  color: "var(--ebb-primary)",
                }}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                  Role Emulation Sandbox
                </h3>
                <p className="text-xs text-slate-400">
                  Test portal interfaces, route guardrails, and sidebar navigation as any band role.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emulation Mode Explainer Banner */}
        <div 
          className="px-5 py-3 border-b text-xs flex items-center justify-between gap-3 shrink-0"
          style={{
            backgroundColor: isEmulating ? "rgba(245, 158, 11, 0.1)" : "var(--ebb-surface-muted)",
            borderColor: "var(--ebb-border)",
          }}
        >
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isEmulating ? (
                <>
                  Active emulation: <strong className="text-amber-300">{emulatedRoles?.map((r) => `@${r}`).join(", ")}</strong>. (Your database records remain intact).
                </>
              ) : (
                <>Currently viewing as <strong>Full Administrator</strong>. Select a role below to begin testing.</>
              )}
            </span>
          </div>

          {isEmulating && (
            <button
              type="button"
              onClick={handleClearEmulation}
              className="font-bold text-[11px] px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 transition flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Admin</span>
            </button>
          )}
        </div>

        {/* Tabs Switcher */}
        <div 
          className="p-4 border-b flex items-center gap-2 shrink-0 text-xs"
          style={{ borderColor: "var(--ebb-border)" }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            style={
              activeTab === "presets"
                ? {
                    backgroundColor: "var(--ebb-primary)",
                    color: "#020617",
                  }
                : {
                    backgroundColor: "var(--ebb-surface-muted)",
                    color: "#94a3b8",
                    borderColor: "var(--ebb-border)",
                  }
            }
            className="px-3.5 py-1.5 rounded-xl font-bold transition border"
          >
            1-Click Role Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            style={
              activeTab === "custom"
                ? {
                    backgroundColor: "var(--ebb-primary)",
                    color: "#020617",
                  }
                : {
                    backgroundColor: "var(--ebb-surface-muted)",
                    color: "#94a3b8",
                    borderColor: "var(--ebb-border)",
                  }
            }
            className="px-3.5 py-1.5 rounded-xl font-bold transition border"
          >
            Multi-Role Combination Sandbox
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[50vh] space-y-4 [scrollbar-width:thin]">
          {activeTab === "presets" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((opt) => {
                const isActive = isEmulating && emulatedRoles?.length === 1 && emulatedRoles[0] === opt.role;

                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => handleApplySingleRole(opt.role)}
                    className="p-3.5 rounded-2xl border text-left flex items-start gap-3 transition hover:brightness-110 shadow-sm relative group"
                    style={{
                      backgroundColor: isActive ? "rgba(250, 204, 21, 0.1)" : "var(--ebb-surface-muted)",
                      borderColor: isActive ? "var(--ebb-primary)" : "var(--ebb-border)",
                    }}
                  >
                    <div 
                      className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: "var(--ebb-surface)",
                        borderColor: "var(--ebb-border)",
                      }}
                    >
                      {opt.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-white">
                          {opt.title}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border text-slate-400">
                          @{opt.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>

                    {isActive && (
                      <span className="shrink-0 text-amber-400 font-bold text-xs flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Select one or more roles to test how permissions cascade for members holding multiple assignments (e.g. Section Leader + Community Manager):
              </p>

              <div className="space-y-2">
                {ROLE_OPTIONS.map((opt) => {
                  const isChecked = effectiveSelectedRoles.includes(opt.role);

                  return (
                    <div
                      key={opt.role}
                      onClick={() => toggleCustomRole(opt.role)}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition hover:brightness-110 select-none"
                      style={{
                        backgroundColor: isChecked ? "rgba(250, 204, 21, 0.1)" : "var(--ebb-surface-muted)",
                        borderColor: isChecked ? "var(--ebb-primary)" : "var(--ebb-border)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-5 h-5 rounded-md border flex items-center justify-center text-slate-950 transition ${
                            isChecked ? "bg-amber-400 border-amber-400 font-bold" : "border-slate-600 bg-slate-800"
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{opt.title}</span>
                            <span className="font-mono text-[10px] text-slate-400">@{opt.role}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">{opt.target}</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-slate-400">
                        {opt.icon}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0"
          style={{ borderColor: "var(--ebb-border)" }}
        >
          <div className="text-[11px] text-slate-400">
            {isEmulating ? (
              <span>Currently in testing mode. You can exit anytime.</span>
            ) : (
              <span>Normal admin credentials active.</span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isEmulating && (
              <button
                type="button"
                onClick={handleClearEmulation}
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "var(--ebb-border)",
                }}
                className="px-3 py-2 rounded-xl text-xs text-slate-300 font-bold border hover:text-white transition"
              >
                Exit Emulation
              </button>
            )}

            {activeTab === "custom" && (
              <button
                type="button"
                onClick={handleApplyCustomRoles}
                style={{
                  backgroundColor: "var(--ebb-primary)",
                  color: "#020617",
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold transition shadow hover:brightness-110"
              >
                Apply Emulated Roles ({effectiveSelectedRoles.length})
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
