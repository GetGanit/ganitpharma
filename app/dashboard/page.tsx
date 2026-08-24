'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  ShoppingBag, 
  AlertTriangle, 
  TrendingUp, 
  LogOut, 
  ShieldAlert,
  ArrowUpRight,
  PlusCircle,
  Calendar
} from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('GanitPharma Pharmacy');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({
    periodSales: '₹0.00',
    invoiceCount: 0,
    totalProducts: 0,
    lowStockCount: 0,
    pendingPOs: 0,
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch user profile & organization name
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, full_name, role')
        .eq('id', user.id)
        .single();

      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.organization_id)
          .single();
        
        if (org) setOrgName(org.name);

        // Fetch product count
        const { count: prodCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id);

        // Fetch sales for the selected date
        const startOfDay = `${selectedDate}T00:00:00`;
        const endOfDay = `${selectedDate}T23:59:59`;

        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('total_amount')
          .eq('organization_id', profile.organization_id)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);

        let totalSales = 0;
        let count = 0;
        if (!salesError && salesData) {
          count = salesData.length;
          totalSales = salesData.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
        }

        setStats({
          periodSales: `₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          invoiceCount: count,
          totalProducts: prodCount || 0,
          lowStockCount: 0, // Will link to stock threshold query in inventory module
          pendingPOs: 0,
        });
      }

      setLoading(false);
    }

    loadDashboardData();
  }, [router, supabase, selectedDate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 font-medium">
        Loading GanitPharma Workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col justify-between border-r border-slate-800">
        <div>
          <div className="h-16 px-6 flex items-center border-b border-slate-800">
            <span className="text-xl font-bold tracking-tight text-white">
              Ganit<span className="text-brand-yellow">Pharma</span>
            </span>
          </div>
          <nav className="p-4 space-y-1">
            <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-yellow text-slate-950 font-bold text-sm">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </a>
            <a href="/dashboard/pos" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-300 transition text-sm font-medium">
              <Receipt className="w-4 h-4" /> POS / Billing <span className="ml-auto text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-bold">F2</span>
            </a>
            <a href="/dashboard/inventory" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-300 transition text-sm font-medium">
              <Package className="w-4 h-4" /> Inventory & Stock
            </a>
            <a href="/dashboard/purchases" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-300 transition text-sm font-medium">
              <ShoppingBag className="w-4 h-4" /> Purchases & POs
            </a>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900">{orgName}</h1>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-semibold border border-slate-200">Active Tenant</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard/pos" className="bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> New Bill (POS)
            </a>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Pharmacy Overview</h2>
              <p className="text-sm text-slate-600">Track sales performance and operational health metrics.</p>
            </div>
            
            {/* Date Selector for Historical Sales Audit */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Sales Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-sm font-medium">
                <span>Sales for {selectedDate}</span>
                <TrendingUp className="w-4 h-4 text-brand-green" />
              </div>
              <div className="mt-4 text-3xl font-extrabold text-slate-900">{stats.periodSales}</div>
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <span className="text-slate-900 font-semibold">{stats.invoiceCount}</span> invoices completed on this date
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-sm font-medium">
                <span>Total Catalog Items</span>
                <Package className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-4 text-3xl font-extrabold text-slate-900">{stats.totalProducts}</div>
              <div className="mt-2 text-xs text-slate-500">Active SKUs in inventory</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-sm font-medium">
                <span>Low-Stock Alerts</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-4 text-3xl font-extrabold text-slate-900">{stats.lowStockCount}</div>
              <div className="mt-2 text-xs text-amber-600 font-medium">Requires reordering</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-sm font-medium">
                <span>Pending POs</span>
                <ShieldAlert className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-4 text-3xl font-extrabold text-slate-900">{stats.pendingPOs}</div>
              <div className="mt-2 text-xs text-slate-500">Awaiting distributor confirmation</div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Quick Operational Shortcuts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a href="/dashboard/pos" className="p-4 rounded-xl border border-slate-200 hover:border-brand-yellow hover:bg-amber-50/50 transition flex items-center justify-between group">
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-amber-900">Launch POS Billing</div>
                  <div className="text-xs text-slate-500 mt-0.5">Barcode scanning & loose strips</div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600" />
              </a>

              <a href="/dashboard/inventory" className="p-4 rounded-xl border border-slate-200 hover:border-brand-yellow hover:bg-amber-50/50 transition flex items-center justify-between group">
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-amber-900">Add Inventory / Batch</div>
                  <div className="text-xs text-slate-500 mt-0.5">FEFO tracking & stock entry</div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600" />
              </a>

              <a href="/dashboard/purchases" className="p-4 rounded-xl border border-slate-200 hover:border-brand-yellow hover:bg-amber-50/50 transition flex items-center justify-between group">
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-amber-900">Import Distributor Bill</div>
                  <div className="text-xs text-slate-500 mt-0.5">CSV/Excel column mapping</div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600" />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
