'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShoppingCart, Package, Calendar, ArrowUpRight, ShieldCheck, AlertTriangle, Banknote, Smartphone, CreditCard, Sparkles, Calculator } from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    invoiceCount: 0,
    totalItems: 0,
    lowStock: 0,
    pendingPOs: 0,
    cashTotal: 0,
    upiTotal: 0,
    cardTotal: 0,
  });

  // End-of-day Counter Cash Tally State
  const [actualCounterCash, setActualCounterCash] = useState<number | string>('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;
    if (orgId) {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Fetch today's sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('id, final_amount, payment_status')
        .eq('organization_id', orgId)
        .gte('created_at', `${todayStr}T00:00:00`);

      // Calculate gross sales (before returns/cancellations) and net sales
      const grossSales = salesData?.reduce((acc, curr) => acc + Number(curr.final_amount || 0), 0) || 0;
      const validSales = salesData?.filter(s => s.payment_status !== 'Cancelled') || [];
      const todaySales = validSales.reduce((acc, curr) => acc + Number(curr.final_amount || 0), 0);
      const invoiceCount = validSales.length;

      // Fetch payment breakdown for today's sales
      const saleIds = salesData?.map(s => s.id) || [];
      let rawCashTotal = 0;
      let upiTotal = 0;
      let cardTotal = 0;

      if (saleIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('payment_mode, amount')
          .in('sale_id', saleIds);

        paymentsData?.forEach(p => {
          if (p.payment_mode === 'cash') rawCashTotal += Number(p.amount || 0);
          if (p.payment_mode === 'upi') upiTotal += Number(p.amount || 0);
          if (p.payment_mode === 'card') cardTotal += Number(p.amount || 0);
        });
      }

      // Automatically scale Cash Collected proportionally to match Net Sales ratio
      const salesRatio = grossSales > 0 ? todaySales / grossSales : 1;
      const netCashTotal = rawCashTotal * salesRatio;

      // Fetch product catalog count
      const { count: prodCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      // Fetch low stock batches
      const { data: batchData } = await supabase
        .from('product_batches')
        .select('stock_qty')
        .eq('organization_id', orgId)
        .lt('stock_qty', 10);

      const lowStock = batchData?.length || 0;

      setMetrics({
        todaySales,
        invoiceCount,
        totalItems: prodCount || 0,
        lowStock,
        pendingPOs: 0,
        cashTotal: netCashTotal,
        upiTotal,
        cardTotal,
      });
    }
    setLoading(false);
  }

  const currentDate = new Date().toLocaleDateString('en-GB');
  const expectedNetCash = metrics.cashTotal;
  const actualCashNum = Number(actualCounterCash) || 0;
  const cashDiscrepancy = actualCounterCash !== '' ? actualCashNum - expectedNetCash : 0;

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-fade-in bg-hero-gradient min-h-screen">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">Ganit<span className="text-amber-500">Pharma</span> Pharmacy</h1>
            <span className="bg-amber-500/10 text-amber-700 font-bold text-xs px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Active Tenant
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">Track sales performance, returns, and cash drawer tallies in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-amber-500" /> Sales Date: {currentDate}
          </div>
          <button
            onClick={() => router.push('/dashboard/pos')}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" /> New Bill (POS)
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2 hover:shadow-md transition">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Today's Net Sales</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-950">
            ₹{metrics.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 font-medium">{metrics.invoiceCount} active invoices (Net of returns)</div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2 hover:shadow-md transition">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Catalog Items</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-950">{metrics.totalItems}</div>
          <div className="text-xs text-slate-400 font-medium">Active SKUs in inventory</div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2 hover:shadow-md transition">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Low-Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-950">{metrics.lowStock}</div>
          <div className="text-xs text-amber-600 font-bold">Requires reordering</div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2 hover:shadow-md transition">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Pending POs</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-950">{metrics.pendingPOs}</div>
          <div className="text-xs text-slate-400 font-medium">Awaiting distributor confirmation</div>
        </div>
      </div>

      {/* Payment Mode Breakdown Card */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Today's Revenue by Payment Mode (Net of Refunds)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-xl"><Banknote className="w-5 h-5" /></div>
              <div>
                <span className="text-xs text-slate-500 block font-bold">Cash Collected (Net)</span>
                <strong className="text-lg font-black text-slate-950">₹{metrics.cashTotal.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-blue-100 text-blue-800 rounded-xl"><Smartphone className="w-5 h-5" /></div>
              <div>
                <span className="text-xs text-slate-500 block font-bold">UPI Collected</span>
                <strong className="text-lg font-black text-slate-950">₹{metrics.upiTotal.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-purple-100 text-purple-800 rounded-xl"><CreditCard className="w-5 h-5" /></div>
              <div>
                <span className="text-xs text-slate-500 block font-bold">Card Collected</span>
                <strong className="text-lg font-black text-slate-950">₹{metrics.cardTotal.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* End-of-Day Cash Drawer Tally Report */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-500" /> End-of-Day Cash Drawer & Counter Tally Report
          </h3>
          <span className="text-xs text-slate-400 font-semibold">Tally expected vs actual drawer cash</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-xs text-slate-500 font-bold block">System Expected Cash (Drawer)</span>
            <strong className="text-xl font-black text-slate-950">₹{expectedNetCash.toFixed(2)}</strong>
            <span className="text-[10px] text-slate-400 block font-medium">Net cash adjusted for returns & cancellations</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-xs text-slate-500 font-bold block">Actual Physical Counter Cash</span>
            <input
              type="number"
              placeholder="Enter drawer cash..."
              value={actualCounterCash}
              onChange={(e) => setActualCounterCash(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-black text-base text-slate-950 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 block font-medium">Counted manually from cash box</span>
          </div>

          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${actualCounterCash === '' ? 'bg-slate-50 border-slate-200' : cashDiscrepancy === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
            <span className="text-xs font-bold block">Cash Tally Variance / Difference</span>
            <strong className="text-xl font-black">
              {actualCounterCash === '' ? '—' : `₹${cashDiscrepancy >= 0 ? '+' : ''}${cashDiscrepancy.toFixed(2)}`}
            </strong>
            <span className="text-[10px] font-semibold">
              {actualCounterCash === '' ? 'Enter drawer count above' : cashDiscrepancy === 0 ? 'Perfect! Drawer balanced 100%' : cashDiscrepancy > 0 ? 'Surplus cash in counter drawer' : 'Shortage in counter drawer'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Operational Shortcuts */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Quick Operational Shortcuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => router.push('/dashboard/pos')}
            className="p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition cursor-pointer flex justify-between items-center group bg-slate-50/50"
          >
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Launch POS Billing</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Barcode scanning & loose strips</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:scale-110 transition" />
          </div>

          <div 
            onClick={() => router.push('/dashboard/inventory')}
            className="p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition cursor-pointer flex justify-between items-center group bg-slate-50/50"
          >
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Add Inventory / Batch</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">FEFO tracking & stock entry</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:scale-110 transition" />
          </div>

          <div 
            onClick={() => router.push('/dashboard/purchases')}
            className="p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition cursor-pointer flex justify-between items-center group bg-slate-50/50"
          >
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Import Distributor Bill</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">CSV/Excel column mapping</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
          </div>
        </div>
      </div>
    </div>
  );
}
