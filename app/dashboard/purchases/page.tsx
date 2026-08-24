'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShoppingBag, Users, Upload, Plus, ArrowLeft, CheckCircle2, FileSpreadsheet } from 'lucide-react';

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<'pos' | 'vendors' | 'import'>('pos');
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Vendor Form
  const [newVendor, setNewVendor] = useState({ name: '', phone: '', email: '', address: '', gstin: '' });
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;

    if (orgId) {
      // Fetch vendors
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', orgId);
      
      if (vendorData) setVendors(vendorData);

      // Fetch purchase orders
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('*, vendors(vendor_name)')
        .eq('organization_id', orgId);

      if (poData) setPurchaseOrders(poData);
    }
    setLoading(false);
  }

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const orgId = user.user_metadata?.organization_id;
    if (!orgId) return;

    const { error } = await supabase.from('vendors').insert([
      {
        organization_id: orgId,
        vendor_name: newVendor.name,
        phone: newVendor.phone,
        email: newVendor.email,
        address: newVendor.address,
        gstin: newVendor.gstin,
      }
    ]);

    if (error) {
      alert('Error adding vendor: ' + error.message);
    } else {
      setNewVendor({ name: '', phone: '', email: '', address: '', gstin: '' });
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </a>
          <span className="text-lg font-bold text-slate-900">Purchases & Vendor Management</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'vendors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Vendors
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Distributor Bill Import
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
        
        {/* Tab 1: Purchase Orders */}
        {activeTab === 'pos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-slate-900">Purchase Orders & Smart Inward</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {purchaseOrders.length === 0 ? (
                <div className="p-16 text-center text-slate-400 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto stroke-1" />
                  <p className="text-sm font-medium">No purchase orders recorded yet.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-semibold">PO ID</th>
                      <th className="p-4 font-semibold">Vendor</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-900">{po.id.slice(0, 8)}...</td>
                        <td className="p-4 text-slate-700">{po.vendors?.vendor_name || 'Unknown Vendor'}</td>
                        <td className="p-4">
                          <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold uppercase">
                            {po.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">{new Date(po.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Vendors */}
        {activeTab === 'vendors' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
              <h3 className="text-base font-bold text-slate-900">Add New Vendor</h3>
              <form onSubmit={handleCreateVendor} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Vendor Name</label>
                  <input
                    type="text"
                    required
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    placeholder="Apollo Pharma Distributors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">GSTIN</label>
                  <input
                    type="text"
                    value={newVendor.gstin}
                    onChange={(e) => setNewVendor({ ...newVendor, gstin: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    placeholder="29AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Address</label>
                  <input
                    type="text"
                    value={newVendor.address}
                    onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    placeholder="Hubli Road, Bengaluru"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow transition"
                >
                  Save Vendor
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 font-bold text-slate-900">Registered Vendors ({vendors.length})</div>
              {vendors.length === 0 ? (
                <div className="p-16 text-center text-slate-400">No vendors registered yet.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-semibold">Name</th>
                      <th className="p-4 font-semibold">Phone</th>
                      <th className="p-4 font-semibold">GSTIN</th>
                      <th className="p-4 font-semibold">Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-900">{v.vendor_name}</td>
                        <td className="p-4 text-slate-600">{v.phone}</td>
                        <td className="p-4 text-slate-600">{v.gstin || 'N/A'}</td>
                        <td className="p-4 text-slate-600">{v.address || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Distributor Bill Import */}
        {activeTab === 'import' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <FileSpreadsheet className="w-12 h-12 text-amber-500 mx-auto stroke-1" />
              <h3 className="text-xl font-bold text-slate-900">Distributor Bill CSV/XLSX Import</h3>
              <p className="text-sm text-slate-600">Upload your distributor invoice to map columns, verify schemes (10+1), and review stock inward before updating inventory.</p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-4 hover:border-amber-400 transition cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-medium text-slate-700">Click to upload or drag & drop distributor bill CSV</div>
              <input type="file" accept=".csv, .xlsx" className="hidden" />
              <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow">
                Select CSV File
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
