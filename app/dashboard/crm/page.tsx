'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Users, MessageSquare, Search, Calendar, FileText, Eye } from 'lucide-react';

export default function CRMPage() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  async function fetchCustomers() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const orgId = user.user_metadata?.organization_id;

    if (orgId) {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('phone', `%${searchQuery}%`);
      }

      const { data } = await query;
      if (data) {
        setCustomers(data);
      }
    }
    setLoading(false);
  }

  async function viewCustomerHistory(customer: any) {
    setSelectedCustomer(customer);
    setLoadingInvoices(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const orgId = user.user_metadata?.organization_id;

    if (orgId) {
      const { data } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .eq('organization_id', orgId)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (data) setCustomerInvoices(data);
    }
    setLoadingInvoices(false);
  }

  const sendWhatsAppReminder = (phone: string, name: string) => {
    const message = encodeURIComponent(`Hello ${name}, greetings from GanitPharma! It's time for your regular medicine refill. Visit us or order via WhatsApp.`);
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer by mobile number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
          <div className="text-xs text-slate-500">
            Customer Database Directory Active
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-slate-900">Registered Customers ({customers.length})</div>
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm">Loading CRM database...</div>
            ) : customers.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto stroke-1" />
                <p className="text-sm font-medium">No customer records found.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Phone</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className={`hover:bg-slate-50/55 cursor-pointer ${selectedCustomer?.id === c.id ? 'bg-amber-50/60' : ''}`}>
                      <td className="p-4 font-bold text-slate-900" onClick={() => viewCustomerHistory(c)}>{c.customer_name}</td>
                      <td className="p-4 text-slate-700 font-mono" onClick={() => viewCustomerHistory(c)}>{c.phone}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => viewCustomerHistory(c)}
                          className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow hover:bg-slate-800 transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Invoices
                        </button>
                        <button
                          onClick={() => sendWhatsAppReminder(c.phone, c.customer_name)}
                          className="bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow hover:bg-green-700 transition inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Refill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" /> Customer Invoices Archive
            </h3>

            {!selectedCustomer ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Select a customer from the table to view their purchase history.
              </div>
            ) : loadingInvoices ? (
              <div className="text-center py-12 text-slate-500 text-sm">Fetching past invoices...</div>
            ) : customerInvoices.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No sales invoices found for {selectedCustomer.customer_name}.</div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                <div className="text-xs text-slate-500 font-medium">Showing records for: <strong className="text-slate-900">{selectedCustomer.customer_name}</strong></div>
                {customerInvoices.map((inv) => (
                  <div key={inv.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{inv.invoice_number}</span>
                      <span className="text-amber-800">₹{Number(inv.final_amount).toFixed(2)}</span>
                    </div>
                    <div className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(inv.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
