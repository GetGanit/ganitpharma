'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Search, Calendar, Printer, MessageSquare, FileText, CheckCircle2 } from 'lucide-react';

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [dateQuery, setDateQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchInvoices();
  }, [phoneQuery, dateQuery]);

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

  const printTaxInvoice = () => {
    window.print();
  };

  const sendWhatsAppInvoice = (inv: any) => {
    const phone = inv.customers?.phone || '919999999999';
    const msg = encodeURIComponent(`Hello ${inv.customers?.customer_name || 'Customer'}, here is your tax invoice ${inv.invoice_number} from GanitPharma. Total Amount: ₹${Number(inv.final_amount).toFixed(2)}. Thank you for visiting!`);
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">GST Tax Invoices</h1>
          <p className="text-sm text-slate-500">Search, view, print, and share GST tax invoices with customers.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Mobile No..."
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateQuery}
              onChange={(e) => setDateQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-slate-900 text-sm">
          Generated Invoices ({invoices.length})
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
            <p className="text-xs font-medium">No invoices match your search filter.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3.5 font-semibold">Invoice No</th>
                <th className="p-3.5 font-semibold">Customer Name</th>
                <th className="p-3.5 font-semibold">Phone</th>
                <th className="p-3.5 font-semibold">Date & Time</th>
                <th className="p-3.5 font-semibold">Net Amount</th>
                <th className="p-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                  <td className="p-3.5 font-medium text-slate-800">{inv.customers?.customer_name || 'Walk-in Customer'}</td>
                  <td className="p-3.5 font-mono text-slate-600">{inv.customers?.phone || 'N/A'}</td>
                  <td className="p-3.5 text-slate-500">{new Date(inv.created_at).toLocaleString()}</td>
                  <td className="p-3.5 font-extrabold text-amber-700">₹{Number(inv.final_amount).toFixed(2)}</td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="bg-slate-900 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow hover:bg-slate-800 transition"
                    >
                      View Tax Invoice
                    </button>
                    <button
                      onClick={() => sendWhatsAppInvoice(inv)}
                      className="bg-green-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow hover:bg-green-700 transition inline-flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tax Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 relative print:shadow-none print:w-full">
            
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-900">GST Tax Invoice</h3>
                <span className="text-xs text-slate-500">Original for Recipient</span>
              </div>
              <div className="flex gap-2">
                <button onClick={printTaxInvoice} className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-500 hover:text-slate-900 font-bold px-2">✕</button>
              </div>
            </div>

            {/* Printable Tax Invoice Layout */}
            <div className="space-y-4 text-xs text-slate-800">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-black text-slate-950">Ganit<span className="text-amber-500">Pharma</span></h1>
                  <p className="text-slate-500">12 MG Road, Bengaluru, Karnataka - 560001</p>
                  <p className="text-slate-500 font-mono mt-1">GSTIN: 29ABCDE1234F1Z5</p>
                </div>
                <div className="text-right">
                  <strong className="text-sm block">{selectedInvoice.invoice_number}</strong>
                  <span className="text-slate-500">Date: {new Date(selectedInvoice.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Details</span>
                  <strong className="text-slate-900">{selectedInvoice.customers?.customer_name || 'Walk-in Customer'}</strong>
                  <div className="text-slate-600 font-mono">{selectedInvoice.customers?.phone || 'No phone provided'}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Status</span>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                    {selectedInvoice.payment_status}
                  </span>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 uppercase text-slate-600 text-[10px]">
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">Batch</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">GST %</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.sale_items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-900">{item.products?.product_name || 'Pharmaceutical Item'}</td>
                      <td className="p-2.5 font-mono text-slate-600">{item.product_batches?.batch_number || 'DEFAULT'}</td>
                      <td className="p-2.5">{item.quantity_sold}</td>
                      <td className="p-2.5">{item.gst_percent}%</td>
                      <td className="p-2.5 text-right font-bold">₹{Number(item.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-slate-200 pt-3 space-y-1 text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{Number(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Included GST Tax:</span>
                  <span>₹{Number(selectedInvoice.gst_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-2 border-t border-slate-100">
                  <span>Net Payable Amount:</span>
                  <span className="text-amber-700">₹{Number(selectedInvoice.final_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-6 border-t border-slate-100">
                Certified that the particulars given above are true and correct. Computer Generated Tax Invoice.
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
