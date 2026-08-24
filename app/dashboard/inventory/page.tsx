'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Package, Search, Plus, AlertTriangle, Calendar, ArrowLeft, Layers, ShieldCheck } from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New product / batch form state
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    brand: '',
    product_code: '',
    pack_size: 10,
    gst_percentage: 12,
    batch_number: '',
    expiry_date: '',
    mrp: 0,
    purchase_rate: 0,
    selling_rate: 0,
    current_quantity: 100,
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchInventory();
  }, [searchQuery]);

  async function fetchInventory() {
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
      let query = supabase
        .from('products')
        .select('*, product_batches(*)')
        .eq('organization_id', profile.organization_id);

      if (searchQuery) {
        query = query.ilike('product_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        setProducts(data);
      }
    }
    setLoading(false);
  }

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) return;

    // 1. Insert into products
    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .insert([
        {
          organization_id: profile.organization_id,
          product_name: newProduct.product_name,
          brand: newProduct.brand,
          product_code: newProduct.product_code,
          pack_size: Number(newProduct.pack_size),
          gst_percentage: Number(newProduct.gst_percentage),
        },
      ])
      .select()
      .single();

    if (prodError || !prodData) {
      alert('Error creating product: ' + prodError?.message);
      return;
    }

    // 2. Insert initial batch
    const { error: batchError } = await supabase
      .from('product_batches')
      .insert([
        {
          organization_id: profile.organization_id,
          product_id: prodData.id,
          batch_number: newProduct.batch_number,
          expiry_date: newProduct.expiry_date,
          mrp: Number(newProduct.mrp),
          purchase_rate: Number(newProduct.purchase_rate),
          selling_rate: Number(newProduct.selling_rate),
          current_quantity: Number(newProduct.current_quantity),
        },
      ]);

    if (batchError) {
      alert('Error creating batch: ' + batchError.message);
    } else {
      setShowAddModal(false);
      fetchInventory();
      setNewProduct({
        product_name: '',
        brand: '',
        product_code: '',
        pack_size: 10,
        gst_percentage: 12,
        batch_number: '',
        expiry_date: '',
        mrp: 0,
        purchase_rate: 0,
        selling_rate: 0,
        current_quantity: 100,
      });
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
          <span className="text-lg font-bold text-slate-900">Inventory & Batch Management</span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add New Medicine / Batch
        </button>
      </header>

      {/* Main Body */}
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-yellow focus:outline-none"
            />
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-600" /> FEFO (First Expiry, First Out) Active
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading inventory data securely...</div>
          ) : products.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <Package className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-sm font-medium">No products found in your tenant inventory.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold">Product Name</th>
                  <th className="p-4 font-semibold">Brand</th>
                  <th className="p-4 font-semibold">Pack Size</th>
                  <th className="p-4 font-semibold">GST %</th>
                  <th className="p-4 font-semibold">Batches & Expiry</th>
                  <th className="p-4 font-semibold">Total Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => {
                  const totalStock = prod.product_batches?.reduce((acc: number, b: any) => acc + (b.current_quantity || 0), 0) || 0;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-900">{prod.product_name}</td>
                      <td className="p-4 text-slate-600">{prod.brand || 'N/A'}</td>
                      <td className="p-4 text-slate-600">{prod.pack_size} units</td>
                      <td className="p-4 text-slate-600">{prod.gst_percentage}%</td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {prod.product_batches?.map((batch: any) => (
                            <div key={batch.id} className="text-xs bg-slate-100 px-2 py-1 rounded flex items-center justify-between gap-4">
                              <span className="font-semibold text-slate-800">Batch: {batch.batch_number}</span>
                              <span className="text-slate-600">Exp: {batch.expiry_date}</span>
                              <span className="font-bold text-amber-800">Qty: {batch.current_quantity}</span>
                              <span className="text-slate-900">MRP: ₹{batch.mrp}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">{totalStock}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Medicine & Initial Batch</h3>
            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    placeholder="Dolo 650"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Brand / Manufacturer</label>
                  <input
                    type="text"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    placeholder="Micro Labs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Pack Size</label>
                  <input
                    type="number"
                    required
                    value={newProduct.pack_size}
                    onChange={(e) => setNewProduct({ ...newProduct, pack_size: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">GST %</label>
                  <input
                    type="number"
                    required
                    value={newProduct.gst_percentage}
                    onChange={(e) => setNewProduct({ ...newProduct, gst_percentage: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Batch Number</label>
                  <input
                    type="text"
                    required
                    value={newProduct.batch_number}
                    onChange={(e) => setNewProduct({ ...newProduct, batch_number: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    placeholder="B2401"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Expiry Date (YYYY-MM)</label>
                  <input
                    type="text"
                    required
                    placeholder="2028-12"
                    value={newProduct.expiry_date}
                    onChange={(e) => setNewProduct({ ...newProduct, expiry_date: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Initial Quantity</label>
                  <input
                    type="number"
                    required
                    value={newProduct.current_quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, current_quantity: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.purchase_rate}
                    onChange={(e) => setNewProduct({ ...newProduct, purchase_rate: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Selling Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.selling_rate}
                    onChange={(e) => setNewProduct({ ...newProduct, selling_rate: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.mrp}
                    onChange={(e) => setNewProduct({ ...newProduct, mrp: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 font-bold rounded-xl text-sm shadow"
                >
                  Save Product & Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
