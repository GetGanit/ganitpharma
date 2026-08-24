'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Search, Calendar, Printer, MessageSquare, FileText, RotateCcw, XCircle } from 'lucide-react';

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [invoiceNoQuery, setInvoiceNoQuery] = useState('');
  const [dateQuery, setDateQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Return Modal State
  const [returnModalInvoice, setReturnModalInvoice] = useState<any | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<{ [itemId: string]: number }>({});

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchInvoices();
  }, [phoneQuery, invoiceNoQuery, dateQuery]);

  async function fetchInvoices() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;
    if (orgId) {
      let query = supabase
        .from('sales')
        .select('*, sale_items(*, products(product_name), product_batches(batch_number)), customers(customer_name, phone)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (dateQuery) {
        const start = `${dateQuery}T00:00:00`;
        const end = `${dateQuery}T23:59:59`;
        query = query.gte('created_at', start).lte('created_at', end);
      }

      if (invoiceNoQuery) {
        query = query.ilike('invoice_number', `%${invoiceNoQuery}%`);
      }

      const { data } = await query;
      if (data) {
        let filtered = data;
        if (phoneQuery) {
          filtered = data.filter((inv: any) => inv.customers?.phone?.includes(phoneQuery));
        }
        setInvoices(filtered);
      }
    }
    setLoading(false);
  }

  // Workflow 1: Cancel Entire Invoice
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
    fetchInvoices();
  };

  // Workflow 2: Open Return Modal
  const openReturnModal = (inv: any) => {
    setReturnModalInvoice(inv);
    const initialQtys: { [id: string]: number } = {};
    inv.sale_items?.forEach((item: any) => {
      initialQtys[item.id] = 0;
    });
    setReturnQuantities(initialQtys);
  };

  // Submit Partial Return
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
    fetchInvoices();
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
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6 bg-hero-gradient min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">GST Tax Invoices</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Search, view, print, and share GST tax invoices with customers.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Mobile No..."
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Invoice No..."
              value={invoiceNoQuery}
              onChange={(e) => setInvoiceNoQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateQuery}
              onChange={(e) => setDateQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-black text-slate-950 text-xs uppercase tracking-wider">
          Generated Invoices ({invoices.length})
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
            <p className="text-xs font-semibold">No invoices match your search filter.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200 font-bold">
              <tr>
                <th className="p-4">Invoice No</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Net Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-bold text-slate-950">{inv.invoice_number}</td>
                  <td className="p-4 font-bold text-slate-900">{inv.customers?.customer_name || 'Walk-in Customer'}</td>
                  <td className="p-4 font-mono text-slate-600">{inv.customers?.phone || 'N/A'}</td>
                  <td className="p-4 text-slate-500">{new Date(inv.created_at).toLocaleString()}</td>
                  <td className="p-4 font-black text-amber-600">₹{Number(inv.final_amount).toFixed(2)}</td>
                  <td className="p-4 text-right space-x-1.5">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="bg-slate-950 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow hover:bg-slate-900 transition"
                    >
                      View
                    </button>
                    <button
                      onClick={() => sendWhatsAppInvoice(inv)}
                      className="bg-emerald-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow hover:bg-emerald-700 transition inline-flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </button>

                    {inv.payment_status !== 'Cancelled' && inv.payment_status !== 'Fully Returned' && (
                      <button
                        onClick={() => openReturnModal(inv)}
                        className="bg-amber-500 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-xl shadow hover:bg-amber-600 transition inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Return
                      </button>
                    )}

                    {inv.payment_status !== 'Cancelled' && inv.payment_status !== 'Fully Returned' && (
                      <button
                        onClick={() => handleCancelInvoice(inv.id)}
                        className="bg-red-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow hover:bg-red-700 transition inline-flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Partial Return Modal */}
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

      {/* Tax Invoice Modal with Discount Display */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 relative print:shadow-none print:w-full">
            
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 print:hidden">
              <div>
                <h3 className="text-lg font-black text-slate-950">GST Tax Invoice</h3>
                <span className="text-xs text-slate-500 font-medium">Original for Recipient</span>
              </div>
              <div className="flex gap-2">
                <button onClick={printTaxInvoice} className="bg-slate-950 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
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
