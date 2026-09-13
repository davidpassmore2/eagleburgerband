"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  Mail,
  ArrowRight,
  Sparkles,
  MessageSquareHeart,
  Music2,
} from "lucide-react";

export default function IntakeCardsSection() {
  const intakeCards = [
    {
      id: "booking",
      badge: "Event Booking",
      badgeColor: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
      title: "Book the Band",
      icon: Calendar,
      description:
        "Planning a parade, street festival, block party, wedding, or celebration? Check band availability, explore brass & drumline options, and request a prompt performance quote.",
      highlights: ["Parades & Festivals", "Block Parties & Weddings", "100% Mobile & Acoustic"],
      ctaText: "Inquire to Book",
      ctaHref: "/book",
      popular: true,
    },
    {
      id: "testimonials",
      badge: "Client & Fan Reviews",
      badgeColor: "bg-amber-400/10 text-amber-400 border-amber-400/30",
      title: "Leave a Testimonial",
      icon: MessageSquareHeart,
      description:
        "Caught the Eagleburger Band marching in full stride or hired us for your gathering? Share your experience, submit a star rating, and see what event organizers are saying.",
      highlights: ["5-Star Crowd Ratings", "Event Organizer Quotes", "Public Review Gallery"],
      ctaText: "Read & Share Reviews",
      ctaHref: "/testimonials",
      popular: false,
    },
    {
      id: "contact",
      badge: "Get in Touch",
      badgeColor: "bg-blue-400/10 text-blue-400 border-blue-400/30",
      title: "General Inquiries & Press",
      icon: Mail,
      description:
        "Have questions about band merchandise, press and media interviews, community partnerships, or general feedback? Send our coordination team a direct message.",
      highlights: ["Press & Media Inquiries", "Community Partnerships", "Direct Band Dispatch"],
      ctaText: "Send a Message",
      ctaHref: "/contact",
      popular: false,
    },
  ];

  return (
    <section 
      aria-label="Band Intake and Contact Options" 
      className="py-16 sm:py-20 border-t border-slate-800/80 bg-slate-950/60"
      suppressHydrationWarning
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Connect & Collaborate</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight">
            How Can We Help You?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Whether you are coordinating a city parade, sharing your reaction from the sidewalk, or reaching out for press and partnerships, choose an intake path below.
          </p>
        </div>

        {/* 3 Intake Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {intakeCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative group border ${
                  card.popular
                    ? "bg-gradient-to-b from-slate-900 via-slate-900 to-yellow-950/20 border-yellow-400/40 shadow-xl shadow-yellow-500/5 hover:border-yellow-400 hover:shadow-yellow-400/10"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900 hover:shadow-xl hover:shadow-black/40"
                }`}
              >
                {/* Popular highlight pill */}
                {card.popular && (
                  <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                    Most Popular
                  </div>
                )}

                <div className="space-y-5">
                  {/* Top Row: Icon + Badge */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 group-hover:border-yellow-400/40 flex items-center justify-center text-yellow-400 shadow-inner group-hover:scale-105 transition-all">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-yellow-400 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  {/* Feature Highlights */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {card.highlights.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card CTA Action */}
                <div className="pt-8">
                  <Link
                    href={card.ctaHref}
                    suppressHydrationWarning
                    className={`w-full py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${
                      card.popular
                        ? "bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-yellow-400/20 group-hover:shadow-md"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700"
                    }`}
                  >
                    <span>{card.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Musician Auditions Sub-Callout Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center shrink-0">
              <Music2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Musician Auditions & Applications
              </span>
              <span className="text-xs text-slate-400">
                Are you a brass player or battery drummer interested in performing with the band?
              </span>
            </div>
          </div>
          <Link
            href="/join"
            suppressHydrationWarning
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700 text-xs font-bold whitespace-nowrap transition"
          >
            Audition With Us &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

