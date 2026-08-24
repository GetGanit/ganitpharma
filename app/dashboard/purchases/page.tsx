'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PurchasesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Handle file selection (from click or drag & drop)
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleImportInventory = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;
    if (!orgId) {
      setError('Tenant organization ID not found.');
      setLoading(false);
      return;
    }

    try {
      for (const row of parsedData) {
        // 1. Insert or get product
        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .insert([{
            organization_id: orgId,
            product_name: row.product_name,
            brand: row.brand,
            category: row.category,
            unit: row.unit,
            pack_size: row.pack_size,
            units_per_pack: Number(row.units_per_pack) || 15,
            gst_rate: Number(row.gst_rate) || 12
          }])
          .select('id')
          .single();

        let productId = prodData?.id;

        if (prodErr) {
          // If product already exists, fetch its ID
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('organization_id', orgId)
            .eq('product_name', row.product_name)
            .single();
          if (existing) productId = existing.id;
        }

        if (productId) {
          // 2. Insert batch stock
          await supabase.from('product_batches').insert([{
            organization_id: orgId,
            product_id: productId,
            batch_number: row.batch_number || 'BATCH001',
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
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV data.');
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-950">Purchases & Distributor Bill Import</h1>
        <p className="text-sm text-slate-500">Upload your distributor invoice to map columns, verify schemes, and update inventory.</p>
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

      {/* Upload Drop Zone Box */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-center">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl mx-auto flex items-center justify-center">
          <FileSpreadsheet className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-950">Distributor Bill CSV/XLSX Import</h3>
          <p className="text-xs text-slate-500 mt-1">Upload your distributor invoice to map columns, verify schemes (10+1), and review stock inward before updating inventory.</p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
          className="hidden"
        />

        {/* Drag & Drop Target Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-2xl p-8 cursor-pointer transition flex flex-col items-center justify-center space-y-3 bg-slate-50/50"
        >
          <Upload className="w-6 h-6 text-slate-400" />
          <p className="text-xs font-semibold text-slate-700">
            {file ? `Selected file: ${file.name}` : 'Click to upload or drag & drop distributor bill CSV'}
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
                onClick={handleImportInventory}
                disabled={loading}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow transition disabled:opacity-50"
              >
                {loading ? 'Importing into Inventory...' : 'Confirm & Import to Inventory'}
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
    </div>
  );
}
