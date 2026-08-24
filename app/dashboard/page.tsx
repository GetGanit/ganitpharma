'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShoppingCart, Package, Calendar, ArrowUpRight, ShieldCheck, AlertTriangle, Banknote, Smartphone, CreditCard } from 'lucide-react';

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
        .select('id, final_amount')
        .eq('organization_id', orgId)
        .gte('created_at', `${todayStr}T00:00:00`);

      const todaySales = salesData?.reduce((acc, curr) => acc + Number(curr.final_amount || 0), 0) || 0;
      const invoiceCount = salesData?.length || 0;

      // Fetch payment breakdown for today's sales
      const saleIds = salesData?.map(s => s.id) || [];
      let cashTotal = 0;
      let upiTotal = 0;
      let cardTotal = 0;

      if (saleIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('payment_mode, amount')
          .in('sale_id', saleIds);

        paymentsData?.forEach(p => {
          if (p.payment_mode === 'cash') cashTotal += Number(p.amount || 0);
          if (p.payment_mode === 'upi') upiTotal += Number(p.amount || 0);
          if (p.payment_mode === 'card') cardTotal += Number(p.amount || 0);
        });
      }

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
        cashTotal,
        upiTotal,
        cardTotal,
      });
    }
    setLoading(false);
  }

  const currentDate = new Date().toLocaleDateString('en-GB');

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-950">GanitPharma Pharmacy</h1>
            <span className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1 rounded-full border border-slate-200">Active Tenant</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Track sales performance and operational health metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" /> Sales Date: {currentDate}
          </div>
          <button
            onClick={() => router.push('/dashboard/pos')}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" /> New Bill (POS)
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Sales for {new Date().toISOString().split('T')[0]}</span>
            <ArrowUpRight className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-950">
            ₹{metrics.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400">{metrics.invoiceCount} invoices completed on this date</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Total Catalog Items</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-950">{metrics.totalItems}</div>
          <div className="text-xs text-slate-400">Active SKUs in inventory</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Low-Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-950">{metrics.lowStock}</div>
          <div className="text-xs text-amber-600 font-medium">Requires reordering</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Pending POs</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-950">{metrics.pendingPOs}</div>
          <div className="text-xs text-slate-400">Awaiting distributor confirmation</div>
        </div>
      </div>

      {/* Payment Mode Breakdown Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-950">Today's Revenue by Payment Mode</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-lg"><Banknote className="w-5 h-5" /></div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Cash Collected</span>
                <strong className="text-lg text-slate-900">₹{metrics.cashTotal.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-800 rounded-lg"><Smartphone className="w-5 h-5" /></div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">UPI Collected</span>
                <strong className="text-lg text-slate-900">₹{metrics.upiTotal.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 text-purple-800 rounded-lg"><CreditCard className="w-5 h-5" /></div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Card Collected</span>
                <strong className="text-lg text-slate-900">₹{metrics.cardTotal.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Operational Shortcuts */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-950">Quick Operational Shortcuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => router.push('/dashboard/pos')}
            className="p-5 rounded-xl border border-slate-200 hover:border-amber-400 transition cursor-pointer flex justify-between items-center group bg-slate-50/50"
          >
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Launch POS Billing</h4>
              <p className="text-xs text-slate-500 mt-0.5">Barcode scanning & loose strips</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
          </div>

          <div 
            onClick={() => router.push('/dashboard/inventory')}
            className="p-5 rounded-xl border border-slate-200 hover:border-amber-400 transition cursor-pointer flex justify-between items-center group bg-slate-50/50"
          >
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Add Inventory / Batch</h4>
              <p className="text-xs text-slate-500 mt-0.5">FEFO tracking & stock entry</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
          </div>

          <div 
            onClick={() => router.push('/dashboard/purchases')}
            className="p-5 rounded-xl border border-slate-200 hover:border-amber-400 transition cursor-pointer flex justify-between items-center group bg-slate-50/50"
          >
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Import Distributor Bill</h4>
              <p className="text-xs text-slate-500 mt-0.5">CSV/Excel column mapping</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
          </div>
        </div>
      </div>
    </div>
  );
}
