'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { CheckCircle2, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    tradingName: '',
    legalName: '',
    gstin: '',
    drugLicence: 'MH-MUM-20B-4412',
    phone: '',
    email: '',
    address: '',
    invoicePrefix: 'INV',
    lowStockThreshold: 10,
    expiryAlertDays: 90,
    receiptFormat: 'a5',
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchOrg() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        router.push('/login');
        return;
      }

      const user = session.user;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileData?.organization_id) {
        const { data } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.organization_id)
          .single();

        if (data) {
          setProfile(prev => ({
            ...prev,
            tradingName: data.name || '',
            legalName: data.owner_name || '',
            gstin: data.gstin || '',
            phone: data.phone || '',
            email: data.email || user.email || '',
            address: data.address || '',
          }));
        }
      }
      setLoading(false);
    }
    fetchOrg();
  }, [router, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profileData?.organization_id) return;

    const { error } = await supabase
      .from('organizations')
      .update({
        name: profile.tradingName,
        owner_name: profile.legalName,
        gstin: profile.gstin,
        phone: profile.phone,
        address: profile.address,
      })
      .eq('id', profileData.organization_id);

    if (!error) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-xs font-bold">Loading workspace...</div>;
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">Settings</h1>
          <p className="text-sm text-slate-500">Details here print on every GST invoice you issue.</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl text-xs transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-bold">Settings saved successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-950 text-sm">Pharmacy profile</h3>
            <p className="text-xs text-slate-400">Appears on invoice headers.</p>
          </div>

          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Trading name</label>
                <input
                  type="text"
                  value={profile.tradingName}
                  onChange={(e) => setProfile({ ...profile, tradingName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Legal name</label>
                <input
                  type="text"
                  value={profile.legalName}
                  onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={profile.gstin}
                  onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Drug licence no.</label>
                <input
                  type="text"
                  value={profile.drugLicence}
                  onChange={(e) => setProfile({ ...profile, drugLicence: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl font-medium text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <button type="submit" className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow transition cursor-pointer">
              Save profile
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-950 text-sm">Billing preferences</h3>
              <p className="text-xs text-slate-400">Invoice numbers run in sequence per pharmacy.</p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Invoice prefix</label>
                  <input type="text" value={profile.invoicePrefix} onChange={(e) => setProfile({ ...profile, invoicePrefix: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium" />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Low stock threshold</label>
                  <input type="number" value={profile.lowStockThreshold} onChange={(e) => setProfile({ ...profile, lowStockThreshold: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium" />
                </div>
              </div>
              <button onClick={() => setSuccess(true)} className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow transition cursor-pointer">
                Save preferences
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-950 text-sm">Team</h3>
              <p className="text-xs text-slate-400">Roles decide who can edit settings and cancel invoices.</p>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
                <span className="font-mono text-slate-700">{profile.email || 'Admin Owner'}</span>
                <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full font-bold">Owner</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
