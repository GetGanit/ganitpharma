import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { CheckCircle2, LogOut } from 'lucide-react';
import { revalidatePath } from 'next/cache';

export default async function SettingsPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch the specific organization linked to this exact authenticated user ID
  const { data: profileData } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  let organization = null;
  if (profileData?.organization_id) {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profileData.organization_id)
      .single();
    organization = data;
  }

  async function handleSignOut() {
    'use server';
    const sb = createClient();
    await sb.auth.signOut();
    redirect('/login');
  }

  async function handleSave(formData: FormData) {
    'use server';
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { data: pData } = await sb
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!pData?.organization_id) return;

    await sb
      .from('organizations')
      .update({
        name: formData.get('tradingName'),
        owner_name: formData.get('legalName'),
        gstin: formData.get('gstin'),
        phone: formData.get('phone'),
        address: formData.get('address'),
      })
      .eq('id', pData.organization_id);

    revalidatePath('/dashboard/settings');
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">Settings</h1>
          <p className="text-sm text-slate-500">Details here print on every GST invoice you issue.</p>
        </div>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pharmacy Profile */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-950 text-sm">Pharmacy profile</h3>
            <p className="text-xs text-slate-400">Appears on invoice headers.</p>
          </div>

          <form action={handleSave} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Trading name</label>
                <input
                  type="text"
                  name="tradingName"
                  defaultValue={organization?.name || ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Legal name</label>
                <input
                  type="text"
                  name="legalName"
                  defaultValue={organization?.owner_name || ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">GSTIN</label>
                <input
                  type="text"
                  name="gstin"
                  defaultValue={organization?.gstin || ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Drug licence no.</label>
                <input
                  type="text"
                  defaultValue="MH-MUM-20B-4412"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Phone</label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={organization?.phone || ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  defaultValue={organization?.email || user.email || ''}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl font-medium text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Address</label>
              <input
                type="text"
                name="address"
                defaultValue={organization?.address || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <button type="submit" className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow transition cursor-pointer">
              Save profile
            </button>
          </form>
        </div>

        {/* Billing Preferences & Team */}
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
                  <input type="text" defaultValue="INV" className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium" />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Low stock threshold</label>
                  <input type="number" defaultValue={10} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Expiry alert (days)</label>
                  <input type="number" defaultValue={90} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium" />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Receipt format (a5/thermal)</label>
                  <input type="text" defaultValue="a5" className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium" />
                </div>
              </div>
              <button type="button" className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow transition cursor-pointer">
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
                <span className="font-mono text-slate-700">{user.email}</span>
                <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full font-bold">Owner</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
