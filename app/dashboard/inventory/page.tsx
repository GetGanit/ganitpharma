'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Package, Search, Plus, ArrowLeft, ShieldCheck, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'import_stock'>('list');

  // Keyboard navigation & POS quick-add state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [quickQty, setQuickQty] = useState<number>(1);

  // Opening Stock Excel/CSV Import state
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    brand: '',
    salt_name: '',
    category: 'Allopathy',
    pack_size: '15s',
    units_per_pack: 15,
    gst_rate: 12,
    batch_number: '',
    expiry_date: '',
    mrp: 0,
    purchase_rate: 0,
    selling_rate: 0,
    stock_qty: 100,
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchInventory();
  }, [searchQuery]);

  // Global keyboard shortcuts for inventory table navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'list' || showAddModal) return;
      if (products.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const currentProd = products[selectedIndex];
        if (!currentProd) return;

        if (editingQtyId === currentProd.id) {
          // Second Enter: Add to POS cart
          addToPOSCart(currentProd, quickQty);
          setEditingQtyId(null);
        } else {
          // First Enter: Enable quick quantity edit/selection mode
          setEditingQtyId(currentProd.id);
          setQuickQty(1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, selectedIndex, editingQtyId, quickQty, viewMode, showAddModal]);

  async function fetchInventory() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;

    if (orgId) {
      let query = supabase
        .from('products')
        .select('*, product_batches(*)')
        .eq('organization_id', orgId);

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

  const addToPOSCart = (product: any, qty: number) => {
    const existingCart = JSON.parse(localStorage.getItem('ganit_pos_cart') || '[]');
    const batch = product.product_batches?.[0];
    if (!batch) {
      alert('No active batch found for this product.');
      return;
    }

    const cartItem = {
      product_id: product.id,
      product_name: product.product_name,
      batch_id: batch.id,
      batch_number: batch.batch_number,
      mrp: batch.mrp,
      selling_rate: batch.selling_rate,
      qty: qty,
      gst_rate: product.gst_rate
    };

    existingCart.push(cartItem);
    localStorage.setItem('ganit_pos_cart', JSON.stringify(existingCart));
    setSuccessMsg(`Added ${qty}x ${product.product_name} to POS cart!`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          setParsedData(jsonRows);
        } catch (err: any) {
          setError('Failed to parse Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(selectedFile);
    }
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

  const handleOpeningStockImport = async () => {
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
      setError('Pharmacy ID not found.');
      setImporting(false);
      return;
    }

    try {
      for (const rawRow of parsedData) {
        const row: any = {};
        Object.keys(rawRow).forEach(k => {
          const cleanKey = k.toLowerCase().replace(/[\s_]+/g, '');
          row[cleanKey] = rawRow[k];
        });

        const productName = row.productname || row.itemname || row.item || row.name;
        if (!productName) continue;

        const brand = row.brand || row.manufacturer || 'General';
        const saltName = row.saltname || row.salt || row.composition || '';
        const category = row.category || 'Allopathy';
        const packSize = row.packsize || row.pack || '15s';
        const unitsPerPack = Number(row.unitsperpack || row.packqty) || 15;
        const gstRate = Number(row.gstrate || row.gst) || 12;

        const { data: prodData } = await supabase
          .from('products')
          .insert([{
            organization_id: orgId,
            product_name: productName,
            brand: brand,
            salt_name: saltName,
            category: category,
            unit: 'tablet',
            pack_size: packSize,
            units_per_pack: unitsPerPack,
            gst_rate: gstRate
          }])
          .select('id')
          .single();

        let productId = prodData?.id;
        if (!productId) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('organization_id', orgId)
            .eq('product_name', productName)
            .single();
          if (existing) productId = existing.id;
        }

        if (productId) {
          const batchNumber = row.batchnumber || row.batch || row.batchno || 'OPEN01';
          const expiryDate = row.expirydate || row.expiry || row.exp || '2028-12-31';
          const mrp = Number(row.mrp) || 100;
          const purchaseRate = Number(row.purchaserate || row.cost || row.rate) || (mrp * 0.6);
          const sellingRate = Number(row.sellingrate || row.srp) || (mrp * 0.85);
          const openingQty = Number(row.stockqty || row.openingstock || row.quantity || row.qty) || 0;

          await supabase.from('product_batches').insert([{
            organization_id: orgId,
            product_id: productId,
            batch_number: batchNumber,
            expiry_date: expiryDate,
            mrp: mrp,
            purchase_rate: purchaseRate,
            selling_rate: sellingRate,
            stock_qty: openingQty
          }]);
        }
      }

      setSuccessMsg(`Successfully migrated opening stock for ${parsedData.length} items!`);
      setParsedData([]);
      setFile(null);
      setTimeout(() => {
        setViewMode('list');
        fetchInventory();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Opening stock migration failed.');
    }
    setImporting(false);
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const orgId = user.user_metadata?.organization_id;
    if (!orgId) return;

    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .insert([
        {
          organization_id: orgId,
          product_name: newProduct.product_name,
          brand: newProduct.brand,
          salt_name: newProduct.salt_name,
          category: newProduct.category,
          unit: 'tablet',
          pack_size: newProduct.pack_size,
          units_per_pack: Number(newProduct.units_per_pack),
          gst_rate: Number(newProduct.gst_rate),
        },
      ])
      .select()
      .single();

    if (prodError || !prodData) {
      alert('Error creating product: ' + prodError?.message);
      return;
    }

    const { error: batchError } = await supabase
      .from('product_batches')
      .insert([
        {
          organization_id: orgId,
          product_id: prodData.id,
          batch_number: newProduct.batch_number,
          expiry_date: newProduct.expiry_date,
          mrp: Number(newProduct.mrp),
          purchase_rate: Number(newProduct.purchase_rate),
          selling_rate: Number(newProduct.selling_rate),
          stock_qty: Number(newProduct.stock_qty),
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
        salt_name: '',
        category: 'Allopathy',
        pack_size: '15s',
        units_per_pack: 15,
        gst_rate: 12,
        batch_number: '',
        expiry_date: '',
        mrp: 0,
        purchase_rate: 0,
        selling_rate: 0,
        stock_qty: 100,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </a>
          <span className="text-lg font-bold text-slate-900">Inventory & Batch Management</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setParsedData([]); setViewMode('import_stock'); }}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-emerald-300 shadow-sm transition flex items-center gap-1.5"
          >
            <Database className="w-4 h-4 text-emerald-600" /> Import Opening Stock
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add New Medicine / Batch
          </button>
        </div>
      </header>

      {successMsg && (
        <div className="mx-8 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mx-8 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {viewMode === 'list' ? (
          <>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" /> Use <kbd className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-700">↑</kbd> <kbd className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-700">↓</kbd> to select, <kbd className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-700">Enter</kbd> twice to quick-add to POS
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-slate-500 text-sm">Loading inventory data securely...</div>
              ) : products.length === 0 ? (
                <div className="p-16 text-center text-slate-400 space-y-2">
                  <Package className="w-10 h-10 mx-auto stroke-1" />
                  <p className="text-sm font-medium">No products found in your pharmacy inventory.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-semibold">Product & Salt Name</th>
                      <th className="p-4 font-semibold">Brand / Manufacturer</th>
                      <th className="p-4 font-semibold">Pack Size</th>
                      <th className="p-4 font-semibold">GST %</th>
                      <th className="p-4 font-semibold">Batches & Expiry</th>
                      <th className="p-4 font-semibold">Total Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((prod, index) => {
                      const totalStock = prod.product_batches?.reduce((acc: number, b: any) => acc + (b.stock_qty || 0), 0) || 0;
                      const isSelected = index === selectedIndex;
                      const isEditing = editingQtyId === prod.id;

                      return (
                        <tr 
                          key={prod.id} 
                          onClick={() => setSelectedIndex(index)}
                          className={`transition cursor-pointer ${isSelected ? 'bg-amber-50/80 border-l-4 border-amber-500' : 'hover:bg-slate-50/50'}`}
                        >
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{prod.product_name}</div>
                            <div className="text-xs text-slate-500 font-medium">{prod.salt_name || 'No salt specified'}</div>
                          </td>
                          <td className="p-4 text-slate-600">{prod.brand || 'N/A'}</td>
                          <td className="p-4 text-slate-600">{prod.pack_size}</td>
                          <td className="p-4 text-slate-600">{prod.gst_rate}%</td>
                          <td className="p-4">
                            <div className="space-y-1">
                              {prod.product_batches?.map((batch: any) => (
                                <div key={batch.id} className="text-xs bg-slate-100 px-2 py-1 rounded flex items-center justify-between gap-4">
                                  <span className="font-semibold text-slate-800">Batch: {batch.batch_number}</span>
                                  <span className="text-slate-600">Exp: {batch.expiry_date}</span>
                                  <span className="font-bold text-amber-800">Qty: {batch.stock_qty}</span>
                                  <span className="text-slate-900">MRP: ₹{batch.mrp}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  autoFocus
                                  value={quickQty}
                                  onChange={(e) => setQuickQty(Number(e.target.value))}
                                  className="w-16 px-2 py-1 text-xs font-bold border border-amber-400 rounded-lg bg-white"
                                />
                                <span className="text-[10px] text-amber-700 font-bold">Press Enter</span>
                              </div>
                            ) : (
                              <span className="font-extrabold text-slate-900">{totalStock}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl border border-emerald-200 shadow-sm space-y-6 text-center max-w-3xl mx-auto">
            <button onClick={() => setViewMode('list')} className="text-xs font-bold text-slate-600 flex items-center gap-1 hover:text-slate-950">
              <ArrowLeft className="w-4 h-4" /> Back to Inventory
            </button>

            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl mx-auto flex items-center justify-center font-bold">
              <Database className="w-6 h-6 text-emerald-600" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-950">Migrate Existing Opening Stock</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Upload your store physical count spreadsheet with proper headers (Product Name, Salt Name, Brand, Batch, Expiry, MRP, Stock Qty). Columns can be in any order.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-8 cursor-pointer transition flex flex-col items-center justify-center space-y-3 bg-emerald-50/30"
            >
              <Database className="w-6 h-6 text-emerald-500" />
              <p className="text-xs font-bold text-slate-700">
                {file ? `Selected file: ${file.name}` : 'Click to upload current physical stock spreadsheet'}
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow transition"
              >
                Select Stock File (.xlsx, .xls, .csv)
              </button>
            </div>

            {parsedData.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900">Opening Stock Preview ({parsedData.length} items ready)</span>
                  <button
                    onClick={handleOpeningStockImport}
                    disabled={importing}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow transition disabled:opacity-50"
                  >
                    {importing ? 'Migrating Stock...' : 'Confirm & Initialize Opening Stock'}
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-emerald-50 text-emerald-800 sticky top-0 font-bold">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Salt Name</th>
                        <th className="p-3">Batch</th>
                        <th className="p-3">Expiry</th>
                        <th className="p-3">MRP</th>
                        <th className="p-3">Current Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {parsedData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{row.product_name || row['Product Name'] || row['Item Name'] || row['Item'] || row['Name']}</td>
                          <td className="p-3 text-slate-600">{row.salt_name || row['Salt Name'] || row['Salt'] || row['Composition']}</td>
                          <td className="p-3 font-mono text-slate-600">{row.batch_number || row['Batch'] || row['Batch No'] || row['BatchNumber']}</td>
                          <td className="p-3 text-slate-600">{row.expiry_date || row['Expiry'] || row['Exp'] || row['ExpiryDate']}</td>
                          <td className="p-3 font-semibold text-slate-900">₹{row.mrp || row['MRP']}</td>
                          <td className="p-3 font-bold text-emerald-700">{row.stock_qty || row['Opening Stock'] || row['Quantity'] || row['Qty']}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
                  <label className="block text-xs font-medium text-slate-700">Salt / Composition Name</label>
                  <input
                    type="text"
                    value={newProduct.salt_name}
                    onChange={(e) => setNewProduct({ ...newProduct, salt_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    placeholder="Paracetamol 650mg"
                  />
                </div>
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Pack Size</label>
                  <input
                    type="text"
                    required
                    value={newProduct.pack_size}
                    onChange={(e) => setNewProduct({ ...newProduct, pack_size: e.target.value })}
                    placeholder="15s"
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">GST %</label>
                  <input
                    type="number"
                    required
                    value={newProduct.gst_rate}
                    onChange={(e) => setNewProduct({ ...newProduct, gst_rate: Number(e.target.value) })}
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
                  <label className="block text-xs font-medium text-slate-700">Expiry Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
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
                    value={newProduct.stock_qty}
                    onChange={(e) => setNewProduct({ ...newProduct, stock_qty: Number(e.target.value) })}
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
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow"
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
