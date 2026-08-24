import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Zap, Package, FileText, ArrowRight, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-brand-yellow/30">
      {/* Top Announcement Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 text-center font-medium">
        🚀 Designed exclusively for Indian Pharmacies • ₹49,999 One-Time Purchase • Lifetime Access
      </div>

      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900">Ganit<span className="text-brand-yellow">Pharma</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition">Pricing</a>
            <a href="#security" className="hover:text-slate-900 transition">Security & RLS</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2">
              Sign In
            </Link>
            <Link href="#pricing" className="bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 font-bold text-sm px-5 py-2.5 rounded-lg shadow-sm transition">
              Buy ₹49,999
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-28 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-6">
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Trusted by Independent Indian Retail Pharmacies
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
          Pharmacy billing & inventory, <span className="underline decoration-brand-yellow decoration-4 underline-offset-8">made simple.</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
          Ultra-fast keyboard POS billing, batch-level FEFO expiry tracking, smart purchase inward, and airtight tenant data isolation.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#pricing" className="w-full sm:w-auto bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 font-bold px-8 py-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-base">
            Buy GanitPharma — ₹49,999 <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#features" className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold px-8 py-4 rounded-xl transition text-base">
            Explore Features
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white border-t border-slate-200 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Built for High-Speed Pharmacy Operations</h2>
            <p className="mt-3 text-slate-600">Everything you need to run your chemist shop smoothly without enterprise clutter.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 mb-6 font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Ultra-Fast Keyboard POS</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Optimized for speed. Use <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">F2</code> for search, <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">Enter</code> to add, and support for loose-strip fractional table billing.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-700 mb-6 font-bold">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Batch FEFO Tracking</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                First Expiry, First Out batch management with automated near-expiry alerts and distributor invoice CSV mapping.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 mb-6 font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Strict Tenant Isolation</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Secured via Supabase PostgreSQL Row Level Security (RLS). Your pharmacy data is completely locked and private.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 max-w-5xl mx-auto">
        <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-14 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="max-w-xl">
            <span className="text-brand-yellow font-bold text-xs uppercase tracking-widest bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800/50">One-Time License</span>
            <h2 className="text-3xl md:text-5xl font-extrabold mt-4 tracking-tight">₹49,999</h2>
            <p className="text-slate-400 mt-2 text-lg">Lifetime access. No monthly subscriptions, no recurring SaaS lock-in.</p>
            <ul className="mt-8 space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-yellow shrink-0" /> Full multi-tenant pharmacy suite</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-yellow shrink-0" /> Unlimited invoices & POS billing</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-yellow shrink-0" /> Master medicine search catalog</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-yellow shrink-0" /> Automated GST reports & WhatsApp invoices</li>
            </ul>
            <div className="mt-10">
              <Link href="/onboarding" className="block w-full text-center bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 font-bold py-4 rounded-xl shadow transition text-lg">
                Buy GanitPharma Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-sm text-slate-500">
        <p>© 2026 GanitPharma (Brand: Ganit). All rights reserved. getganit.in</p>
      </footer>
    </div>
  );
}
