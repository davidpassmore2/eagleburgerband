"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  DonationCategory,
  DonationCategoryEnum,
  PublicBeneficiary,
  PublicBeneficiarySchema,
} from "@/lib/schema/donation";
import {
  HeartHandshake,
  Heart,
  ExternalLink,
  Sparkles,
  Search,
  ArrowRight,
  Loader2,
  Building,
  Music2,
  Users,
  ShieldCheck,
} from "lucide-react";

const CATEGORY_LABELS: Record<DonationCategory, { label: string; color: string }> = {
  arts_music: { label: "Arts & Music Access", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  community_aid: { label: "Community Aid", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  youth_education: { label: "Youth & Education", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  hunger_relief: { label: "Hunger Relief", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  environment: { label: "Parks & Environment", color: "bg-teal-500/10 text-teal-400 border-teal-500/30" },
  other: { label: "General Cause", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
};

// Fallback initial causes in case database is loading
const FALLBACK_BENEFICIARIES: PublicBeneficiary[] = [
  {
    id: "init_pgh_food_bank",
    organizationName: "Greater Pittsburgh Community Food Bank",
    causeDescription: "Mobilizing community food resources across 11 Southwestern Pennsylvania counties to eradicate food insecurity and provide dignity to families.",
    websiteUrl: "https://pittsburghfoodbank.org",
    category: "hunger_relief",
    dateDonated: "2026-05-01",
    fiscalYear: "2026",
    isPublic: true,
    publicImpactNote: "Supporting regional distribution and nutritious youth meal programs.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "init_band_together",
    organizationName: "Band Together Pittsburgh",
    causeDescription: "Enriching the lives of individuals on the autism spectrum through dynamic musical programs, drum circles, and performance workshops.",
    websiteUrl: "https://bandtogetherpgh.org",
    category: "arts_music",
    dateDonated: "2026-04-15",
    fiscalYear: "2026",
    isPublic: true,
    publicImpactNote: "Providing specialized percussion clinics and adaptive instruments.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "init_girls_write",
    organizationName: "Girls Write Pittsburgh",
    causeDescription: "Fostering creative voice, youth mentorship, and literary arts empowerment for teen girls and gender-expansive youth across Allegheny County.",
    websiteUrl: "https://girlswritepgh.org",
    category: "youth_education",
    dateDonated: "2026-03-20",
    fiscalYear: "2026",
    isPublic: true,
    publicImpactNote: "Sponsoring teen writing anthologies and community open mics.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "init_wp_conservancy",
    organizationName: "Western Pennsylvania Conservancy",
    causeDescription: "Protecting exceptional natural places, conserving rivers, planting community gardens, and caring for Fallingwater.",
    websiteUrl: "https://waterlandlife.org",
    category: "environment",
    dateDonated: "2026-02-10",
    fiscalYear: "2026",
    isPublic: true,
    publicImpactNote: "Supporting Pittsburgh community flower garden plantings and urban forestry.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function PublicGivingPage() {
  const [beneficiaries, setBeneficiaries] = useState<PublicBeneficiary[]>(FALLBACK_BENEFICIARIES);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "donations"),
      (snap) => {
        const list: PublicBeneficiary[] = [];
        snap.forEach((d) => {
          const raw = d.data();
          // Strict data boundary: only parse public records and omit private financial fields
          if (raw.isPublic === true) {
            const parsed = PublicBeneficiarySchema.safeParse({ ...raw, id: d.id });
            if (parsed.success) {
              list.push(parsed.data);
            }
          }
        });

        if (list.length > 0) {
          list.sort((a, b) => a.organizationName.localeCompare(b.organizationName));
          setBeneficiaries(list);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Public giving listener error, using fallbacks:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => {
      const matchesCategory = selectedCategory === "all" || b.category === selectedCategory;
      const matchesSearch =
        b.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.causeDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.publicImpactNote.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [beneficiaries, selectedCategory, searchQuery]);

  return (
    <div className="space-y-16 pb-20" suppressHydrationWarning>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4" /> Community Giving & Philanthropy
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tight max-w-4xl mx-auto">
            Music on the Streets, <br />
            <span className="text-yellow-400">Support in the Community</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The Eagleburger Band believes brass and drumline groove should uplift our region in every way.
            A portion of our performance proceeds is donated to grassroots organizations making Pittsburgh a healthier, more vibrant, and more musical place for everyone.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Grassroots Causes
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Music2 className="w-4 h-4 text-yellow-400" /> Youth Music Access
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-400" /> Direct Community Aid
            </span>
          </div>
        </div>
      </section>

      {/* Call to Join in Support */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-2 max-w-2xl">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400">
              Join the Movement
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Support These Worthy Causes Directly
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              We invite our fans, parade attendees, and community partners to get involved. Click any organization below to learn about their initiatives, volunteer your time, or contribute directly to their programs.
            </p>
          </div>

          <Link
            href="/book"
            suppressHydrationWarning
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/20 hover:scale-105 active:scale-95 shrink-0 flex items-center gap-2"
          >
            <span>Book Band for a Benefit</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Search & Category Filter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 border ${
                selectedCategory === "all"
                  ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              All Causes ({beneficiaries.length})
            </button>
            {DonationCategoryEnum.options.map((cat) => {
              const config = CATEGORY_LABELS[cat];
              const count = beneficiaries.filter((b) => b.category === cat).length;
              if (count === 0 && selectedCategory !== cat) return null;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 border ${
                    selectedCategory === cat
                      ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  {config?.label || cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search organizations or causes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {/* Organizations Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
            Loading community organizations...
          </div>
        ) : filteredBeneficiaries.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <Heart className="w-8 h-8 mx-auto text-slate-600" />
            <div className="text-sm font-bold text-white">No organizations found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn&apos;t find any organizations matching &ldquo;{searchQuery}&rdquo;. Try another search term or reset the category filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBeneficiaries.map((b) => {
              const catConfig = CATEGORY_LABELS[b.category] || CATEGORY_LABELS.other;

              return (
                <div
                  key={b.id}
                  className="bg-slate-900 border border-slate-800 hover:border-yellow-400/50 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between space-y-4 shadow-xl group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${catConfig.color}`}>
                        {catConfig.label}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                        <Heart className="w-4 h-4 fill-yellow-400/20 text-yellow-400" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-extrabold text-white group-hover:text-yellow-400 transition-colors">
                        {b.organizationName}
                      </h3>
                      {b.causeDescription && (
                        <p className="text-xs text-slate-400 leading-relaxed mt-2 line-clamp-3">
                          {b.causeDescription}
                        </p>
                      )}
                    </div>

                    {b.publicImpactNote && (
                      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 text-[11px] font-mono text-yellow-300/90 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{b.publicImpactNote}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">
                      Eagleburger Community Partner
                    </span>

                    {b.websiteUrl ? (
                      <a
                        href={b.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        suppressHydrationWarning
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors"
                      >
                        <span>Visit & Support</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Local Cause</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Suggest a Cause CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4">
          <Building className="w-8 h-8 mx-auto text-yellow-400" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Know an Inspiring Grassroots Cause?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            We are always looking to partner with worthy non-profits, youth programs, and community initiatives across Pittsburgh. Tell us about your organization when booking the band or getting in touch!
          </p>
          <div className="pt-2">
            <Link
              href="/book"
              suppressHydrationWarning
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md"
            >
              <span>Connect with Management</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
