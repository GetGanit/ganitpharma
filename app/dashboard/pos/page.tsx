'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Sidebar from '@/components/Sidebar';
import { 
  Receipt, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

interface CartItem {
  id: string;
  product_name: string;
  batch_number: string;
  selling_price: number;
  mrp: number;
  gst_percentage: number;
  quantity: number | string;
  pack_size: number;
  available_qty: number;
  discount_percent: number;
}

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Metadata & Overall Discount
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDOB, setCustomerDOB] = useState('');
  const [doctorName, setDoctorName] = useState('15-OTHERS');
  const [salesOrigin, setSalesOrigin] = useState('Regular sales');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);

  // Active Split Payment Inputs
  const [splitCash, setSplitCash] = useState<number | string>(0);
  const [splitUpi, setSplitUpi] = useState<number | string>(0);
  const [splitCard, setSplitCard] = useState<number | string>(0);

  // Parked Transactions
  const [parkedTransactions, setParkedTransactions] = useState<any[]>([]);
  const [showParkedModal, setShowParkedModal] = useState(false);

  // Modals
  const [showJournalsModal, setShowJournalsModal] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [discountModalIndex, setDiscountModalIndex] = useState<number | null>(null);
  const [itemDiscountInput, setItemDiscountInput] = useState<number>(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F1') {
        e.preventDefault();
        fetchJournals();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Customer Lookup
  useEffect(() => {
    async function lookupCustomer() {
      if (customerPhone.length < 10) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = user.user_metadata?.organization_id;

      if (orgId) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', orgId)
          .eq('phone', customerPhone)
          .single();

        if (data) {
          setCustomerName(data.customer_name || '');
        }
      }
    }
    const timer = setTimeout(lookupCustomer, 400);
    return () => clearTimeout(timer);
  }, [customerPhone, supabase]);

  // Search Products
  useEffect(() => {
    async function searchProducts() {
      if (!searchQuery.trim()) {
        setProducts([]);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const orgId = user.user_metadata?.organization_id;
      if (orgId) {
        const { data } = await supabase
          .from('products')
          .select('*, product_batches(*)')
          .eq('organization_id', orgId)
          .ilike('product_name', `%${searchQuery}%`)
          .limit(5);

        setProducts(data || []);
      }
    }
    const timer = setTimeout(searchProducts, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, supabase]);

  async function fetchJournals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = user.user_metadata?.organization_id;

    if (orgId) {
      const { data } = await supabase
        .from('sales')
        .select('*, sale_items(*), customers(customer_name, phone)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setRecentInvoices(data);
        setShowJournalsModal(true);
      }
    }
  }

  const addToCart = (product: any, batch: any) => {
    const existingIndex = cart.findIndex(item => item.id === product.id && item.batch_number === batch.batch_number);
    const packSize = product.units_per_pack || 15;
    const sellingPrice = batch.selling_rate || 100;
    const availableQty = batch.stock_qty || 0;

    if (existingIndex > -1) {
      const updated = [...cart];
      const currentQtyNum = Number(updated[existingIndex].quantity) || 0;
      if (currentQtyNum + 1 > availableQty) {
        alert(`Stock limit reached! Only ${availableQty} units available.`);
        return;
      }
      updated[existingIndex].quantity = currentQtyNum + 1;
      setCart(updated);
    } else {
      if (availableQty <= 0) {
        alert(`Batch ${batch.batch_number} is out of stock!`);
        return;
      }
      setCart([
        ...cart,
        {
          id: product.id,
          product_name: product.product_name,
          batch_number: batch.batch_number || 'DEFAULT',
          selling_price: sellingPrice,
          mrp: batch.mrp || sellingPrice,
          gst_percentage: product.gst_rate || 12,
          quantity: 1,
          pack_size: packSize,
          available_qty: availableQty,
          discount_percent: 0,
        },
      ]);
    }
    setSearchQuery('');
    setProducts([]);
    searchInputRef.current?.focus();
  };

  const handleQuantityChange = (index: number, val: string) => {
    const updated = [...cart];
    updated[index].quantity = val;
    setCart(updated);
  };

  const handleQuantityBlur = (index: number) => {
    const updated = [...cart];
    let qtyNum = parseInt(String(updated[index].quantity)) || 1;
    if (qtyNum > updated[index].available_qty) {
      alert(`Insufficient stock! Max available is ${updated[index].available_qty}.`);
      qtyNum = updated[index].available_qty;
    }
    if (qtyNum < 1) qtyNum = 1;
    updated[index].quantity = qtyNum;
    setCart(updated);
  };

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearAllCart = () => {
    if (confirm('Are you sure you want to clear the current billing cart?')) {
      setCart([]);
      setCustomerPhone('');
      setCustomerName('');
      setCustomerDOB('');
      setOverallDiscount(0);
      setSplitCash(0);
      setSplitUpi(0);
      setSplitCard(0);
    }
  };

  const parkTransaction = () => {
    if (cart.length === 0) {
      alert('Cart is empty. Nothing to park.');
      return;
    }
    const parkedObj = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      customerPhone,
      customerName,
      cart,
      overallDiscount
    };
    setParkedTransactions([...parkedTransactions, parkedObj]);
    setCart([]);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerDOB('');
    setOverallDiscount(0);
    alert('Transaction successfully parked!');
  };

  const resumeParkedTransaction = (parked: any) => {
    setCart(parked.cart);
    setCustomerPhone(parked.customerPhone || '');
    setCustomerName(parked.customerName || '');
    setOverallDiscount(parked.overallDiscount || 0);
    setParkedTransactions(parkedTransactions.filter(p => p.id !== parked.id));
    setShowParkedModal(false);
  };

  const applyItemDiscount = () => {
    if (discountModalIndex !== null) {
      const updated = [...cart];
      updated[discountModalIndex].discount_percent = Number(itemDiscountInput) || 0;
      setCart(updated);
      setDiscountModalIndex(null);
      setItemDiscountInput(0);
    }
  };

  // Financial Calculations
  const rawSubtotal = cart.reduce((acc, item) => {
    const qtyNum = Number(item.quantity) || 0;
    const perUnitPrice = item.selling_price / item.pack_size;
    const gross = perUnitPrice * qtyNum;
    const disc = gross * ((item.discount_percent || 0) / 100);
    return acc + (gross - disc);
  }, 0);

  const overallDiscVal = rawSubtotal * (overallDiscount / 100);
  const subtotal = rawSubtotal - overallDiscVal;

  const totalGST = cart.reduce((acc, item) => {
    const qtyNum = Number(item.quantity) || 0;
    const perUnitPrice = item.selling_price / item.pack_size;
    const gross = perUnitPrice * qtyNum;
    const disc = gross * ((item.discount_percent || 0) / 100);
    let netItemTotal = gross - disc;
    if (rawSubtotal > 0) {
      netItemTotal -= netItemTotal * (overallDiscount / 100);
    }
    return acc + (netItemTotal * item.gst_percentage) / (100 + item.gst_percentage);
  }, 0);

  const finalTotal = subtotal;
  const totalPaidSplit = (Number(splitCash) || 0) + (Number(splitUpi) || 0) + (Number(splitCard) || 0);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (Math.abs(totalPaidSplit - finalTotal) > 1) {
      alert(`Split payment total (₹${totalPaidSplit}) must match Final Payable (₹${finalTotal.toFixed(2)})!`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

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

    let customerId = null;
    if (customerPhone) {
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id')
        .eq('organization_id', orgId)
        .eq('phone', customerPhone)
        .single();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const { data: newCust } = await supabase
          .from('customers')
          .insert([{ organization_id: orgId, customer_name: customerName || 'Retail Customer', phone: customerPhone }])
          .select('id')
          .single();
        if (newCust) customerId = newCust.id;
      }
    }

    const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([{
        organization_id: orgId,
        invoice_number: invoiceNumber,
        customer_id: customerId,
        subtotal: subtotal,
        gst_total: totalGST,
        final_amount: finalTotal,
        payment_status: 'Paid'
      }])
      .select('id')
      .single();

    if (saleError || !saleData) {
      setError(saleError?.message || 'Failed to create sale.');
      setLoading(false);
      return;
    }

    for (const item of cart) {
      const qtyNum = Number(item.quantity) || 1;
      const perUnitPrice = item.selling_price / item.pack_size;
      const gross = perUnitPrice * qtyNum;
      const disc = gross * ((item.discount_percent || 0) / 100);
      let itemFinalTotal = gross - disc;
      if (rawSubtotal > 0) {
        itemFinalTotal -= itemFinalTotal * (overallDiscount / 100);
      }
      
      const { data: batchData } = await supabase
        .from('product_batches')
        .select('id, stock_qty')
        .eq('organization_id', orgId)
        .eq('product_id', item.id)
        .eq('batch_number', item.batch_number)
        .single();

      if (batchData) {
        await supabase.from('sale_items').insert([{
          sale_id: saleData.id,
          organization_id: orgId,
          product_id: item.id,
          batch_id: batchData.id,
          quantity_sold: qtyNum,
          unit_price: perUnitPrice,
          gst_percent: item.gst_percentage,
          total_price: itemFinalTotal
        }]);

        await supabase
          .from('product_batches')
          .update({ stock_qty: Math.max(0, batchData.stock_qty - qtyNum) })
          .eq('id', batchData.id);
      }
    }

    // Insert split payments record
    if (Number(splitCash) > 0) {
      await supabase.from('payments').insert([{ sale_id: saleData.id, organization_id: orgId, payment_mode: 'cash', amount: Number(splitCash) }]);
    }
    if (Number(splitUpi) > 0) {
      await supabase.from('payments').insert([{ sale_id: saleData.id, organization_id: orgId, payment_mode: 'upi', amount: Number(splitUpi) }]);
    }
    if (Number(splitCard) > 0) {
      await supabase.from('payments').insert([{ sale_id: saleData.id, organization_id: orgId, payment_mode: 'card', amount: Number(splitCard) }]);
    }

    setSuccessMsg(`Sale successful! Invoice: ${invoiceNumber}`);
    setCart([]);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerDOB('');
    setOverallDiscount(0);
    setSplitCash(0);
    setSplitUpi(0);
    setSplitCard(0);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Metadata Panel */}
        <div className="bg-slate-200 border-b border-slate-300 p-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
          <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-2 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Telephone / Phone No:</span>
              <input
                type="text"
                placeholder="Enter 10-digit mobile..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded font-bold text-slate-900 w-44"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Customer Name:</span>
              <input
                type="text"
                placeholder="Walk-in Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded font-bold text-slate-900 w-44"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Date of Birth:</span>
              <input
                type="date"
                value={customerDOB}
                onChange={(e) => setCustomerDOB(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded text-slate-900 w-44"
              />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-2 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Doctor:</span>
              <select
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded font-bold text-slate-900 w-44 bg-slate-50"
              >
                <option value="15-OTHERS">15-OTHERS</option>
                <option value="Dr. Ramesh Kumar">Dr. Ramesh Kumar</option>
                <option value="Dr. Sneha Rao">Dr. Sneha Rao</option>
              </select>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Sales Origin:</span>
              <select
                value={salesOrigin}
                onChange={(e) => setSalesOrigin(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded font-bold text-slate-900 w-44 bg-slate-50"
              >
                <option value="Regular sales">Regular sales</option>
                <option value="Home Delivery">Home Delivery</option>
              </select>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-2 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between text-slate-500">
              <span>Terminal ID:</span> <strong className="text-slate-900">001</strong>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Store:</span> <strong className="text-slate-900">Bangalore Hub</strong>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Shortcut:</span> <strong className="text-amber-600">F2 (Search) | F1 (Journals)</strong>
            </div>
          </div>
        </div>

        {/* Center Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4">
          
          <div className="lg:col-span-3 flex flex-col space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> <span className="font-bold">{successMsg}</span>
              </div>
            )}

            {/* Search Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-300 relative shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan Barcode or Search Medicine Name (Press F2)..."
                  className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none text-sm"
                />
              </div>

              {products.length > 0 && (
                <div className="absolute left-3 right-3 mt-2 bg-white rounded-xl shadow-2xl border border-slate-300 z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {products.map((prod) => (
                    <div key={prod.id} className="p-3 hover:bg-amber-50/50 transition">
                      <div className="font-bold text-slate-900 text-sm">{prod.product_name}</div>
                      <div className="text-xs text-slate-500 mt-1 flex gap-4">
                        <span>Brand: {prod.brand || 'N/A'}</span>
                        <span>GST: {prod.gst_rate}%</span>
                        <span>Pack Size: {prod.units_per_pack || 15} units</span>
                      </div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {prod.product_batches?.map((batch: any) => (
                          <button
                            key={batch.id}
                            onClick={() => addToCart(prod, batch)}
                            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow"
                          >
                            Batch: {batch.batch_number} | MRP: ₹{batch.mrp} | Stock: {batch.stock_qty}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Table */}
            <div className="bg-white rounded-xl border border-slate-300 shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-100 border-b border-slate-300 font-bold text-slate-900 text-xs flex justify-between items-center">
                <span>Billing Items ({cart.length})</span>
                <div className="flex items-center gap-2">
                  <button onClick={clearAllCart} className="bg-red-100 hover:bg-red-200 text-red-700 px-2.5 py-1 rounded text-xs font-bold transition">
                    Clear All (F3)
                  </button>
                  <span className="text-slate-500">Auto Full/Loose Calculator Active</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                    <Receipt className="w-10 h-10 mb-2 stroke-1" />
                    <p className="text-xs font-medium">Cart is empty. Scan barcode or search above.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-2 font-semibold">Item Name</th>
                        <th className="p-2 font-semibold">Batch</th>
                        <th className="p-2 font-semibold">Unit Breakdown</th>
                        <th className="p-2 font-semibold">Qty (Tabs)</th>
                        <th className="p-2 font-semibold">Disc %</th>
                        <th className="p-2 font-semibold">Total</th>
                        <th className="p-2 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map((item, idx) => {
                        const qtyNum = Number(item.quantity) || 0;
                        const perUnitPrice = item.selling_price / item.pack_size;
                        const gross = perUnitPrice * qtyNum;
                        const discVal = gross * ((item.discount_percent || 0) / 100);
                        const netTotal = gross - discVal;

                        const fullPacks = Math.floor(qtyNum / item.pack_size);
                        const looseTabs = qtyNum % item.pack_size;
                        const breakdownText = fullPacks > 0 
                          ? `${fullPacks} pack${fullPacks > 1 ? 's' : ''} (${fullPacks * item.pack_size})${looseTabs > 0 ? ` + ${looseTabs} loose` : ''}` 
                          : `${qtyNum} loose tablets`;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 font-bold text-slate-900">{item.product_name}</td>
                            <td className="p-2 text-slate-600 font-mono">{item.batch_number}</td>
                            <td className="p-2">
                              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                                {breakdownText}
                              </span>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                onBlur={() => handleQuantityBlur(idx)}
                                className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-center font-bold"
                              />
                            </td>
                            <td className="p-2">
                              <button 
                                onClick={() => {
                                  setDiscountModalIndex(idx);
                                  setItemDiscountInput(item.discount_percent);
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold"
                              >
                                {item.discount_percent > 0 ? `${item.discount_percent}%` : '+ Disc'}
                              </button>
                            </td>
                            <td className="p-2 font-bold text-slate-900">₹{netTotal.toFixed(2)}</td>
                            <td className="p-2 text-right">
                              <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Bottom Financial Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-300 grid grid-cols-5 gap-3 text-xs shadow-sm items-center">
              <div>
                <span className="text-slate-500 block">Subtotal</span>
                <strong className="text-sm text-slate-900">₹{subtotal.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Overall Bill Disc %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(Number(e.target.value))}
                  className="w-16 px-2 py-1 border border-slate-300 rounded font-bold text-slate-900 mt-0.5"
                />
              </div>
              <div>
                <span className="text-slate-500 block">Included GST</span>
                <strong className="text-sm text-slate-900">₹{totalGST.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Net Payable</span>
                <strong className="text-base text-amber-700">₹{finalTotal.toFixed(2)}</strong>
              </div>
              <div>
                <button
                  onClick={handleCompleteSale}
                  disabled={loading || cart.length === 0}
                  className="w-full h-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-2.5 rounded-lg shadow transition flex items-center justify-center gap-1 disabled:opacity-50 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> {loading ? 'Processing...' : 'Complete Sale'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Action Keypad & Active Split Payment Inputs */}
          <div className="flex flex-col space-y-3">
            <div className="bg-slate-900 text-white p-2 rounded-xl text-center font-bold text-xs">
              POS Quick Actions
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={parkTransaction} className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-xl text-xs font-semibold text-center border border-slate-700">
                <span className="block text-[10px] text-amber-400 font-bold">Alt + F4</span> Park Txn
              </button>
              <button onClick={() => setShowParkedModal(true)} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 p-3 rounded-xl text-xs font-semibold text-center border border-amber-500/30 relative">
                <span className="block text-[10px] text-amber-400 font-bold">Parked List</span> View ({parkedTransactions.length})
              </button>
              <button onClick={fetchJournals} className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-xl text-xs font-semibold text-center border border-slate-700">
                <span className="block text-[10px] text-amber-400 font-bold">F1</span> Show Journals
              </button>
              <button onClick={() => router.push('/dashboard/inventory')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-xl text-xs font-semibold text-center border border-slate-700">
                <span className="block text-[10px] text-amber-400 font-bold">Alt + F2</span> Inventory Check
              </button>
              <button 
                onClick={() => {
                  if (cart.length > 0) {
                    setDiscountModalIndex(0);
                    setItemDiscountInput(cart[0].discount_percent);
                  } else {
                    alert('Add an item to the cart first.');
                  }
                }} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-xl text-xs font-semibold text-center border border-slate-700"
              >
                <span className="block text-[10px] text-amber-400 font-bold">Alt + F3</span> Manual Disc.
              </button>
              <button onClick={() => router.push('/dashboard/invoices')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-xl text-xs font-semibold text-center border border-slate-700">
                <span className="block text-[10px] text-amber-400 font-bold">Alt + F2</span> Re-Print Bill
              </button>
            </div>

            {/* Active Split Payment Inputs Box */}
            <div className="bg-white p-3 rounded-2xl border border-slate-300 space-y-2 shadow-sm">
              <div className="flex justify-between items-center text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                <span>Split Payment Active</span>
                <span className={`text-[10px] ${Math.abs(totalPaidSplit - finalTotal) <= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  Paid: ₹{totalPaidSplit} / ₹{finalTotal.toFixed(0)}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Cash:</span>
                  <input
                    type="number"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    className="w-24 px-2 py-1 border border-slate-300 rounded font-bold text-right"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">UPI:</span>
                  <input
                    type="number"
                    value={splitUpi}
                    onChange={(e) => setSplitUpi(e.target.value)}
                    className="w-24 px-2 py-1 border border-slate-300 rounded font-bold text-right"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Card:</span>
                  <input
                    type="number"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    className="w-24 px-2 py-1 border border-slate-300 rounded font-bold text-right"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Parked Transactions Modal */}
      {showParkedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Parked Transactions ({parkedTransactions.length})</h3>
              <button onClick={() => setShowParkedModal(false)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>
            {parkedTransactions.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">No parked transactions found.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {parkedTransactions.map((pt) => (
                  <div key={pt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-slate-900 text-sm block">Customer: {pt.customerPhone || 'Walk-in'}</strong>
                      <span className="text-slate-500">Parked at {pt.time} • {pt.cart.length} items</span>
                    </div>
                    <button
                      onClick={() => resumeParkedTransaction(pt)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-lg shadow text-xs"
                    >
                      Resume Bill
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Discount Modal */}
      {discountModalIndex !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Apply Item Discount</h3>
            <p className="text-xs text-slate-500">Enter discount percentage for <strong>{cart[discountModalIndex]?.product_name}</strong>:</p>
            <input
              type="number"
              min="0"
              max="100"
              value={itemDiscountInput}
              onChange={(e) => setItemDiscountInput(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDiscountModalIndex(null)} className="px-4 py-2 border rounded-xl text-xs font-semibold">Cancel</button>
              <button onClick={applyItemDiscount} className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs">Apply Discount</button>
            </div>
          </div>
        </div>
      )}

      {/* Show Journals Modal */}
      {showJournalsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Recent Sales Journals (Invoices)</h3>
              <button onClick={() => setShowJournalsModal(false)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-slate-900 text-sm block">{inv.invoice_number}</strong>
                    <span className="text-slate-500">Customer: {inv.customers?.phone || 'Walk-in'} • {new Date(inv.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-amber-700 text-sm block">₹{Number(inv.final_amount).toFixed(2)}</span>
                    <span className="text-green-600 font-bold uppercase">{inv.payment_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
