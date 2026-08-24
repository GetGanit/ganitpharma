'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Truck, Plus, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, Trash2, Building2 } from 'lucide-react';

interface POItem {
  item_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  free_qty: number;
  scheme: string;
  cost: number;
  gst_percent: number;
}

export default function PurchasesPage() {
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  
  const [viewMode, setViewMode] = useState<'list' | 'import' | 'new_po' | 'new_vendor'>('list');
  
  // CSV Import State
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New PO State matching reference UI
  const [poVendorId, setPoVendorId] = useState('');
  const [poItems, setPoItems] = useState<POItem[]>([
    { item_name: '', batch_number: '', expiry_date: '', quantity: 1, free_qty: 0, scheme: '', cost: 0, gst_percent: 12 }
  ]);
  const [receiveIntoStock, setReceiveIntoStock] = useState(false);

  // New Vendor Form State
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorGstin, setNewVendorGstin] = useState('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchPurchasesData();
  }, []);

  async function fetchPurchasesData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;
    if (orgId) {
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (poData) setPurchaseOrders(poData);

      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', orgId);

      if (vendorData) {
        setVendorsList(vendorData);
        if (vendorData.length > 0) setPoVendorId(vendorData[0].id);
      }
    }
    setLoading(false);
  }

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    const { error: delErr } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendorId);

    if (delErr) {
      alert('Failed to delete vendor: ' + delErr.message);
      return;
    }

    setVendorsList(vendorsList.filter(v => v.id !== vendorId));
    setSuccessMsg('Vendor deleted successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = user.user_metadata?.organization_id;
    if (!orgId) return;

    const { error: insErr } = await supabase.from('vendors').insert([{
      organization_id: orgId,
      vendor_name: newVendorName,
      phone: newVendorPhone,
      gstin: newVendorGstin
    }]);

    if (insErr) {
      alert('Error adding vendor: ' + insErr.message);
      return;
    }

    setNewVendorName('');
    setNewVendorPhone('');
    setNewVendorGstin('');
    setSuccessMsg('Vendor added successfully!');
    setViewMode('list');
    fetchPurchasesData();
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(selectedFile);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      setError('CSV file is empty or invalid.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(val => val.trim());
      let obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });

    setParsedData(rows);
  };

  const handleBulkImport = async () => {
    if (parsedData.length === 0) return;
    setImporting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;
    if (!orgId) {
      setError('Organization ID not found.');
      setImporting(false);
      return;
    }

    try {
      for (const row of parsedData) {
        const { data: prodData } = await supabase
          .from('products')
          .insert([{
            organization_id: orgId,
            product_name: row.product_name,
            brand: row.brand || 'General',
            category: row.category || 'Allopathy',
            unit: row.unit || 'tablet',
            pack_size: row.pack_size || '15s',
            units_per_pack: Number(row.units_per_pack) || 15,
            gst_rate: Number(row.gst_rate) || 12
          }])
          .select('id')
          .single();

        let productId = prodData?.id;
        if (!productId) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('organization_id', orgId)
            .eq('product_name', row.product_name)
            .single();
          if (existing) productId = existing.id;
        }

        if (productId) {
          await supabase.from('product_batches').insert([{
            organization_id: orgId,
            product_id: productId,
            batch_number: row.batch_number || 'BATCH01',
            expiry_date: row.expiry_date || '2028-12-31',
            mrp: Number(row.mrp) || 100,
            purchase_rate: Number(row.purchase_rate) || 50,
            selling_rate: Number(row.selling_rate) || 80,
            stock_qty: Number(row.stock_qty) || 100
          }]);
        }
      }

      setSuccessMsg(`Successfully imported ${parsedData.length} SKUs into inventory!`);
      setParsedData([]);
      setFile(null);
      setTimeout(() => setViewMode('list'), 2000);
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    }
    setImporting(false);
  };

  const handleAddPOItemRow = () => {
    setPoItems([...poItems, { item_name: '', batch_number: '', expiry_date: '', quantity: 1, free_qty: 0, scheme: '', cost: 0, gst_percent: 12 }]);
  };

  const handleRemovePOItemRow = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handlePOItemChange = (index: number, field: keyof POItem, value: any) => {
    const updated = [...poItems];
    updated[index] = { ...updated[index], [field]: value };
    setPoItems(updated);
  };

  const calculatedOrderValue = poItems.reduce((acc, curr) => acc + (Number(curr.cost || 0) * Number(curr.quantity || 0)), 0);

  const handleCreatePO = async () => {
    if (poItems.length === 0 || !poItems[0].item_name) {
      alert('Please add at least one item.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = user.user_metadata?.organization_id;
    if (!orgId) return;

    const selectedVendor = vendorsList.find(v => v.id === poVendorId);
    const poNumber = `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100+Math.random()*900)}`;
    const itemSummary = poItems.map(i => `${i.item_name} (${i.quantity} qty)`).join(', ');

    const { data: poData, error: poErr } = await supabase.from('purchase_orders').insert([{
      organization_id: orgId,
      po_number: poNumber,
      vendor_id: poVendorId || null,
      vendor_name: selectedVendor?.vendor_name || 'Direct Vendor',
      item_summary: itemSummary,
      total_value: calculatedOrderValue,
      status: receiveIntoStock ? 'Received' : 'Pending'
    }]).select('id').single();

    if (poErr || !poData) {
      alert('Error creating purchase order: ' + poErr?.message);
      return;
    }

    // If "Receive into stock now" is checked, insert products and batches immediately
    if (receiveIntoStock) {
      for (const item of poItems) {
        const { data: prodData } = await supabase
          .from('products')
          .insert([{
            organization_id: orgId,
            product_name: item.item_name,
            brand: selectedVendor?.vendor_name || 'General',
            category: 'Allopathy',
            unit: 'tablet',
            pack_size: '15s',
            units_per_pack: 15,
            gst_rate: Number(item.gst_percent) || 12
          }])
          .select('id')
          .single();

        let productId = prodData?.id;
        if (!productId) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('organization_id', orgId)
            .eq('product_name', item.item_name)
            .single();
          if (existing) productId = existing.id;
        }

        if (productId) {
          await supabase.from('product_batches').insert([{
            organization_id: orgId,
            product_id: productId,
            batch_number: item.batch_number || 'BATCH01',
            expiry_date: item.expiry_date || '2028-12-31',
            mrp: Number(item.cost) * 1.3 || 100,
            purchase_rate: Number(item.cost) || 50,
            selling_rate: Number(item.cost) * 1.2 || 80,
            stock_qty: Number(item.quantity) + Number(item.free_qty || 0)
          }]);
        }
      }
    }

    alert('Purchase Order created successfully!');
    setPoItems([{ item_name: '', batch_number: '', expiry_date: '', quantity: 1, free_qty: 0, scheme: '', cost: 0, gst_percent: 12 }]);
    setViewMode('list');
    fetchPurchasesData();
  };

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6 bg-hero-gradient min-h-screen">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Purchases</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Receiving a purchase order creates the batches automatically, so stock is sellable at once.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('import')}
            className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-2xl border border-slate-300 shadow-sm transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-500" /> Import distributor invoice
          </button>
          <button
            onClick={() => setViewMode('new_vendor')}
            className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-sm transition flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4" /> Add Vendor
          </button>
          <button
            onClick={() => setViewMode('new_po')}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-5 py-2.5 rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New purchase order
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Purchase Orders Table */}
          <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-black text-slate-950 text-sm uppercase tracking-wider">Purchase orders</h3>
            {loading ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">Loading purchase orders...</div>
            ) : purchaseOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">No purchase orders found. Click "+ New purchase order" to create one.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase border-b border-slate-100 font-bold">
                  <tr>
                    <th className="pb-3">PO Number</th>
                    <th className="pb-3">Vendor</th>
                    <th className="pb-3">Item Summary</th>
                    <th className="pb-3">Value</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {purchaseOrders.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-bold text-slate-950">{p.po_number}</td>
                      <td className="py-3 text-slate-600">{p.vendor_name}</td>
                      <td className="py-3 text-slate-600">{p.item_summary}</td>
                      <td className="py-3 font-black text-slate-950">₹{Number(p.total_value).toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase ${p.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Vendors Card with Delete Option */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4 h-fit">
            <h3 className="font-black text-slate-950 text-sm uppercase tracking-wider">Registered Vendors</h3>
            {vendorsList.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No vendors found.</p>
            ) : (
              <div className="space-y-3">
                {vendorsList.map(v => (
                  <div key={v.id} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                    <div>
                      <strong className="text-slate-950 text-xs block font-bold">{v.vendor_name}</strong>
                      <div className="text-[11px] text-slate-500 space-x-2 font-mono mt-0.5">
                        <span>{v.phone}</span>
                        <span>{v.gstin}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVendor(v.id)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-xl transition hover:bg-red-50"
                      title="Delete Vendor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {viewMode === 'import' && (
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6 text-center max-w-3xl mx-auto">
          <button onClick={() => setViewMode('list')} className="text-xs font-bold text-slate-600 flex items-center gap-1 hover:text-slate-950">
            <ArrowLeft className="w-4 h-4" /> Back to Purchases
          </button>

          <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl mx-auto flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-950">Distributor Bill CSV/XLSX Import</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Upload your distributor invoice to map columns, verify schemes (10+1), and review stock inward before updating inventory.</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-2xl p-8 cursor-pointer transition flex flex-col items-center justify-center space-y-3 bg-slate-50/50"
          >
            <Truck className="w-6 h-6 text-slate-400" />
            <p className="text-xs font-bold text-slate-700">
              {file ? `Selected file: ${file.name}` : 'Click to upload or select distributor bill CSV'}
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow transition"
            >
              Select CSV File
            </button>
          </div>

          {parsedData.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100 text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900">Parsed Preview ({parsedData.length} items ready)</span>
                <button
                  onClick={handleBulkImport}
                  disabled={importing}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow transition disabled:opacity-50"
                >
                  {importing ? 'Importing into Inventory...' : 'Confirm & Import to Inventory'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 font-bold">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Brand</th>
                      <th className="p-3">Batch</th>
                      <th className="p-3">Expiry</th>
                      <th className="p-3">MRP</th>
                      <th className="p-3">Stock Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{row.product_name}</td>
                        <td className="p-3 text-slate-600">{row.brand}</td>
                        <td className="p-3 font-mono text-slate-600">{row.batch_number}</td>
                        <td className="p-3 text-slate-600">{row.expiry_date}</td>
                        <td className="p-3 font-semibold text-slate-900">₹{row.mrp}</td>
                        <td className="p-3 font-bold text-amber-700">{row.stock_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'new_vendor' && (
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6 max-w-xl mx-auto">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-black text-slate-950 text-base">Add New Vendor</h3>
            <button onClick={() => setViewMode('list')} className="text-xs text-slate-500 font-bold">✕ Close</button>
          </div>
          <form onSubmit={handleCreateVendor} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-600 mb-1">Vendor Name</label>
              <input type="text" placeholder="e.g. Apollo Distributors" value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} required className="w-full p-3 border rounded-2xl font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Phone Number</label>
              <input type="text" placeholder="e.g. +91 98765 43210" value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} className="w-full p-3 border rounded-2xl font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">GSTIN</label>
              <input type="text" placeholder="e.g. 29AAAAA0000A1Z5" value={newVendorGstin} onChange={(e) => setNewVendorGstin(e.target.value)} className="w-full p-3 border rounded-2xl font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white font-black rounded-2xl shadow transition text-xs"
            >
              Save Vendor
            </button>
          </form>
        </div>
      )}

      {/* New Purchase Order Modal Matching Reference Design */}
      {viewMode === 'new_po' && (
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6 max-w-4xl mx-auto">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="font-black text-slate-950 text-lg">New purchase order</h3>
              <p className="text-xs text-slate-500 font-medium">Batch and expiry are used when you receive the goods.</p>
            </div>
            <button onClick={() => setViewMode('list')} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
          </div>

          <div className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-600 mb-1.5">Vendor</label>
              <select value={poVendorId} onChange={(e) => setPoVendorId(e.target.value)} className="w-full md:w-80 p-3 border rounded-2xl font-medium bg-slate-50 focus:ring-2 focus:ring-amber-400 focus:outline-none">
                {vendorsList.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
              </select>
            </div>

            {/* PO Line Items Grid matching reference */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <div className="grid grid-cols-12 gap-2 text-slate-500 font-bold uppercase text-[10px]">
                <div className="col-span-3">Item</div>
                <div className="col-span-2">Batch</div>
                <div className="col-span-2">Expiry</div>
                <div className="col-span-1">Qty</div>
                <div className="col-span-1">Free</div>
                <div className="col-span-1">Scheme</div>
                <div className="col-span-1">Cost ₹</div>
                <div className="col-span-1 text-right">GST %</div>
              </div>

              {poItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <input type="text" placeholder="Item name..." value={item.item_name} onChange={(e) => handlePOItemChange(idx, 'item_name', e.target.value)} className="w-full p-2.5 border rounded-xl font-medium bg-white" />
                  </div>
                  <div className="col-span-2">
                    <input type="text" placeholder="Batch no" value={item.batch_number} onChange={(e) => handlePOItemChange(idx, 'batch_number', e.target.value)} className="w-full p-2.5 border rounded-xl font-medium bg-white" />
                  </div>
                  <div className="col-span-2">
                    <input type="text" placeholder="YYYY-MM-DD" value={item.expiry_date} onChange={(e) => handlePOItemChange(idx, 'expiry_date', e.target.value)} className="w-full p-2.5 border rounded-xl font-medium bg-white" />
                  </div>
                  <div className="col-span-1">
                    <input type="number" value={item.quantity} onChange={(e) => handlePOItemChange(idx, 'quantity', Number(e.target.value))} className="w-full p-2.5 border rounded-xl font-medium bg-white" />
                  </div>
                  <div className="col-span-1">
                    <input type="number" value={item.free_qty} onChange={(e) => handlePOItemChange(idx, 'free_qty', Number(e.target.value))} className="w-full p-2.5 border rounded-xl font-medium bg-white" />
                  </div>
                  <div className="col-span-1">
                    <input type="text" placeholder="10+1" value={item.scheme} onChange={(e) => handlePOItemChange(idx, 'scheme', e.target.value)} className="w-full p-2.5 border rounded-xl font-medium bg-white" />
                  </div>
                  <div className="col-span-1">
                    <input type="number" value={item.cost} onChange={(e) => handlePOItemChange(idx, 'cost', Number(e.target.value))} className="w-full p-2.5 border rounded-xl font-medium bg-white" />
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    <select value={item.gst_percent} onChange={(e) => handlePOItemChange(idx, 'gst_percent', Number(e.target.value))} className="p-2.5 border rounded-xl font-medium bg-white">
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                    </select>
                    {poItems.length > 1 && (
                      <button onClick={() => handleRemovePOItemRow(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button onClick={handleAddPOItemRow} className="mt-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm">
                <Plus className="w-3.5 h-3.5 text-amber-600" /> Add line
              </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t gap-4">
              <div className="text-sm font-black text-slate-950">
                Order value <span className="text-amber-600">₹{calculatedOrderValue.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input type="checkbox" checked={receiveIntoStock} onChange={(e) => setReceiveIntoStock(e.target.checked)} className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400" />
                  Receive into stock now
                </label>
                <button
                  onClick={handleCreatePO}
                  className="px-6 py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 transition text-xs"
                >
                  Create order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
