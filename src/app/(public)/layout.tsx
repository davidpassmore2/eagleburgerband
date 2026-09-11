import React from "react";
import Link from "next/link";
import { Music2, Calendar, Send, Shield, Video, HeartHandshake } from "lucide-react";

export const metadata = {
  title: "Eagleburger Band | Pittsburgh Street Brass & Drums",
  description: "Pittsburgh's premier mobile acoustic street brass and drumline powerhouse. Available for parades, festivals, block parties, and celebrations.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-yellow-400 selection:text-slate-950"
      suppressHydrationWarning
    >
      {/* Public Navigation Header */}
      <header 
        className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800"
        suppressHydrationWarning
      >
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between"
          suppressHydrationWarning
        >
          <Link 
            href="/" 
            className="flex items-center gap-3 group"
            suppressHydrationWarning
          >
            <div className="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-yellow-400/20 group-hover:scale-105 transition-transform">
              <Music2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white group-hover:text-yellow-400 transition-colors uppercase">
                Eagleburger Band
              </span>
              <span className="block text-[11px] font-semibold text-yellow-400/90 tracking-wider uppercase">
                Pittsburgh Brass & Battery
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav 
            className="hidden md:flex items-center gap-8"
            suppressHydrationWarning
          >
            <Link
              href="/"
              suppressHydrationWarning
              className="text-sm font-semibold text-slate-300 hover:text-yellow-400 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/gigs"
              suppressHydrationWarning
              className="text-sm font-semibold text-slate-300 hover:text-yellow-400 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              Performances
            </Link>
            <Link
              href="/book"
              suppressHydrationWarning
              className="text-sm font-semibold text-slate-300 hover:text-yellow-400 transition-colors flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Book the Band
            </Link>
            <Link
              href="/giving"
              suppressHydrationWarning
              className="text-sm font-semibold text-slate-300 hover:text-yellow-400 transition-colors flex items-center gap-1.5"
            >
              <HeartHandshake className="w-4 h-4 text-rose-400" />
              Community Giving
            </Link>
          </nav>

          {/* Action CTAs */}
          <div 
            className="hidden sm:flex items-center gap-4"
            suppressHydrationWarning
          >
            <Link
              href="/portal"
              suppressHydrationWarning
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-yellow-400" />
              Musician Portal
            </Link>
            <Link
              href="/book"
              suppressHydrationWarning
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/20 hover:scale-[1.02] active:scale-95"
            >
              Inquire Now
            </Link>
          </div>

          {/* Mobile Quick Link */}
          <div 
            className="flex md:hidden items-center gap-2"
            suppressHydrationWarning
          >
            <Link
              href="/portal"
              suppressHydrationWarning
              className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/50"
            >
              Portal
            </Link>
            <Link
              href="/book"
              suppressHydrationWarning
              className="bg-yellow-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs"
            >
              Book
            </Link>
          </div>
        </div>

        {/* Mobile Submenu Bar */}
        <div 
          className="md:hidden border-t border-slate-900/80 bg-slate-950/60 px-4 py-2 flex items-center justify-around text-xs font-semibold"
          suppressHydrationWarning
        >
          <Link 
            href="/" 
            suppressHydrationWarning
            className="text-slate-300 hover:text-yellow-400 py-1"
          >
            Home
          </Link>
          <Link 
            href="/gigs" 
            suppressHydrationWarning
            className="text-slate-300 hover:text-yellow-400 py-1 flex items-center gap-1"
          >
            <Calendar className="w-3.5 h-3.5" />
            Shows
          </Link>
          <Link 
            href="/book" 
            suppressHydrationWarning
            className="text-slate-300 hover:text-yellow-400 py-1 flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            Book
          </Link>
          <Link 
            href="/giving" 
            suppressHydrationWarning
            className="text-slate-300 hover:text-yellow-400 py-1 flex items-center gap-1"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            Giving
          </Link>
        </div>
      </header>

      {/* Main Marketing Content Canvas */}
      <div className="flex-1" suppressHydrationWarning>
        {children}
      </div>

      {/* Public Marketing Footer */}
      <footer 
        className="border-t border-slate-800 bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 lg:px-8"
        suppressHydrationWarning
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12" suppressHydrationWarning>
          {/* Col 1: Band Bio */}
          <div className="space-y-4 md:col-span-2" suppressHydrationWarning>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-950 font-black">
                <Music2 className="w-5 h-5" />
              </div>
              <span className="text-lg font-black text-white uppercase tracking-wider">
                Eagleburger Band
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Pittsburgh&apos;s mobile acoustic street brass and drumline powerhouse. Bringing thunderous horns and unstoppable drum grooves to parades, festivals, and celebrations across Western Pennsylvania.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://www.youtube.com/watch?v=v0x-fut30wE"
                target="_blank"
                rel="noopener noreferrer"
                suppressHydrationWarning
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-yellow-400 transition-colors bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"
              >
                <Video className="w-4 h-4 text-red-500" />
                Watch Parade Reel
              </a>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div suppressHydrationWarning>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Explore</h4>
            <ul className="space-y-2 text-xs" suppressHydrationWarning>
              <li>
                <Link href="/" suppressHydrationWarning className="hover:text-yellow-400 transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/gigs" suppressHydrationWarning className="hover:text-yellow-400 transition-colors">Upcoming Performances</Link>
              </li>
              <li>
                <Link href="/book" suppressHydrationWarning className="hover:text-yellow-400 transition-colors">Book the Ensemble</Link>
              </li>
              <li>
                <Link href="/giving" suppressHydrationWarning className="hover:text-yellow-400 transition-colors">Community Giving</Link>
              </li>
              <li>
                <Link href="/portal" suppressHydrationWarning className="text-slate-500 hover:text-slate-300 transition-colors">Musician Portal Access</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Community & Booking */}
          <div suppressHydrationWarning>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Booking Inquiries</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Planning a festival, parade, block party, or special event? Inquire with our gig coordination team.
            </p>
            <Link
              href="/book"
              suppressHydrationWarning
              className="inline-block bg-slate-900 hover:bg-slate-800 border border-slate-700 text-yellow-400 font-bold px-4 py-2 rounded-lg text-xs transition"
            >
              Submit Inquiry &rarr;
            </Link>
          </div>
        </div>

        <div 
          className="max-w-7xl mx-auto border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4"
          suppressHydrationWarning
        >
          <p>&copy; {new Date().getFullYear()} Eagleburger Band. Pittsburgh, PA. All rights reserved.</p>
          <div className="flex items-center gap-4" suppressHydrationWarning>
            <span>Acoustic &bull; Mobile &bull; Electric</span>
            <Link href="/portal" suppressHydrationWarning className="text-slate-600 hover:text-slate-400">Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
