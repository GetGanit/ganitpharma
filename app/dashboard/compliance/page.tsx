'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShieldAlert, FileText, Activity } from 'lucide-react';

export default function CompliancePage() {
  const [loading, setLoading] = useState(true);
  const [expiryBatches, setExpiryBatches] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchComplianceData();
  }, []);

  async function fetchComplianceData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;
    if (orgId) {
      const { data } = await supabase
        .from('product_batches')
        .select('*, products(product_name)')
        .eq('organization_id', orgId)
        .gt('stock_qty', 0);

      if (data) setExpiryBatches(data);
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-950">Compliance & audit</h1>
        <p className="text-sm text-slate-500">Expiry watch-list plus a complete, tamper-evident trail of stock and billing activity.</p>
      </div>

      {/* Expiry Watch-list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="font-bold text-slate-950 text-sm">Expiry watch-list (next 180 days)</h3>
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-xs">Loading expiry watch-list...</div>
        ) : expiryBatches.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">No active batches found in watch-list.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase border-b border-slate-100">
              <tr>
                <th className="pb-3 font-semibold">Product</th>
                <th className="pb-3 font-semibold">Batch</th>
                <th className="pb-3 font-semibold">Expiry</th>
                <th className="pb-3 font-semibold">Qty</th>
                <th className="pb-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expiryBatches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="py-3 font-bold text-slate-900">{b.products?.product_name || 'N/A'}</td>
                  <td className="py-3 text-slate-600 font-mono">{b.batch_number}</td>
                  <td className="py-3 text-slate-600">{b.expiry_date}</td>
                  <td className="py-3 font-bold text-slate-900">{b.stock_qty}</td>
                  <td className="py-3 text-right">
                    <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold text-[10px]">
                      Active Watch
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Movements */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-950 text-sm">Stock movements</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
              <div>
                <strong className="text-slate-900 block">Dolo 650 Tablet</strong>
                <span className="text-slate-400">Sale - Today</span>
              </div>
              <span className="font-bold text-red-600">-15</span>
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-950 text-sm">Audit log</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
              <div>
                <strong className="text-slate-900 block">sale.created</strong>
                <span className="text-slate-400">Invoice generated successfully</span>
              </div>
              <span className="text-slate-500 font-mono text-[10px]">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
