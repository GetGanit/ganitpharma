'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Shield, UserPlus, ArrowLeft, Lock, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [newStaff, setNewStaff] = useState({ email: '', fullName: '', role: 'cashier', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id);

      if (data) setStaffList(data);
    }
    setLoading(false);
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      setError('Organization context not found.');
      setLoading(false);
      return;
    }

    // 1. Create auth user for staff
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newStaff.email,
      password: newStaff.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const newUserId = authData.user?.id;

    if (newUserId) {
      // 2. Insert into profiles with specified role
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: newUserId,
          organization_id: profile.organization_id,
          full_name: newStaff.fullName,
          role: newStaff.role,
        },
      ]);

      if (profileError) {
        setError(profileError.message);
      } else {
        setSuccess(`Staff account created successfully for ${newStaff.fullName} (${newStaff.role})!`);
        setNewStaff({ email: '', fullName: '', role: 'cashier', password: '' });
        fetchStaff();
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-slate-500 hover:text-slate-900 transition flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </a>
          <span className="text-lg font-bold text-slate-900">Staff Roles & Permissions Management</span>
        </div>
      </header>

      {/* Main Body */}
      <div className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add Staff Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand-yellow" /> Add Staff Member
            </h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaff.fullName}
                  onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  placeholder="Rahul Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  placeholder="rahul@pharmacy.in"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Role & Access Level</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                >
                  <option value="cashier">Cashier (POS & Inventory View)</option>
                  <option value="pharmacist">Pharmacist (POS, Inventory & Purchasing)</option>
                  <option value="owner">Owner / Admin (Full Access & Tax Reports)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-yellow hover:bg-brand-yellow-hover text-slate-950 font-bold rounded-xl text-sm shadow transition"
              >
                {loading ? 'Provisioning...' : 'Create Staff Account'}
              </button>
            </form>
          </div>

          {/* Staff List Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-slate-900">Active Tenant Staff Members ({staffList.length})</div>
            {staffList.length === 0 ? (
              <div className="p-16 text-center text-slate-400">No staff accounts registered yet.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-900">{staff.full_name || 'Unnamed User'}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${staff.role === 'owner' ? 'bg-purple-100 text-purple-800' : staff.role === 'pharmacist' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                          {staff.role}
                        </span>
                      </td>
                      <td className="p-4 text-green-600 font-semibold text-xs flex items-center gap-1">
                        <UserCheck className="w-4 h-4" /> Active Tenant Access
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
