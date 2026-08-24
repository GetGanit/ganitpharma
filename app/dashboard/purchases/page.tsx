'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Truck, Plus, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, Trash2, Building2 } from 'lucide-react';

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

  // New PO Form State
  const [poVendorId, setPoVendorId] = useState('');
  const [poItemName, setPoItemName] = useState('');
  const [poQty, setPoQty] = useState(50);
  const [poValue, setPoValue] = useState(2500);

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

  const handleCreatePO = async () => {
    if (!poItemName) {
      alert('Please enter item name.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = user.user_metadata?.organization_id;
    if (!orgId) return;

    const selectedVendor = vendorsList.find(v => v.id === poVendorId);
    const poNumber = `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100+Math.random()*900)}`;

    const { error: poErr } = await supabase.from('purchase_orders').insert([{
      organization_id: orgId,
      po_number: poNumber,
      vendor_id: poVendorId || null,
      vendor_name: selectedVendor?.vendor_name || 'Direct Vendor',
      item_summary: poItemName,
      total_value: poValue,
      status: 'Received'
    }]);

    if (poErr) {
      alert('Error creating purchase order: ' + poErr.message);
      return;
    }

    alert('Purchase Order created & received successfully!');
    setPoItemName('');
    setViewMode('list');
    fetchPurchasesData();
  };

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">Purchases</h1>
          <p className="text-sm text-slate-500">Receiving a purchase order creates the batches automatically, so stock is sellable at once.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('import')}
            className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 shadow-sm transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-500" /> Import distributor invoice
          </button>
          <button
            onClick={() => setViewMode('new_vendor')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4" /> Add Vendor
          </button>
          <button
            onClick={() => setViewMode('new_po')}
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New purchase order
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Purchase Orders Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-950 text-sm">Purchase orders</h3>
            {loading ? (
              <div className="text-center py-8 text-slate-400 text-xs">Loading purchase orders...</div>
            ) : purchaseOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">No purchase orders found. Click "+ New purchase order" to create one.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="pb-3 font-semibold">PO Number</th>
                    <th className="pb-3 font-semibold">Vendor</th>
                    <th className="pb-3 font-semibold">Item Summary</th>
                    <th className="pb-3 font-semibold">Value</th>
                    <th className="pb-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseOrders.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-bold text-slate-900">{p.po_number}</td>
                      <td className="py-3 text-slate-600">{p.vendor_name}</td>
                      <td className="py-3 text-slate-600">{p.item_summary}</td>
                      <td className="py-3 font-extrabold text-slate-900">₹{Number(p.total_value).toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold text-[10px]">
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 h-fit">
            <h3 className="font-bold text-slate-950 text-sm">Registered Vendors</h3>
            {vendorsList.length === 0 ? (
              <p className="text-xs text-slate-400">No vendors found.</p>
            ) : (
              <div className="space-y-3">
                {vendorsList.map(v => (
                  <div key={v.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900 text-xs block">{v.vendor_name}</strong>
                      <div className="text-[11px] text-slate-500 space-x-2">
                        <span>{v.phone}</span>
                        <span className="font-mono">{v.gstin}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVendor(v.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg transition"
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
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-center">
          <button onClick={() => setViewMode('list')} className="text-xs font-bold text-slate-600 flex items-center gap-1 hover:text-slate-950">
            <ArrowLeft className="w-4 h-4" /> Back to Purchases
          </button>

          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl mx-auto flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-950">Distributor Bill CSV/XLSX Import</h3>
            <p className="text-xs text-slate-500 mt-1">Upload your distributor invoice to map columns, verify schemes (10+1), and review stock inward before updating inventory.</p>
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
            <p className="text-xs font-semibold text-slate-700">
              {file ? `Selected file: ${file.name}` : 'Click to upload or select distributor bill CSV'}
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow transition"
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
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow transition disabled:opacity-50"
                >
                  {importing ? 'Importing into Inventory...' : 'Confirm & Import to Inventory'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5">Brand</th>
                      <th className="p-2.5">Batch</th>
                      <th className="p-2.5">Expiry</th>
                      <th className="p-2.5">MRP</th>
                      <th className="p-2.5">Stock Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{row.product_name}</td>
                        <td className="p-2.5 text-slate-600">{row.brand}</td>
                        <td className="p-2.5 font-mono text-slate-600">{row.batch_number}</td>
                        <td className="p-2.5 text-slate-600">{row.expiry_date}</td>
                        <td className="p-2.5 font-semibold text-slate-900">₹{row.mrp}</td>
                        <td className="p-2.5 font-bold text-amber-700">{row.stock_qty}</td>
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
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-xl mx-auto">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-slate-950 text-base">Add New Vendor</h3>
            <button onClick={() => setViewMode('list')} className="text-xs text-slate-500 font-bold">✕ Close</button>
          </div>
          <form onSubmit={handleCreateVendor} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Vendor Name</label>
              <input type="text" placeholder="e.g. Apollo Distributors" value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} required className="w-full p-2.5 border rounded-xl font-medium" />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Phone Number</label>
              <input type="text" placeholder="e.g. +91 98765 43210" value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} className="w-full p-2.5 border rounded-xl font-medium" />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">GSTIN</label>
              <input type="text" placeholder="e.g. 29AAAAA0000A1Z5" value={newVendorGstin} onChange={(e) => setNewVendorGstin(e.target.value)} className="w-full p-2.5 border rounded-xl font-medium" />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition"
            >
              Save Vendor
            </button>
          </form>
        </div>
      )}

      {viewMode === 'new_po' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-xl mx-auto">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-slate-950 text-base">Create New Purchase Order</h3>
            <button onClick={() => setViewMode('list')} className="text-xs text-slate-500 font-bold">✕ Close</button>
          </div>
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Select Vendor</label>
              <select value={poVendorId} onChange={(e) => setPoVendorId(e.target.value)} className="w-full p-2.5 border rounded-xl font-medium">
                {vendorsList.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Item Summary / Medicine Name</label>
              <input type="text" placeholder="e.g. Paracetamol 650mg & Stock Bundle" value={poItemName} onChange={(e) => setPoItemName(e.target.value)} className="w-full p-2.5 border rounded-xl font-medium" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Quantity</label>
                <input type="number" value={poQty} onChange={(e) => setPoQty(Number(e.target.value))} className="w-full p-2.5 border rounded-xl font-medium" />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Total Value (₹)</label>
                <input type="number" value={poValue} onChange={(e) => setPoValue(Number(e.target.value))} className="w-full p-2.5 border rounded-xl font-medium" />
              </div>
            </div>
            <button
              onClick={handleCreatePO}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow transition"
            >
              Submit & Receive Purchase Order
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
