'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShoppingCart, Package, Calendar, ArrowUpRight, ShieldCheck, AlertTriangle, Banknote, Smartphone, CreditCard, Sparkles, History, Calculator } from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  const [cashLedger, setCashLedger] = useState<any[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData(selectedDate);
  }, [selectedDate]);

  async function fetchDashboardData(dateStr: string) {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;
    if (orgId) {
      const startDateTime = `${dateStr}T00:00:00`;
      const endDateTime = `${dateStr}T23:59:59`;

      const { data: salesData } = await supabase
        .from('sales')
        .select('id, invoice_number, final_amount, payment_status, created_at, customers(customer_name, phone)')
        .eq('organization_id', orgId)
        .gte('created_at', startDateTime)
        .lte('created_at', endDateTime)
        .order('created_at', { ascending: false });

      const validSales = salesData?.filter(s => s.payment_status !== 'Cancelled') || [];
      const todaySales = validSales.reduce((acc, curr) => acc + Number(curr.final_amount || 0), 0);
      const invoiceCount = validSales.length;

      const saleIds = salesData?.map(s => s.id) || [];
      let cashTotal = 0;
      let upiTotal = 0;
      let cardTotal = 0;
      const ledgerEvents: any[] = [];

      if (saleIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('sale_id, payment_mode, amount')
          .in('sale_id', saleIds);

        const saleMap = new Map();
        salesData?.forEach(s => saleMap.set(s.id, s));

        paymentsData?.forEach(p => {
          const sale = saleMap.get(p.sale_id);
          const status = sale?.payment_status;
          const amt = Number(p.amount || 0);

          // Handle single or array customer join safely
          const custObj = Array.isArray(sale?.customers) ? sale.customers[0] : sale?.customers;
          const customerName = custObj?.customer_name || 'Walk-in';

          if (status === 'Cancelled' || status === 'Fully Returned') {
            if (p.payment_mode === 'cash') {
              cashTotal -= amt;
              ledgerEvents.push({
                id: `${p.sale_id}-refund`,
                time: new Date(sale.created_at).toLocaleTimeString(),
                invoice: sale.invoice_number,
                type: 'Cash Refund / Payout',
                amount: -amt,
                customer: customerName,
                status: status
              });
            }
          } else {
            if (p.payment_mode === 'cash') {
              cashTotal += amt;
              ledgerEvents.push({
                id: `${p.sale_id}-cash`,
                time: new Date(sale.created_at).toLocaleTimeString(),
                invoice: sale.invoice_number,
                type: 'Cash Sale Collected',
                amount: amt,
                customer: customerName,
                status: 'Completed'
              });
            }
            if (p.payment_mode === 'upi') upiTotal += amt;
            if (p.payment_mode === 'card') cardTotal += amt;
          }
        });

        salesData?.forEach(s => {
          if (s.payment_status === 'Cancelled') {
            const hasCashPay = paymentsData?.some(p => p.sale_id === s.id && p.payment_mode === 'cash');
            if (!hasCashPay) {
              const refundAmt = Number(s.final_amount || 0);
              cashTotal -= refundAmt;
              const custObj = Array.isArray(s.customers) ? s.customers[0] : s.customers;
              ledgerEvents.push({
                id: `${s.id}-cancel`,
                time: new Date(s.created_at).toLocaleTimeString(),
                invoice: s.invoice_number,
                type: 'Cancelled Invoice Payout',
                amount: -refundAmt,
                customer: custObj?.customer_name || 'Walk-in',
                status: 'Cancelled'
              });
            }
          }
        });
      }

      setCashLedger(ledgerEvents);

      const { count: prodCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

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

  const expectedNetCash = metrics.cashTotal;
  const actualCashNum = 0;
  const cashDiscrepancy = 0;

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
          <p className="text-xs text-slate-500 font-medium mt-1">Track sales performance, cash flow ledgers, and inventory health in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-amber-500" /> Sales Date:
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-black text-slate-950 focus:outline-none cursor-pointer"
            />
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
            <span>Selected Date Net Sales</span>
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

        {/* Clickable Low-Stock Alert Card taking user directly to inventory */}
        <div 
          onClick={() => router.push('/dashboard/inventory')}
          className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Low-Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-3xl font-black text-slate-950">{metrics.lowStock}</div>
          <div className="text-xs text-amber-600 font-bold flex items-center gap-1">
            Requires reordering <ArrowUpRight className="w-3 h-3" />
          </div>
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
        <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Revenue Breakdown by Payment Mode (Net of Cash Refunds)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-xl"><Banknote className="w-5 h-5" /></div>
              <div>
                <span className="text-xs text-slate-500 block font-bold">Cash Collected (Net)</span>
                <strong className={`text-lg font-black ${metrics.cashTotal < 0 ? 'text-red-600' : 'text-slate-950'}`}>
                  ₹{metrics.cashTotal.toFixed(2)}
                </strong>
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

      {/* Cash Flow Ledger Stream */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-amber-500" /> Cash Movement Ledger (Sales, Refunds & Cancellations)
          </h3>
          <span className="text-xs text-slate-400 font-semibold">Real-time cash drawer impact log</span>
        </div>

        {cashLedger.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-slate-200">
            No cash transactions or refunds recorded for this date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Invoice / Ref</th>
                  <th className="p-3">Transaction Type</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-right">Cash Impact (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {cashLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-500 font-mono">{item.time}</td>
                    <td className="p-3 font-bold text-slate-950 font-mono">{item.invoice}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${item.amount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-800 font-semibold">{item.customer}</td>
                    <td className={`p-3 text-right font-black text-sm font-mono ${item.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.amount > 0 ? `+₹${item.amount.toFixed(2)}` : `-₹${Math.abs(item.amount).toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
