'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Receipt, Search, Trash2, CheckCircle2, AlertCircle, Package, Printer, MessageSquare, RotateCcw, XCircle } from 'lucide-react';

interface CartItem {
  id: string;
  product_name: string;
  batch_id: string;
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
  const [overallDiscount, setOverallDiscount] = useState<number | string>('');

  // Single Mode Payment Button Selection
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('cash');

  // Optional Split Payment Inputs
  const [splitCash, setSplitCash] = useState<number | string>('');
  const [splitUpi, setSplitUpi] = useState<number | string>('');
  const [splitCard, setSplitCard] = useState<number | string>('');

  // Parked & Inventory Modal States
  const [parkedTransactions, setParkedTransactions] = useState<any[]>([]);
  const [showParkedModal, setShowParkedModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');

  // Journals & Invoice Modals
  const [showJournalsModal, setShowJournalsModal] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [journalPhoneQuery, setJournalPhoneQuery] = useState('');
  const [journalDateQuery, setJournalDateQuery] = useState('');
  const [journalInvoiceQuery, setJournalInvoiceQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Return Modal State for POS Journals
  const [returnModalInvoice, setReturnModalInvoice] = useState<any | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<{ [itemId: string]: number }>({});

  // Discount Modal
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

  // Instant Customer Lookup
  useEffect(() => {
    async function lookupCustomer() {
      if (customerPhone.length !== 10) {
        if (customerPhone.length === 0) {
          setCustomerName('');
          setCustomerDOB('');
        }
        return;
      }

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
        } else {
          setCustomerName('');
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
          .limit(6);

        setProducts(data || []);
      }
    }
    const timer = setTimeout(searchProducts, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, supabase]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && products.length > 0) {
      e.preventDefault();
      const prod = products[0];
      if (prod.product_batches && prod.product_batches.length > 0) {
        const sortedBatches = [...prod.product_batches].sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
        addToCart(prod, sortedBatches[0]);
      }
    }
  };

  async function fetchJournals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = user.user_metadata?.organization_id;

    if (orgId) {
      let query = supabase
        .from('sales')
        .select('*, sale_items(*, products(product_name), product_batches(batch_number)), customers(customer_name, phone)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (journalDateQuery) {
        query = query.gte('created_at', `${journalDateQuery}T00:00:00`).lte('created_at', `${journalDateQuery}T23:59:59`);
      }
      if (journalInvoiceQuery) {
        query = query.ilike('invoice_number', `%${journalInvoiceQuery}%`);
      }

      const { data } = await query;
      if (data) {
        let filtered = data;
        if (journalPhoneQuery) {
          filtered = data.filter((inv: any) => inv.customers?.phone?.includes(journalPhoneQuery));
        }
        setRecentInvoices(filtered);
        setShowJournalsModal(true);
      }
    }
  }

  const reprintLatestBill = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = user.user_metadata?.organization_id;
    if (orgId) {
      const { data } = await supabase
        .from('sales')
        .select('*, sale_items(*, products(product_name), product_batches(batch_number)), customers(customer_name, phone)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setSelectedInvoice(data);
      } else {
        alert('No recent bill found to reprint.');
      }
    }
  };

  async function openInventoryCheck() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = user.user_metadata?.organization_id;

    if (orgId) {
      const { data } = await supabase
        .from('products')
        .select('*, product_batches(*)')
        .eq('organization_id', orgId);

      if (data) setInventoryList(data);
      setShowInventoryModal(true);
    }
  }

  const addToCart = (product: any, specificBatch?: any) => {
    let batch = specificBatch;
    if (!batch && product.product_batches && product.product_batches.length > 0) {
      const sorted = [...product.product_batches].sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
      batch = sorted[0];
    }

    if (!batch) {
      alert('No active batch available for this medicine.');
      return;
    }

    const existingIndex = cart.findIndex(item => item.id === product.id && item.batch_number === batch.batch_number);
    const packSize = product.units_per_pack || 15;
    const sellingPrice = batch.mrp || batch.selling_rate || 100;
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
          batch_id: batch.id,
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
    setShowInventoryModal(false);
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
      setOverallDiscount('');
      setSplitCash('');
      setSplitUpi('');
      setSplitCard('');
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
    setOverallDiscount('');
    alert('Transaction successfully parked!');
  };

  const resumeParkedTransaction = (parked: any) => {
    setCart(parked.cart);
    setCustomerPhone(parked.customerPhone || '');
    setCustomerName(parked.customerName || '');
    setOverallDiscount(parked.overallDiscount || '');
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

  const overallDiscNum = Number(overallDiscount) || 0;
  const overallDiscVal = rawSubtotal * (overallDiscNum / 100);
  const subtotal = rawSubtotal - overallDiscVal;
  const totalDiscountAmount = cart.reduce((acc, item) => {
    const qtyNum = Number(item.quantity) || 0;
    const perUnitPrice = item.selling_price / item.pack_size;
    const gross = perUnitPrice * qtyNum;
    return acc + (gross * ((item.discount_percent || 0) / 100));
  }, 0) + overallDiscVal;

  const totalGST = cart.reduce((acc, item) => {
    const qtyNum = Number(item.quantity) || 0;
    const perUnitPrice = item.selling_price / item.pack_size;
    const gross = perUnitPrice * qtyNum;
    const disc = gross * ((item.discount_percent || 0) / 100);
    let netItemTotal = gross - disc;
    if (rawSubtotal > 0) {
      netItemTotal -= netItemTotal * (overallDiscNum / 100);
    }
    return acc + (netItemTotal * item.gst_percentage) / (100 + item.gst_percentage);
  }, 0);

  const finalTotal = subtotal;

  const cashVal = Number(splitCash) || 0;
  const upiVal = Number(splitUpi) || 0;
  const cardVal = Number(splitCard) || 0;
  const totalPaidSplit = cashVal + upiVal + cardVal;

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (!customerPhone || customerPhone.length !== 10) {
      alert('Sale cannot be completed without a valid 10-digit customer mobile number!');
      return;
    }

    let finalCash = cashVal;
    let finalUpi = upiVal;
    let finalCard = cardVal;

    if (totalPaidSplit === 0) {
      if (paymentMode === 'cash') finalCash = finalTotal;
      if (paymentMode === 'upi') finalUpi = finalTotal;
      if (paymentMode === 'card') finalCard = finalTotal;
    } else {
      if (Math.abs(totalPaidSplit - finalTotal) > 1) {
        alert(`Split payment total (₹${totalPaidSplit}) must match Final Payable (₹${finalTotal.toFixed(2)})!`);
        return;
      }
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
    const { data: existingCust } = await supabase
      .from('customers')
      .select('id')
      .eq('organization_id', orgId)
      .eq('phone', customerPhone)
      .single();

    if (existingCust) {
      customerId = existingCust.id;
      await supabase.from('customers').update({ customer_name: customerName || 'Retail Customer' }).eq('id', customerId);
    } else {
      const { data: newCust } = await supabase
        .from('customers')
        .insert([{ organization_id: orgId, customer_name: customerName || 'Retail Customer', phone: customerPhone }])
        .select('id')
        .single();
      if (newCust) customerId = newCust.id;
    }

    const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([{
        organization_id: orgId,
        invoice_number: invoiceNumber,
        customer_id: customerId,
        subtotal: rawSubtotal,
        discount_total: totalDiscountAmount,
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
        itemFinalTotal -= itemFinalTotal * (overallDiscNum / 100);
      }

      await supabase.from('sale_items').insert([{
        sale_id: saleData.id,
        organization_id: orgId,
        product_id: item.id,
        batch_id: item.batch_id,
        quantity_sold: qtyNum,
        unit_price: perUnitPrice,
        gst_percent: item.gst_percentage,
        total_price: itemFinalTotal
      }]);

      const { data: batchData } = await supabase
        .from('product_batches')
        .select('stock_qty')
        .eq('id', item.batch_id)
        .single();

      if (batchData) {
        await supabase
          .from('product_batches')
          .update({ stock_qty: Math.max(0, batchData.stock_qty - qtyNum) })
          .eq('id', item.batch_id);
      }
    }

    if (finalCash > 0) {
      await supabase.from('payments').insert([{ sale_id: saleData.id, organization_id: orgId, payment_mode: 'cash', amount: finalCash }]);
    }
    if (finalUpi > 0) {
      await supabase.from('payments').insert([{ sale_id: saleData.id, organization_id: orgId, payment_mode: 'upi', amount: finalUpi }]);
    }
    if (finalCard > 0) {
      await supabase.from('payments').insert([{ sale_id: saleData.id, organization_id: orgId, payment_mode: 'card', amount: finalCard }]);
    }

    setSuccessMsg(`Sale successful! Invoice: ${invoiceNumber}`);
    setCart([]);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerDOB('');
    setOverallDiscount('');
    setSplitCash('');
    setSplitUpi('');
    setSplitCard('');
    setLoading(false);
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to CANCEL this entire invoice? This will void the bill and restore all items into inventory.')) return;

    const { data: items } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', invoiceId);

    if (items) {
      for (const item of items) {
        if (item.batch_id && item.quantity_sold) {
          const { data: batch } = await supabase
            .from('product_batches')
            .select('stock_qty')
            .eq('id', item.batch_id)
            .single();

          if (batch) {
            await supabase
              .from('product_batches')
              .update({ stock_qty: batch.stock_qty + item.quantity_sold })
              .eq('id', item.batch_id);
          }
        }
      }
    }

    await supabase
      .from('sales')
      .update({ payment_status: 'Cancelled', final_amount: 0 })
      .eq('id', invoiceId);

    alert('Invoice successfully cancelled and stock restored!');
    fetchJournals();
  };

  const openReturnModal = (inv: any) => {
    setReturnModalInvoice(inv);
    const initialQtys: { [id: string]: number } = {};
    inv.sale_items?.forEach((item: any) => {
      initialQtys[item.id] = 0;
    });
    setReturnQuantities(initialQtys);
  };

  const handleProcessReturn = async () => {
    if (!returnModalInvoice) return;

    let totalRefund = 0;

    for (const item of returnModalInvoice.sale_items) {
      const returnQty = Number(returnQuantities[item.id]) || 0;
      if (returnQty > 0) {
        if (returnQty > item.quantity_sold) {
          alert(`Return quantity for ${item.products?.product_name} cannot exceed sold quantity (${item.quantity_sold}).`);
          return;
        }

        const unitRefund = Number(item.total_price) / Number(item.quantity_sold);
        totalRefund += unitRefund * returnQty;

        if (item.batch_id) {
          const { data: batch } = await supabase
            .from('product_batches')
            .select('stock_qty')
            .eq('id', item.batch_id)
            .single();

          if (batch) {
            await supabase
              .from('product_batches')
              .update({ stock_qty: batch.stock_qty + returnQty })
              .eq('id', item.batch_id);
          }
        }

        const newQtySold = Number(item.quantity_sold) - returnQty;
        const newTotalPrice = Number(item.total_price) - (unitRefund * returnQty);
        await supabase
          .from('sale_items')
          .update({ quantity_sold: newQtySold, total_price: newTotalPrice })
          .eq('id', item.id);
      }
    }

    const newFinalAmount = Math.max(0, Number(returnModalInvoice.final_amount) - totalRefund);
    await supabase
      .from('sales')
      .update({ 
        final_amount: newFinalAmount,
        payment_status: newFinalAmount === 0 ? 'Fully Returned' : 'Partially Returned'
      })
      .eq('id', returnModalInvoice.id);

    alert(`Return processed successfully! Refund amount: ₹${totalRefund.toFixed(2)}`);
    setReturnModalInvoice(null);
    fetchJournals();
  };

  const printTaxInvoice = () => {
    window.print();
  };

  const sendWhatsAppInvoice = (inv: any) => {
    const phone = inv.customers?.phone || '919999999999';
    const msg = encodeURIComponent(`Hello ${inv.customers?.customer_name || 'Customer'}, here is your tax invoice ${inv.invoice_number} from GanitPharma. Total Amount: ₹${Number(inv.final_amount).toFixed(2)}. Thank you for visiting!`);
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-hero-gradient">
      
      {/* Top Metadata Panel */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Telephone / Phone No <span className="text-red-500">*</span>:</span>
            <input
              type="text"
              placeholder="10-digit mobile required..."
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-xl font-bold text-slate-900 w-44 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Customer Name:</span>
            <input
              type="text"
              placeholder="Walk-in Customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-xl font-bold text-slate-900 w-44 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Date of Birth:</span>
            <input
              type="date"
              value={customerDOB}
              onChange={(e) => setCustomerDOB(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-xl text-slate-900 w-44 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Doctor:</span>
            <select
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-xl font-bold text-slate-900 w-44 bg-slate-50 focus:outline-none"
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
              className="px-2.5 py-1 border border-slate-300 rounded-xl font-bold text-slate-900 w-44 bg-slate-50 focus:outline-none"
            >
              <option value="Regular sales">Regular sales</option>
              <option value="Home Delivery">Home Delivery</option>
            </select>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 shadow-sm flex flex-col justify-between">
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
          <div className="bg-white p-3 rounded-2xl border border-slate-200 relative shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan Barcode or Search Medicine Name (Press F2, Enter to select)..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none text-sm"
              />
            </div>

            {products.length > 0 && (
              <div className="absolute left-3 right-3 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
                {products.map((prod) => {
                  const batches = prod.product_batches || [];
                  const sortedBatches = [...batches].sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
                  const nearestBatch = sortedBatches[0];

                  return (
                    <div 
                      key={prod.id} 
                      onClick={() => nearestBatch && addToCart(prod, nearestBatch)}
                      className="p-3.5 hover:bg-amber-50/50 transition cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <div className="font-black text-slate-950 text-sm">{prod.product_name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex gap-4 font-medium">
                          <span>Brand: {prod.brand || 'N/A'}</span>
                          <span>GST: {prod.gst_rate}%</span>
                          <span>Pack Size: {prod.units_per_pack || 15} units</span>
                        </div>
                      </div>
                      {nearestBatch && (
                        <div className="bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-sm">
                          MRP: ₹{nearestBatch.mrp} | Stock: {nearestBatch.stock_qty} (Press Enter)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-black text-slate-950 text-xs flex justify-between items-center">
              <span>Billing Items ({cart.length})</span>
              <div className="flex items-center gap-2">
                <button onClick={clearAllCart} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold transition">
                  Clear All (F3)
                </button>
                <span className="text-slate-400 font-semibold">Auto Full/Loose Calculator Active</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                  <Receipt className="w-10 h-10 mb-2 stroke-1" />
                  <p className="text-xs font-semibold">Cart is empty. Scan barcode or search above.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 font-bold">Item Name</th>
                      <th className="p-2.5 font-bold">Batch</th>
                      <th className="p-2.5 font-bold">Unit Breakdown</th>
                      <th className="p-2.5 font-bold">Qty (Tabs)</th>
                      <th className="p-2.5 font-bold">Unit Price</th>
                      <th className="p-2.5 font-bold">Disc %</th>
                      <th className="p-2.5 font-bold">Disc Amt</th>
                      <th className="p-2.5 font-bold">Total</th>
                      <th className="p-2.5 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item, idx) => {
                      const qtyNum = Number(item.quantity) || 0;
                      const perUnitPrice = item.selling_price / item.pack_size;
                      const gross = perUnitPrice * qtyNum;
                      const discAmt = gross * ((item.discount_percent || 0) / 100);
                      const netTotal = gross - discAmt;

                      const fullPacks = Math.floor(qtyNum / item.pack_size);
                      const looseTabs = qtyNum % item.pack_size;
                      const breakdownText = fullPacks > 0 
                        ? `${fullPacks} pack${fullPacks > 1 ? 's' : ''} (${fullPacks * item.pack_size})${looseTabs > 0 ? ` + ${looseTabs} loose` : ''}` 
                        : `${qtyNum} loose tablets`;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-900">{item.product_name}</td>
                          <td className="p-2.5 text-slate-600 font-mono">{item.batch_number}</td>
                          <td className="p-2.5">
                            <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg font-bold">
                              {breakdownText}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, e.target.value)}
                              onBlur={() => handleQuantityBlur(idx)}
                              className="w-16 px-2 py-1 border border-slate-300 rounded-xl text-center font-bold"
                            />
                          </td>
                          <td className="p-2.5 font-mono text-slate-700">₹{perUnitPrice.toFixed(2)}</td>
                          <td className="p-2.5">
                            <button 
                              onClick={() => {
                                setDiscountModalIndex(idx);
                                setItemDiscountInput(item.discount_percent);
                              }} 
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-xl font-bold"
                            >
                              {item.discount_percent > 0 ? `${item.discount_percent}%` : '+ Disc'}
                            </button>
                          </td>
                          <td className="p-2.5 font-mono text-red-600">₹{discAmt.toFixed(2)}</td>
                          <td className="p-2.5 font-black text-slate-950">₹{netTotal.toFixed(2)}</td>
                          <td className="p-2.5 text-right">
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-6 gap-3 text-xs shadow-sm items-center">
            <div>
              <span className="text-slate-400 font-bold block">Subtotal</span>
              <strong className="text-sm font-black text-slate-950">₹{subtotal.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Overall Bill Disc %</span>
              <input
                type="number"
                min="0"
                max="100"
                placeholder=""
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(e.target.value)}
                className="w-16 px-2.5 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-900 mt-0.5"
              />
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Total Disc Amt</span>
              <strong className="text-sm font-black text-red-600">₹{totalDiscountAmount.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Included GST</span>
              <strong className="text-sm font-black text-slate-950">₹{totalGST.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Net Payable</span>
              <strong className="text-base font-black text-amber-600">₹{finalTotal.toFixed(2)}</strong>
            </div>
            <div>
              <button
                onClick={handleCompleteSale}
                disabled={loading || cart.length === 0}
                className="w-full h-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black py-3 rounded-2xl shadow-md transition flex items-center justify-center gap-1 disabled:opacity-50 text-xs"
              >
                <CheckCircle2 className="w-4 h-4" /> {loading ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Action Keypad */}
        <div className="flex flex-col space-y-3">
          <div className="bg-slate-950 text-white p-3 rounded-2xl text-center font-black text-xs tracking-wider">
            POS Quick Actions
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={parkTransaction} className="bg-white hover:bg-slate-50 text-slate-800 p-3 rounded-2xl text-xs font-bold text-center border border-slate-200 shadow-sm">
              <span className="block text-[10px] text-amber-600 font-black">Alt + F4</span> Park Txn
            </button>
            
            <button onClick={() => setShowParkedModal(true)} className="bg-white hover:bg-slate-50 text-slate-800 p-3 rounded-2xl text-xs font-bold text-center border border-slate-200 shadow-sm relative">
              <span className="block text-[10px] text-amber-600 font-black">PARKED LIST</span> View ({parkedTransactions.length})
            </button>

            <button onClick={fetchJournals} className="bg-white hover:bg-slate-50 text-slate-800 p-3 rounded-2xl text-xs font-bold text-center border border-slate-200 shadow-sm">
              <span className="block text-[10px] text-amber-600 font-black">F1</span> Show Journals
            </button>
            <button onClick={openInventoryCheck} className="bg-white hover:bg-slate-50 text-slate-800 p-3 rounded-2xl text-xs font-bold text-center border border-slate-200 shadow-sm">
              <span className="block text-[10px] text-amber-600 font-black">Alt + F2</span> Inventory Check
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
              className="bg-white hover:bg-slate-50 text-slate-800 p-3 rounded-2xl text-xs font-bold text-center border border-slate-200 shadow-sm"
            >
              <span className="block text-[10px] text-amber-600 font-black">Alt + F3</span> Manual Disc.
            </button>
            <button onClick={reprintLatestBill} className="bg-white hover:bg-slate-50 text-slate-800 p-3 rounded-2xl text-xs font-bold text-center border border-slate-200 shadow-sm">
              <span className="block text-[10px] text-amber-600 font-black">Re-Print</span> Re-Print Bill
            </button>
          </div>

          {/* Primary Payment Mode */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
            <div className="text-xs font-black text-slate-950 border-b border-slate-100 pb-1">
              Primary Payment Mode
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`py-2 rounded-xl border text-center transition ${paymentMode === 'cash' ? 'bg-amber-400 border-amber-500 text-slate-950 shadow font-black' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                className={`py-2 rounded-xl border text-center transition ${paymentMode === 'upi' ? 'bg-amber-400 border-amber-500 text-slate-950 shadow font-black' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                UPI
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('card')}
                className={`py-2 rounded-xl border text-center transition ${paymentMode === 'card' ? 'bg-amber-400 border-amber-500 text-slate-950 shadow font-black' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                Card
              </button>
            </div>
          </div>

          {/* Optional Split Payment Inputs */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-xs font-black text-slate-950 border-b border-slate-100 pb-1.5">
              <span>Optional Split Pay</span>
              <span className={`text-[10px] ${totalPaidSplit === 0 || Math.abs(totalPaidSplit - finalTotal) <= 1 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}`}>
                {totalPaidSplit === 0 ? 'Single Mode Active' : `Paid: ₹${totalPaidSplit} / ₹${finalTotal.toFixed(0)}`}
              </span>
            </div>
            <div className="space-y-2 text-xs font-bold">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Cash:</span>
                <input
                  type="number"
                  placeholder=""
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  className="w-24 px-2.5 py-1 border border-slate-300 rounded-xl text-right font-bold"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">UPI:</span>
                <input
                  type="number"
                  placeholder=""
                  value={splitUpi}
                  onChange={(e) => setSplitUpi(e.target.value)}
                  className="w-24 px-2.5 py-1 border border-slate-300 rounded-xl text-right font-bold"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Card:</span>
                <input
                  type="number"
                  placeholder=""
                  value={splitCard}
                  onChange={(e) => setSplitCard(e.target.value)}
                  className="w-24 px-2.5 py-1 border border-slate-300 rounded-xl text-right font-bold"
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Inventory Check Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" /> Live Inventory & Batch Check
              </h3>
              <button onClick={() => setShowInventoryModal(false)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>

            <input
              type="text"
              placeholder="Search available medicine stock..."
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />

            <div className="max-h-96 overflow-y-auto space-y-3">
              {inventoryList
                .filter(p => p.product_name.toLowerCase().includes(inventorySearch.toLowerCase()))
                .map((prod) => (
                  <div key={prod.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col gap-2.5">
                    <div className="flex justify-between font-black text-slate-950 text-sm">
                      <span>{prod.product_name}</span>
                      <span className="text-slate-500 text-xs font-semibold">Brand: {prod.brand || 'N/A'}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {prod.product_batches?.map((batch: any) => (
                        <button
                          key={batch.id}
                          onClick={() => addToCart(prod, batch)}
                          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
                        >
                          Batch: {batch.batch_number} | Exp: {batch.expiry_date} | MRP: ₹{batch.mrp} | Stock: {batch.stock_qty} (Click to Add)
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Parked Transactions Modal */}
      {showParkedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-950">Parked Transactions ({parkedTransactions.length})</h3>
              <button onClick={() => setShowParkedModal(false)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>
            {parkedTransactions.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm font-medium">No parked transactions found.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {parkedTransactions.map((pt) => (
                  <div key={pt.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-slate-950 text-sm block">Customer: {pt.customerPhone || 'Walk-in'}</strong>
                      <span className="text-slate-500 font-medium">Parked at {pt.time} • {pt.cart.length} items</span>
                    </div>
                    <button
                      onClick={() => resumeParkedTransaction(pt)}
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl shadow-sm text-xs transition"
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
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-950">Apply Item Discount</h3>
            <p className="text-xs text-slate-500 font-medium">Enter discount percentage for <strong>{cart[discountModalIndex]?.product_name}</strong>:</p>
            <input
              type="number"
              min="0"
              max="100"
              value={itemDiscountInput}
              onChange={(e) => setItemDiscountInput(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDiscountModalIndex(null)} className="px-4 py-2.5 border rounded-2xl text-xs font-bold text-slate-600">Cancel</button>
              <button onClick={applyItemDiscount} className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-2xl text-xs shadow-sm">Apply Discount</button>
            </div>
          </div>
        </div>
      )}

      {/* Show Journals Modal */}
      {showJournalsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-950">Recent Sales Journals (Invoices)</h3>
              <button onClick={() => setShowJournalsModal(false)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Search by Mobile No..."
                value={journalPhoneQuery}
                onChange={(e) => setJournalPhoneQuery(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
              />
              <input
                type="text"
                placeholder="Search by Invoice No..."
                value={journalInvoiceQuery}
                onChange={(e) => setJournalInvoiceQuery(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
              />
              <input
                type="date"
                value={journalDateQuery}
                onChange={(e) => setJournalDateQuery(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentInvoices
                .filter(inv => {
                  const matchPhone = !journalPhoneQuery || inv.customers?.phone?.includes(journalPhoneQuery);
                  const matchInv = !journalInvoiceQuery || inv.invoice_number?.toLowerCase().includes(journalInvoiceQuery.toLowerCase());
                  return matchPhone && matchInv;
                })
                .map((inv) => (
                  <div key={inv.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-slate-950 text-sm block">{inv.invoice_number}</strong>
                      <span className="text-slate-500 font-medium">Customer: {inv.customers?.phone || 'Walk-in'} • {new Date(inv.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <span className="font-black text-amber-600 text-sm block">₹{Number(inv.final_amount).toFixed(2)}</span>
                        <span className={`font-bold uppercase ${inv.payment_status === 'Paid' ? 'text-emerald-600' : 'text-red-600'}`}>{inv.payment_status}</span>
                      </div>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="bg-slate-900 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] hover:bg-slate-800 transition shadow"
                      >
                        View
                      </button>
                      {inv.payment_status !== 'Cancelled' && inv.payment_status !== 'Fully Returned' && (
                        <button
                          onClick={() => openReturnModal(inv)}
                          className="bg-amber-500 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[11px] hover:bg-amber-600 transition shadow"
                        >
                          Return
                        </button>
                      )}
                      {inv.payment_status !== 'Cancelled' && inv.payment_status !== 'Fully Returned' && (
                        <button
                          onClick={() => handleCancelInvoice(inv.id)}
                          className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] hover:bg-red-700 transition shadow flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Partial Return Modal from Journals */}
      {returnModalInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Process Item Return</h3>
                <p className="text-xs text-slate-500">Invoice: {returnModalInvoice.invoice_number} • Specify return quantity per item.</p>
              </div>
              <button onClick={() => setReturnModalInvoice(null)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5">Batch</th>
                    <th className="p-2.5">Sold Qty</th>
                    <th className="p-2.5">Return Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {returnModalInvoice.sale_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-2.5 font-bold text-slate-950">{item.products?.product_name}</td>
                      <td className="p-2.5 font-mono text-slate-600">{item.product_batches?.batch_number}</td>
                      <td className="p-2.5 font-bold">{item.quantity_sold}</td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          max={item.quantity_sold}
                          value={returnQuantities[item.id] || 0}
                          onChange={(e) => setReturnQuantities({ ...returnQuantities, [item.id]: Number(e.target.value) })}
                          className="w-20 px-2.5 py-1 border border-slate-300 rounded-xl font-bold text-center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button onClick={() => setReturnModalInvoice(null)} className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600">Cancel</button>
              <button onClick={handleProcessReturn} className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow">Confirm Return & Restock</button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal for Viewing / Printing / Reprinting */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 relative print:shadow-none print:w-full">
            
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 print:hidden">
              <div>
                <h3 className="text-lg font-black text-slate-950">GST Tax Invoice</h3>
                <span className="text-xs text-slate-500 font-medium">Original for Recipient</span>
              </div>
              <div className="flex gap-2">
                <button onClick={printTaxInvoice} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-500 hover:text-slate-900 font-bold px-2">✕</button>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-800">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-black text-slate-950">Ganit<span className="text-amber-500">Pharma</span></h1>
                  <p className="text-slate-500 font-medium">12 MG Road, Bengaluru, Karnataka - 560001</p>
                  <p className="text-slate-500 font-mono mt-1">GSTIN: 29ABCDE1234F1Z5</p>
                </div>
                <div className="text-right">
                  <strong className="text-sm block">{selectedInvoice.invoice_number}</strong>
                  <span className="text-slate-500 font-medium">Date: {new Date(selectedInvoice.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Details</span>
                  <strong className="text-slate-950">{selectedInvoice.customers?.customer_name || 'Walk-in Customer'}</strong>
                  <div className="text-slate-600 font-mono">{selectedInvoice.customers?.phone || 'No phone provided'}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Status</span>
                  <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg font-black uppercase text-[10px]">
                    {selectedInvoice.payment_status}
                  </span>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 uppercase text-slate-600 text-[10px] font-black">
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">Batch</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">Unit Price</th>
                    <th className="p-2.5">GST %</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedInvoice.sale_items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-950">{item.products?.product_name || 'Pharmaceutical Item'}</td>
                      <td className="p-2.5 font-mono text-slate-600">{item.product_batches?.batch_number || 'DEFAULT'}</td>
                      <td className="p-2.5">{item.quantity_sold}</td>
                      <td className="p-2.5 font-mono">₹{Number(item.unit_price || 0).toFixed(2)}</td>
                      <td className="p-2.5">{item.gst_percent}%</td>
                      <td className="p-2.5 text-right font-black">₹{Number(item.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-slate-200 pt-3 space-y-1 text-right font-semibold">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{Number(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                {Number(selectedInvoice.discount_total || 0) > 0 && (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Overall Bill Discount:</span>
                    <span>-₹{Number(selectedInvoice.discount_total).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Included GST Tax:</span>
                  <span>₹{Number(selectedInvoice.gst_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-100">
                  <span>Net Payable Amount:</span>
                  <span className="text-amber-600">₹{Number(selectedInvoice.final_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-6 border-t border-slate-100 font-medium">
                Certified that the particulars given above are true and correct. Computer Generated Tax Invoice.
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
