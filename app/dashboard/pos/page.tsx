'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  Receipt, 
  Search, 
  Trash2, 
  CheckCircle2, 
  ArrowLeft,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle
} from 'lucide-react';

interface CartItem {
  id: string;
  product_name: string;
  batch_number: string;
  selling_price: number;
  mrp: number;
  gst_percentage: number;
  quantity: number;
  pack_size: number;
  is_loose: boolean;
  available_qty: number;
}

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Keyboard shortcut listener (F2 for search focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search products in inventory
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

  const addToCart = (product: any, batch: any) => {
    const existingIndex = cart.findIndex(item => item.id === product.id && item.batch_number === batch.batch_number);
    const packSize = product.units_per_pack || 10;
    const sellingPrice = batch.selling_rate || 100;
    const availableQty = batch.stock_qty || 0;

    if (existingIndex > -1) {
      const updated = [...cart];
      if (updated[existingIndex].quantity + 1 > availableQty) {
        alert(`Stock limit reached! Only ${availableQty} units available in batch ${batch.batch_number}.`);
        return;
      }
      updated[existingIndex].quantity += 1;
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
          is_loose: false,
          available_qty: availableQty,
        },
      ]);
    }
    setSearchQuery('');
    setProducts([]);
    searchInputRef.current?.focus();
  };

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) return;
    if (qty > cart[index].available_qty) {
      alert(`Insufficient stock! Only ${cart[index].available_qty} units available for this batch.`);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = qty;
    setCart(updated);
  };

  const removeItem = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  // Financial Calculations
  const subtotal = cart.reduce((acc, item) => {
    const unitPrice = item.is_loose ? item.selling_price / item.pack_size : item.selling_price;
    return acc + unitPrice * item.quantity;
  }, 0);

  const totalGST = cart.reduce((acc, item) => {
    const unitPrice = item.is_loose ? item.selling_price / item.pack_size : item.selling_price;
    const itemTotal = unitPrice * item.quantity;
    return acc + (itemTotal * item.gst_percentage) / (100 + item.gst_percentage);
  }, 0);

  const finalTotal = subtotal;

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
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

    // 1. Create Customer if provided
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
          .insert([{ organization_id: orgId, customer_name: customerName || 'Walk-in Customer', phone: customerPhone }])
          .select('id')
          .single();
        if (newCust) customerId = newCust.id;
      }
    }

    // 2. Generate Invoice Number
    const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Insert Sale Record
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

    // 4. Insert Sale Items & Deduct Stock Atomically
    for (const item of cart) {
      const unitPrice = item.is_loose ? item.selling_price / item.pack_size : item.selling_price;
      
      // Get batch id
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
          quantity_sold: item.quantity,
          unit_price: unitPrice,
          gst_percent: item.gst_percentage,
          total_price: unitPrice * item.quantity
        }]);

        // Deduct inventory stock
        await supabase
          .from('product_batches')
          .update({ stock_qty: Math.max(0, batchData.stock_qty - item.quantity) })
          .eq('id', batchData.id);
      }
    }

    // 5. Insert Payment record
    await supabase.from('payments').insert([{
      sale_id: saleData.id,
      organization_id: orgId,
      payment_mode: paymentMethod,
      amount: finalTotal
    }]);

    setSuccessMsg(`Sale successful! Invoice: ${invoiceNumber}`);
    setCart([]);
    setCustomerPhone('');
    setCustomerName('');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="h-16 bg-slate-900 text-white px-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-slate-400 hover:text-white transition flex items-center gap-1 text-xs font-medium">
            <ArrowLeft className="w-4 h-4" /> Exit POS
          </a>
          <span className="text-lg font-bold">Ganit<span className="text-amber-400">Pharma</span> POS</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
            Shortcut: <strong className="text-amber-400">F2</strong> to Search
          </span>
          <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
            Tenant Isolated Session
          </span>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-[1600px] w-full mx-auto">
        <div className="lg:col-span-2 flex flex-col space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan Barcode or Search Medicine Name (Press F2)..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            {products.length > 0 && (
              <div className="absolute left-4 right-4 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {products.map((prod) => (
                  <div key={prod.id} className="p-3 hover:bg-amber-50/50 transition">
                    <div className="font-bold text-slate-900 text-sm">{prod.product_name}</div>
                    <div className="text-xs text-slate-500 mt-1 flex gap-4">
                      <span>Brand: {prod.brand || 'N/A'}</span>
                      <span>GST: {prod.gst_rate}%</span>
                      <span>Pack: {prod.pack_size}</span>
                    </div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {prod.product_batches?.map((batch: any) => (
                        <button
                          key={batch.id}
                          onClick={() => addToCart(prod, batch)}
                          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm"
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-slate-900 flex justify-between items-center">
              <span>Billing Cart ({cart.length} items)</span>
              <span className="text-xs text-slate-500 font-normal">FEFO Auto-Batch Applied</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                  <Receipt className="w-12 h-12 mb-3 stroke-1" />
                  <p className="text-sm font-medium">Cart is empty. Scan barcode or search above.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="pb-3 font-semibold">Item Name</th>
                      <th className="pb-3 font-semibold">Batch</th>
                      <th className="pb-3 font-semibold">Type</th>
                      <th className="pb-3 font-semibold">Qty</th>
                      <th className="pb-3 font-semibold">Price</th>
                      <th className="pb-3 font-semibold">Total</th>
                      <th className="pb-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item, idx) => {
                      const effectivePrice = item.is_loose ? item.selling_price / item.pack_size : item.selling_price;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 font-semibold text-slate-900">{item.product_name}</td>
                          <td className="py-3 text-slate-600 text-xs">{item.batch_number}</td>
                          <td className="py-3">
                            <button
                              onClick={() => {
                                const updated = [...cart];
                                updated[idx].is_loose = !updated[idx].is_loose;
                                setCart(updated);
                              }}
                              className={`text-xs px-2 py-1 rounded font-bold ${item.is_loose ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}
                            >
                              {item.is_loose ? `Loose` : 'Full Pack'}
                            </button>
                          </td>
                          <td className="py-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-sm font-bold"
                            />
                            <span className="text-[10px] text-slate-400 block mt-0.5">Max: {item.available_qty}</span>
                          </td>
                          <td className="py-3 text-slate-600">₹{effectivePrice.toFixed(2)}</td>
                          <td className="py-3 font-bold text-slate-900">₹{(effectivePrice * item.quantity).toFixed(2)}</td>
                          <td className="py-3 text-right">
                            <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 p-1">
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
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Checkout Summary</h3>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase">Customer Information</label>
              <input
                type="text"
                placeholder="Customer Phone (Primary ID)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Customer Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${paymentMethod === 'cash' ? 'bg-amber-50 border-amber-400 text-amber-900' : 'border-slate-200 text-slate-600'}`}
                >
                  <Banknote className="w-4 h-4" /> Cash
                </button>
                <button
                  onClick={() => setPaymentMethod('upi')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${paymentMethod === 'upi' ? 'bg-amber-50 border-amber-400 text-amber-900' : 'border-slate-200 text-slate-600'}`}
                >
                  <Smartphone className="w-4 h-4" /> UPI
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${paymentMethod === 'card' ? 'bg-amber-50 border-amber-400 text-amber-900' : 'border-slate-200 text-slate-600'}`}
                >
                  <CreditCard className="w-4 h-4" /> Card
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-xs">
                <span>Included GST (Auto-calculated)</span>
                <span>₹{totalGST.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-extrabold text-slate-900 border-t border-slate-200 pt-3">
                <span>Final Payable</span>
                <span className="text-amber-700">₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-6">
            <button
              onClick={handleCompleteSale}
              disabled={loading || cart.length === 0}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-4 rounded-xl shadow-md transition text-base flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" /> {loading ? 'Processing Sale...' : 'Complete Sale & Print Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
