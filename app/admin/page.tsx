'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShieldAlert, Building2, Users, IndianRupee, ArrowLeft, CheckCircle2, Lock, Mail, Key, Power, Trash2 } from 'lucide-react';

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [adminEmail, setAdminEmail] = useState('durgabm2001@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalRevenue: 0,
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      if (sessionStorage.getItem('ganit_admin_unlocked') === 'true') {
        setUnlocked(true);
        loadAdminData();
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  async function loadAdminData() {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && orgs) {
      setOrganizations(orgs);
      const tenantCount = orgs.filter(o => o.is_active === true).length;
      const revenue = tenantCount * 49999;
      setStats({
        totalTenants: tenantCount,
        totalRevenue: revenue,
      });
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (adminEmail !== 'durgabm2001@gmail.com') {
      setError('Unauthorized: Restricted access for platform owner only.');
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (authError) {
      setError('Incorrect admin password.');
      setLoading(false);
    } else {
      setUnlocked(true);
      sessionStorage.setItem('ganit_admin_unlocked', 'true');
      loadAdminData();
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccessMsg(null);
    
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail('durgabm2001@gmail.com', {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccessMsg('Recovery link sent to durgabm2001@gmail.com. Check your inbox.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network request failed. Check Supabase connection.');
    }
  };

  const toggleTenantStatus = async (orgId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from('organizations')
      .update({ is_active: newStatus })
      .eq('id', orgId);

    if (!error) {
      loadAdminData();
    } else {
      alert('Failed to update tenant status: ' + error.message);
    }
  };

  const deleteOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Are you sure you want to delete ${orgName}? This action cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (!error) {
      loadAdminData();
    } else {
      alert('Failed to delete organization: ' + error.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400 text-sm font-medium">Verifying owner credentials...</div>;
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full space-y-6 border border-slate-200 text-slate-900 relative">
          <div className="text-center space-y-2">
            <span className="inline-block bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              RESTRICTED ACCESS
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">GanitPharma Admin</h2>
            <p className="text-xs text-slate-500 font-medium">Sign in with your central master admin credentials</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold">{error}</div>}
            {successMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl font-bold">{successMsg}</div>}
            
            <div>
              <label className="block font-bold text-slate-700 mb-1">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] font-bold text-blue-600 hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Access Admin Dashboard 🔑
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              sessionStorage.removeItem('ganit_admin_unlocked');
              setUnlocked(false);
            }}
            className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1 text-xs font-bold bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Lock Admin Session
          </button>
          <span className="text-lg font-black tracking-tight text-slate-900">
            Ganit<span className="text-amber-500">Pharma</span> • Independent Headquarters Admin
          </span>
        </div>
        <div className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-black flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> Root Owner Verified (durgabm2001@gmail.com)
        </div>
      </header>

      <div className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Platform Analytics & Software Directory</h1>
          <p className="text-xs text-slate-500 font-medium">Independent supervision of software purchases, license revenue, and global user directory.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Total Active Pharmacies</span>
              <Building2 className="w-5 h-5 text-amber-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">{stats.totalTenants}</div>
            <div className="mt-1 text-[11px] text-slate-400 font-medium">Licensed software installations</div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Total Gross Software Revenue</span>
              <IndianRupee className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">
              ₹{stats.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 font-bold">Calculated at ₹49,999 per license model</div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Directory Health</span>
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">Operational</div>
            <div className="mt-1 text-[11px] text-slate-400 font-medium">Master database secure</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-slate-900 text-xs flex justify-between items-center">
            <span>Software Purchases & User Directory ({organizations.length})</span>
            <span className="text-[11px] text-slate-500 font-bold">Supervisory Access Control</span>
          </div>

          {organizations.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs font-bold">No registered software users found in directory.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 uppercase text-slate-600 border-b border-slate-200 text-[10px] font-black">
                <tr>
                  <th className="p-3.5">Pharmacy Name</th>
                  <th className="p-3.5">Owner Details</th>
                  <th className="p-3.5">Phone & Email</th>
                  <th className="p-3.5">GSTIN</th>
                  <th className="p-3.5">Purchase / Registered Date</th>
                  <th className="p-3.5 text-right">Software Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {organizations.map((org) => {
                  const isActive = org.is_active === true;

                  return (
                    <tr key={org.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-bold text-slate-900 text-sm">
                        {org.name}
                        <span className="block text-[10px] text-slate-400 font-mono">ID: {org.id.slice(0, 8)}...</span>
                      </td>
                      <td className="p-3.5 text-slate-800 font-bold">{org.owner_name}</td>
                      <td className="p-3.5">
                        <div className="font-mono text-slate-800">{org.phone}</div>
                        <div className="text-slate-500">{org.email}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{org.gstin || 'N/A'}</td>
                      <td className="p-3.5 text-slate-500">{new Date(org.created_at).toLocaleString()}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleTenantStatus(org.id, isActive)}
                            className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition shadow-sm flex items-center gap-1 cursor-pointer ${
                              isActive 
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            <Power className="w-3 h-3" /> {isActive ? 'Active (Revoke)' : 'Pending Approval (Activate)'}
                          </button>
                          <button
                            onClick={() => deleteOrganization(org.id, org.name)}
                            title="Delete Entry"
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
  );
}
