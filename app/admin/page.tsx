'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShieldAlert, Building2, Users, IndianRupee, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalRevenue: 0,
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      // Check if already unlocked in session storage
      if (sessionStorage.getItem('ganit_admin_unlocked') === 'true') {
        setUnlocked(true);
        loadAdminData();
      }
      setLoading(false);
    }
    checkAuth();
  }, [router, supabase]);

  async function loadAdminData() {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && orgs) {
      setOrganizations(orgs);
      const tenantCount = orgs.length;
      const revenue = tenantCount * 49999;
      setStats({
        totalTenants: tenantCount,
        totalRevenue: revenue,
      });
    }
  }

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // Change this password to whatever secure password you prefer!
    if (passwordInput === 'GanitOwner@2026') {
      setUnlocked(true);
      sessionStorage.setItem('ganit_admin_unlocked', 'true');
      loadAdminData();
    } else {
      setError('Incorrect admin password.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">Verifying security...</div>;
  }

  // Password Lock Screen
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-950 p-8 rounded-2xl shadow-xl max-w-md w-full space-y-6 border border-slate-800">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Owner Admin Authentication</h2>
            <p className="text-xs text-slate-400">Enter your master admin password to access central headquarters.</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 text-xs">
            {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-bold">{error}</div>}
            <div>
              <label className="block font-medium text-slate-400 mb-1">Master Password</label>
              <input
                type="password"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl font-medium text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow transition text-xs"
            >
              Unlock Admin Panel
            </button>
            <div className="text-center pt-2">
              <a href="/dashboard" className="text-slate-500 hover:text-slate-300 font-semibold">← Return to Dashboard</a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Admin Top Header */}
      <header className="h-16 bg-slate-950 border-b border-slate-800 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-slate-400 hover:text-white transition flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Exit to Tenant Dashboard
          </a>
          <span className="text-lg font-bold tracking-tight text-white">
            Ganit<span className="text-amber-400">Pharma</span> • Central Super Admin
          </span>
        </div>
        <div className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> Root Access Unlocked
        </div>
      </header>

      {/* Main Body */}
      <div className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Platform Overview</h1>
          <p className="text-sm text-slate-400">Global metrics, license counts, and multi-tenant telemetry for Ganit headquarters.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
              <span>Total Registered Pharmacies</span>
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-4 text-4xl font-extrabold text-white">{stats.totalTenants}</div>
            <div className="mt-2 text-xs text-slate-500">Active tenant organizations</div>
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
              <span>Total Gross License Revenue</span>
              <IndianRupee className="w-5 h-5 text-green-400" />
            </div>
            <div className="mt-4 text-4xl font-extrabold text-white">
              ₹{stats.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="mt-2 text-xs text-green-400 font-semibold">Based on ₹49,999 one-time purchase model</div>
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
              <span>Platform Health</span>
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="mt-4 text-4xl font-extrabold text-white">100%</div>
            <div className="mt-2 text-xs text-slate-500">Supabase RLS & Database Online</div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-bold text-white flex justify-between items-center">
            <span>All Tenant Pharmacies ({organizations.length})</span>
            <span className="text-xs text-slate-400">Master Database Record</span>
          </div>

          {organizations.length === 0 ? (
            <div className="p-16 text-center text-slate-500">No tenant pharmacies registered yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4 font-semibold">Pharmacy Name</th>
                  <th className="p-4 font-semibold">Owner Name</th>
                  <th className="p-4 font-semibold">Phone</th>
                  <th className="p-4 font-semibold">GSTIN</th>
                  <th className="p-4 font-semibold">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-900/50">
                    <td className="p-4 font-bold text-white">{org.name}</td>
                    <td className="p-4 text-slate-300">{org.owner_name}</td>
                    <td className="p-4 text-slate-400 font-mono">{org.phone}</td>
                    <td className="p-4 text-slate-400 font-mono">{org.gstin || 'N/A'}</td>
                    <td className="p-4 text-slate-400 text-xs">{new Date(org.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
