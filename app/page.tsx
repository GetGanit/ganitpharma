'use client';
import { useState } from 'react';
import { ArrowRight, ShieldCheck, Zap, Package, CheckCircle2, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-yellow selection:text-slate-950">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 text-xs font-bold py-2 px-4 text-center">
        🚀 Designed exclusively for Indian Pharmacies • ₹49,999 One-Time Purchase • Lifetime Access (No Monthly Fees)
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800 px-6 lg:px-16 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-brand-yellow flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
            G
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Ganit<span className="text-brand-yellow">Pharma</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
          <a href="#security" className="hover:text-white transition">Security & RLS</a>
        </nav>

        <div className="flex items-center gap-4">
          <a href="/login" className="text-xs font-bold text-slate-300 hover:text-white transition px-4 py-2.5">
            Sign In
          </a>
          <a
            href="/onboarding"
            className="bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 text-xs font-extrabold px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
          >
            Buy ₹49,999 License <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 lg:px-16 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold shadow-inner">
          <Sparkles className="w-4 h-4" /> Trusted by Independent Indian Retail Pharmacies
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Pharmacy billing & inventory, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">made simple.</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal">
          Ultra-fast keyboard POS billing, batch-level FEFO expiry tracking, smart purchase inward, and airtight tenant data isolation.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/onboarding"
            className="w-full sm:w-auto bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 font-extrabold text-sm px-8 py-4 rounded-xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2"
          >
            Buy GanitPharma — ₹49,999 <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-8 py-4 rounded-xl border border-slate-800 transition"
          >
            Explore Features
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 lg:px-16 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-black tracking-tight text-white">Built for High-Speed Pharmacy Operations</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">Everything you need to run your chemist shop smoothly without enterprise clutter.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Ultra-Fast Keyboard POS</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Optimized for speed. Use <kbd className="bg-slate-800 px-2 py-1 rounded text-xs text-amber-400">F2</kbd> for search, <kbd className="bg-slate-800 px-2 py-1 rounded text-xs text-amber-400">Enter</kbd> to add, and support for loose-strip fractional table billing.
            </p>
          </div>

          <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Batch FEFO Tracking</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              First Expiry, First Out batch management with automated near-expiry alerts and distributor invoice CSV mapping.
            </p>
          </div>

          <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Strict Tenant Isolation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Secured via Supabase PostgreSQL Row Level Security (RLS). Your pharmacy data is completely locked and private.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 lg:px-16 max-w-5xl mx-auto">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-10 sm:p-16 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-brand-yellow text-slate-950 font-black text-xs px-6 py-2 rounded-bl-2xl uppercase tracking-wider">
            One-Time License
          </div>

          <div className="space-y-6 max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white">Own your software forever.</h2>
            <p className="text-slate-400 text-sm">Lifetime access. No monthly subscriptions, no recurring SaaS lock-in.</p>
            
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-black text-white">₹49,999</span>
              <span className="text-slate-400 text-sm font-semibold">one-time payment</span>
            </div>

            <ul className="space-y-3 pt-4 text-sm text-slate-300">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-yellow shrink-0" /> Full multi-tenant pharmacy suite</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-yellow shrink-0" /> Unlimited invoices & POS billing</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-yellow shrink-0" /> Master medicine search catalog</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-yellow shrink-0" /> Automated GST reports & WhatsApp invoices</li>
            </ul>

            <div className="pt-6">
              <a
                href="/onboarding"
                className="block sm:inline-block text-center bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 font-extrabold py-4 px-8 rounded-xl shadow-lg transition"
              >
                Get GanitPharma Now
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6 lg:px-16 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 GanitPharma (Brand: Ganit). All rights reserved. getganit.in</p>
        <p>Engineered for High-Performance Indian Retail Pharmacies.</p>
      </footer>
    </div>
  );
}
