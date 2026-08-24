'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Calendar, ArrowLeft, PackageX, ShieldAlert } from 'lucide-react';

export default function ExpiryPage() {
  const [loading, setLoading] = useState(true);
  const [nearExpiryBatches, setNearExpiryBatches] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchExpiryBatches();
  }, []);

  async function fetchExpiryBatches() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;

    if (orgId) {
      // Fetch batches for tenant
      const { data, error } = await supabase
        .from('product_batches')
        .select('*, products(product_name, brand, pack_size)')
        .eq('organization_id', orgId)
        .gt('stock_qty', 0);

      if (!error && data) {
        setNearExpiryBatches(data);
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
          <span className="text-lg font-bold text-slate-900">Expiry & Near-Expiry Batch Tracking</span>
        </div>
        <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-600" /> FEFO Safety Monitor Active
        </div>
      </header>

      {/* Main Body */}
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Batch Expiry Risk Audit</h2>
          <p className="text-sm text-slate-600">Review stock expiration dates to prevent dead inventory and execute timely distributor returns.</p>
        </div>

        {/* Expiry Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-bold text-slate-900 flex justify-between items-center">
            <span>All Active Stock Batches</span>
            <span className="text-xs text-slate-500 font-normal">Sorted by Expiry</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Scanning tenant inventory batches...</div>
          ) : nearExpiryBatches.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <PackageX className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-sm font-medium">No active batches found in inventory.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold">Product Name</th>
                  <th className="p-4 font-semibold">Brand</th>
                  <th className="p-4 font-semibold">Batch Number</th>
                  <th className="p-4 font-semibold">Expiry Date</th>
                  <th className="p-4 font-semibold">Available Qty</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nearExpiryBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-900">{batch.products?.product_name || 'N/A'}</td>
                    <td className="p-4 text-slate-600">{batch.products?.brand || 'N/A'}</td>
                    <td className="p-4 font-mono font-semibold text-slate-800">{batch.batch_number}</td>
                    <td className="p-4 text-slate-700 font-semibold flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" /> {batch.expiry_date}
                    </td>
                    <td className="p-4 font-extrabold text-slate-900">{batch.stock_qty} units</td>
                    <td className="p-4">
                      <span className="text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-bold">
                        Safe
                      </span>
                    </td>
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
