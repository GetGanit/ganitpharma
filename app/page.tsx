'use client';
import { useState } from 'react';
import { ArrowRight, ShieldCheck, Zap, Package, CheckCircle2, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-hero-gradient text-slate-900 font-sans selection:bg-amber-400 selection:text-slate-950 overflow-hidden relative">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand-glow pointer-events-none blur-3xl" />

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-xs font-black py-2.5 px-4 text-center shadow-sm relative z-20">
        🚀 Designed exclusively for Indian Pharmacies • ₹49,999 One-Time Purchase • Lifetime Access (No Monthly Fees)
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/80 px-6 lg:px-16 h-20 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center font-black text-amber-400 text-xl shadow-lg shadow-slate-950/10">
            G
          </div>
          <span className="text-xl font-black tracking-tight text-slate-950">
            Ganit<span className="text-amber-500">Pharma</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
          <a href="#features" className="hover:text-slate-950 transition">Features</a>
          <a href="#pricing" className="hover:text-slate-950 transition">Pricing</a>
          <a href="#security" className="hover:text-slate-950 transition">Security & RLS</a>
        </nav>

        <div className="flex items-center gap-4">
          <a href="/login" className="text-xs font-bold text-slate-600 hover:text-slate-950 transition px-4 py-2.5">
            Sign In
          </a>
          <a
            href="/onboarding"
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2"
          >
            Buy ₹49,999 License <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 lg:px-16 max-w-7xl mx-auto text-center space-y-8 animate-slide-up z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-bold shadow-sm">
          <Sparkles className="w-4 h-4" /> Trusted by Independent Indian Retail Pharmacies
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-950 max-w-4xl mx-auto leading-[1.1]">
          Pharmacy billing & inventory, <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">made simple.</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
          Ultra-fast keyboard POS billing, batch-level FEFO expiry tracking, smart purchase inward, and airtight tenant data isolation.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/onboarding"
            className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
          >
            Buy GanitPharma — ₹49,999 <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm px-8 py-4 rounded-2xl border border-slate-200/80 shadow-sm transition"
          >
            Explore Features
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 lg:px-16 max-w-7xl mx-auto space-y-16 relative z-10">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-black tracking-tight text-slate-950">Built for High-Speed Pharmacy Operations</h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto font-medium">Everything you need to run your chemist shop smoothly without enterprise clutter.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card-gradient p-8 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-950">Ultra-Fast Keyboard POS</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Optimized for speed. Use <kbd className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-xs text-amber-800 font-mono font-bold">F2</kbd> for search, <kbd className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-xs text-amber-800 font-mono font-bold">Enter</kbd> to add, and support for loose-strip fractional table billing.
            </p>
          </div>

          <div className="bg-card-gradient p-8 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-950">Batch FEFO Tracking</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              First Expiry, First Out batch management with automated near-expiry alerts and distributor invoice CSV mapping.
            </p>
          </div>

          <div className="bg-card-gradient p-8 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-950">Strict Tenant Isolation</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Secured via Supabase PostgreSQL Row Level Security (RLS). Your pharmacy data is completely locked and private.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 lg:px-16 max-w-5xl mx-auto relative z-10">
        <div className="bg-white/90 backdrop-blur-md p-10 sm:p-16 rounded-3xl border border-slate-200/80 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-black text-xs px-6 py-2 rounded-bl-2xl uppercase tracking-wider">
            One-Time License
          </div>

          <div className="space-y-6 max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950">Own your software forever.</h2>
            <p className="text-slate-600 text-sm font-medium">Lifetime access. No monthly subscriptions, no recurring SaaS lock-in.</p>
            
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-black text-slate-950">₹49,999</span>
              <span className="text-slate-500 text-sm font-bold">one-time payment</span>
            </div>

            <ul className="space-y-3 pt-4 text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Full multi-tenant pharmacy suite</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Unlimited invoices & POS billing</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Master medicine search catalog</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Automated GST reports & WhatsApp invoices</li>
            </ul>

            <div className="pt-6">
              <a
                href="/onboarding"
                className="block sm:inline-block text-center bg-amber-400 hover:bg-amber-500 text-slate-950 font-black py-4 px-8 rounded-2xl shadow-lg shadow-amber-500/20 transition hover:scale-105 active:scale-95"
              >
                Get GanitPharma Now
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-12 px-6 lg:px-16 text-center text-xs text-slate-500 space-y-2 relative z-10 bg-white/50 backdrop-blur-sm">
        <p className="font-bold text-slate-700">© 2026 GanitPharma (Brand: Ganit). All rights reserved. getganit.in</p>
        <p className="font-medium">Engineered for High-Performance Indian Retail Pharmacies.</p>
      </footer>
    </div>
  );
}
