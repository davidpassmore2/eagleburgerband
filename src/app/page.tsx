import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-xl space-y-6 text-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
            Eagleburger Band
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            High-energy brass, percussion, and street performance logistics platform.
          </p>
        </div>

        <div 
          className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4"
          suppressHydrationWarning
        >
          <Link
            href="/portal"
            suppressHydrationWarning
            className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-6 py-3 rounded-lg text-sm transition shadow-lg inline-block text-center"
          >
            Musician Portal &rarr;
          </Link>

          <Link
            href="/admin/sections"
            suppressHydrationWarning
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold px-6 py-3 rounded-lg text-sm transition inline-block text-center"
          >
            Section Studio
          </Link>
        </div>
      </div>
    </main>
  );
}