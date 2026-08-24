'use client';
import { useState } from 'react';
import { ArrowRight, Zap, Package, FileText, BarChart3, ShieldCheck, CheckCircle2, Sparkles, ChevronDown } from 'lucide-react';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: 'Is ₹49,999 a subscription?', a: 'No, it is a one-time purchase per pharmacy for lifetime access with no monthly fees.' },
    { q: 'Can I sell loose tablets from a strip?', a: 'Yes! The POS features an automatic full and loose tablet calculator for split strip dispensing.' },
    { q: 'Does it work with my barcode scanner and thermal printer?', a: 'Yes, it supports standard USB barcode scanners and thermal/A5 invoice printers.' },
    { q: 'Is my pharmacy\'s data separate from other pharmacies?', a: 'Yes, your data is securely isolated using Supabase PostgreSQL Row Level Security (RLS).' },
    { q: 'Can I move my existing stock in?', a: 'Yes, you can easily import your distributor bill or inventory via CSV/Excel column mapping.' },
    { q: 'Who can I contact for support?', a: 'You can reach out directly via support@getganit.in for prompt assistance.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffffff] via-[#f8fafc] to-[#f1f5f9] text-slate-900 font-sans selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden relative">
      
      {/* Static Ambient Glow (No pulse/flicker) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-brand-glow pointer-events-none blur-3xl" />

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-xs font-black py-2.5 px-4 text-center shadow-sm relative z-20">
        🚀 Designed exclusively for Indian Pharmacies • ₹49,999 One-Time Purchase • Lifetime Access (No Monthly Fees)
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-slate-200/80 px-6 lg:px-16 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center font-black text-amber-400 text-xl shadow-lg shadow-slate-950/10">
            G
          </div>
          <span className="text-xl font-black tracking-tight text-slate-950">
            Ganit<span className="text-amber-500">Pharma</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-700">
          <a href="#features" className="hover:text-slate-950 transition">Features</a>
          <a href="#pricing" className="hover:text-slate-950 transition">Pricing</a>
          <a href="#faq" className="hover:text-slate-950 transition">FAQ</a>
        </nav>

        <div className="flex items-center gap-4">
          <a href="/login" className="text-xs font-bold text-slate-700 hover:text-slate-950 transition px-4 py-2.5">
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
      <section className="relative pt-20 pb-16 px-6 lg:px-16 max-w-7xl mx-auto text-center space-y-6 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-bold shadow-sm">
          <Sparkles className="w-4 h-4" /> Trusted by Independent Indian Retail Pharmacies
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-950 max-w-4xl mx-auto leading-[1.1]">
          Pharmacy billing & inventory, <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">made simple.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium">
          Ultra-fast keyboard POS billing, batch-level FEFO expiry tracking, smart purchase inward, and airtight tenant data isolation.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <a
            href="/onboarding"
            className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
          >
            Buy GanitPharma — ₹49,999 <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto bg-white/80 backdrop-blur-sm hover:bg-white text-slate-900 font-bold text-sm px-8 py-4 rounded-2xl border border-slate-200/80 shadow-sm transition"
          >
            Explore Features
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 px-6 lg:px-16 max-w-7xl mx-auto space-y-8 relative z-10">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Everything a busy counter needs</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">Counter-speed billing</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Barcode scan, keyboard shortcuts, loose-strip sales and split payments — bill in seconds.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">Batch & expiry control</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Every batch tracks expiry and cost. Billing always sells earliest expiry first (FEFO).
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">GST invoices</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Slab-wise tax computed on every line, reprint or cancel with stock restore.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">Reports that matter</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Daily sales, GST summaries and top sellers, exportable as CSV.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">Audit trail</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Every sale, cancellation and stock movement is logged and attributable.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 space-y-3 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">Multi-pharmacy safe</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Strict data isolation — each pharmacy sees only its own stock and sales.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-6 lg:px-16 max-w-4xl mx-auto relative z-10">
        <div className="bg-white/90 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">GanitPharma — full product</span>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl sm:text-5xl font-black text-slate-950">₹49,999</h2>
              <span className="text-slate-500 text-xs font-bold">one-time · per pharmacy</span>
            </div>
            <p className="text-xs text-slate-500">Lifetime access. GST extra as applicable.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-semibold text-slate-700 pt-2">
            <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Unlimited invoices and products</div>
            <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Batch, expiry and low-stock control</div>
            <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Loose tablet / strip billing</div>
            <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Purchase orders, vendors and goods receipt</div>
            <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> GST slab reports with CSV export</div>
            <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Multiple staff logins with roles</div>
            <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Audit log and stock movement trail</div>
            <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Lifetime access — no monthly fee</div>
          </div>

          <div className="pt-4 space-y-3">
            <a
              href="/onboarding"
              className="block text-center bg-amber-400 hover:bg-amber-500 text-slate-950 font-black py-4 rounded-2xl shadow-lg shadow-amber-500/20 transition text-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              Buy now
            </a>
            <p className="text-center text-xs text-slate-500 font-medium">
              Online payment is being enabled. Until then our team completes the purchase and sets up your pharmacy account.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 px-6 lg:px-16 max-w-4xl mx-auto space-y-6 relative z-10">
        <h2 className="text-2xl font-black text-slate-950">Frequently asked questions</h2>
        <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
          {faqs.map((faq, i) => (
            <div key={i} className="py-4">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex justify-between items-center text-left text-sm font-bold text-slate-900 py-2 focus:outline-none"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <p className="text-xs sm:text-sm text-slate-600 pt-2 pb-1 font-medium leading-relaxed">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="bg-slate-950 text-white py-16 px-6 text-center space-y-5 relative z-10 border-t border-slate-800">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Ready to run your counter on Ganit<span className="text-amber-400">Pharma</span>?</h2>
        <p className="text-xs sm:text-sm text-slate-400 font-medium">Try the live demo pharmacies first, then buy once and use it for life.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <a href="/login" className="bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs px-6 py-3 rounded-2xl shadow transition">
            Open the demo
          </a>
          <a href="/onboarding" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-6 py-3 rounded-2xl shadow transition">
            Buy — ₹49,999
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-16 px-6 lg:px-16 bg-white/70 backdrop-blur-md relative z-10 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black text-xs">G</div>
              <span className="font-black text-slate-950 text-sm">Ganit<span className="text-amber-500">Pharma</span></span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Pharmacy billing & inventory software by Ganit. Built for Indian pharmacies.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-950 text-sm">Product</h4>
            <ul className="space-y-2 text-xs text-slate-500 font-medium">
              <li><a href="#features" className="hover:text-slate-900">Features</a></li>
              <li><a href="#pricing" className="hover:text-slate-900">Pricing</a></li>
              <li><a href="#faq" className="hover:text-slate-900">FAQ</a></li>
              <li><a href="/login" className="hover:text-slate-900">Sign in</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-950 text-sm">Modules</h4>
            <ul className="space-y-2 text-xs text-slate-500 font-medium">
              <li><a href="/dashboard/pos" className="hover:text-slate-900">Billing / POS</a></li>
              <li><a href="/dashboard/inventory" className="hover:text-slate-900">Inventory & expiry</a></li>
              <li><a href="/dashboard/purchases" className="hover:text-slate-900">Purchases & vendors</a></li>
              <li><a href="/dashboard/compliance" className="hover:text-slate-900">GST reports & compliance</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-950 text-sm">Contact</h4>
            <ul className="space-y-2 text-xs text-slate-500 font-mono">
              <li>sales@getganit.in</li>
              <li>support@getganit.in</li>
              <li className="font-sans text-slate-900 font-bold">getganit.in</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-10 mt-10 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 font-medium">
          <p>© 2026 Ganit. All rights reserved.</p>
          <div className="flex gap-6 pt-2 sm:pt-0">
            <span>Billing</span>
            <span>Inventory</span>
            <span>GST</span>
            <span>Compliance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
