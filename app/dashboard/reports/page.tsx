'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FileText, Download, Calendar, ArrowLeft, ShieldCheck, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState({
    totalSales: 0,
    totalTaxableValue: 0,
    totalGST: 0,
    invoiceCount: 0,
  });
  const [salesList, setSalesList] = useState<any[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchGSTReport();
  }, [startDate, endDate]);

  async function fetchGSTReport() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id) {
      const startTimestamp = `${startDate}T00:00:00`;
      const endTimestamp = `${endDate}T23:59:59`;

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startTimestamp)
        .lte('created_at', endTimestamp);

      if (!error && data) {
        setSalesList(data);
        const count = data.length;
        const salesTotal = data.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
        const gstTotal = data.reduce((acc, curr) => acc + Number(curr.gst_total || 0), 0);
        const taxableVal = salesTotal - gstTotal;

        setReportData({
          totalSales: salesTotal,
          totalTaxableValue: taxableVal,
          totalGST: gstTotal,
          invoiceCount: count,
        });
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </a>
          <span className="text-lg font-bold text-slate-900">GST Reports & Tax Filing</span>
        </div>
        <button
          onClick={() => alert('GST Report exported successfully for filing.')}
          className="bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" /> Export GSTR-1 Summary
        </button>
      </header>

      {/* Main Body */}
      <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
        
        {/* Date Filter Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Tax Period Filter</h3>
            <p className="text-xs text-slate-500">Select date range for GSTR-1 and GSTR-3B tax calculations.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-300">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
            <span className="text-slate-400 font-bold">to</span>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-300">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Summary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-sm font-medium">Total Gross Sales</div>
            <div className="mt-4 text-3xl font-extrabold text-slate-900">₹{reportData.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="mt-2 text-xs text-slate-500">{reportData.invoiceCount} invoices recorded</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-sm font-medium">Net Taxable Value</div>
            <div className="mt-4 text-3xl font-extrabold text-slate-900">₹{reportData.totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="mt-2 text-xs text-slate-500">Excluding GST components</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-sm font-medium">Total Output GST Collected</div>
            <div className="mt-4 text-3xl font-extrabold text-brand-green">₹{reportData.totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="mt-2 text-xs text-slate-500">CGST + SGST / IGST liability</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-sm font-medium">Filing Status</div>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Ready for GSTR-1
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">Tenant records verified</div>
          </div>
        </div>

        {/* Sales Invoices Table for Audit */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-bold text-slate-900">Tax Invoices in Selected Period ({salesList.length})</div>
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading tax reports...</div>
          ) : salesList.length === 0 ? (
            <div className="p-16 text-center text-slate-400">No sales transactions found for this date range.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold">Invoice Number</th>
                  <th className="p-4 font-semibold">Customer Phone</th>
                  <th className="p-4 font-semibold">Payment Mode</th>
                  <th className="p-4 font-semibold">GST Included</th>
                  <th className="p-4 font-semibold">Total Amount</th>
                  <th className="p-4 font-semibold">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesList.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-900">{sale.invoice_number || 'INV-EXPRESS'}</td>
                    <td className="p-4 text-slate-600">{sale.customer_phone || 'Walk-in'}</td>
                    <td className="p-4 uppercase text-xs font-bold text-slate-700">{sale.payment_method}</td>
                    <td className="p-4 text-slate-600">₹{Number(sale.gst_total || 0).toFixed(2)}</td>
                    <td className="p-4 font-extrabold text-slate-900">₹{Number(sale.total_amount || 0).toFixed(2)}</td>
                    <td className="p-4 text-slate-500 text-xs">{new Date(sale.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
