import Link from "next/link";
import { bandConfig } from "@/band.config";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl space-y-6">
        <div className="inline-block bg-yellow-400 text-slate-950 font-black px-3 py-1 rounded text-sm tracking-wider uppercase">
          EBB Platform
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          {bandConfig.name}
        </h1>
        <p className="text-slate-400 text-base leading-relaxed">
          {bandConfig.tagline}
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/portal"
            className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-6 py-3 rounded-lg text-sm transition shadow-lg"
          >
            Musician Portal &rarr;
          </Link>
          <Link
            href="/admin/sections"
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold px-6 py-3 rounded-lg text-sm transition"
          >
            Section Studio
          </Link>
        </div>
      </div>
    </main>
  );
}