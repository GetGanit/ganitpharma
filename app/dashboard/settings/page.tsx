'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { CheckCircle2, LogOut, Printer } from 'lucide-react';

export default function SettingsPage() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

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

    // Printer settings
    receiptFormat: 'a4',
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchOrg() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

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
        const orgId = profileData.organization_id;

        setOrganizationId(orgId);

        const { data } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
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

        // Load printer settings saved for this pharmacy/workstation.
        // These are intentionally stored locally because different
        // billing computers may use different printers.
        try {
          const savedPrinterFormat = localStorage.getItem(
            `ganit_pharma_printer_format_${orgId}`
          );

          if (
            savedPrinterFormat === 'a4' ||
            savedPrinterFormat === 'thermal80' ||
            savedPrinterFormat === 'thermal58'
          ) {
            setProfile(prev => ({
              ...prev,
              receiptFormat: savedPrinterFormat,
            }));
          }

          const savedInvoicePrefix = localStorage.getItem(
            `ganit_pharma_invoice_prefix_${orgId}`
          );

          const savedLowStockThreshold = localStorage.getItem(
            `ganit_pharma_low_stock_threshold_${orgId}`
          );

          if (savedInvoicePrefix) {
            setProfile(prev => ({
              ...prev,
              invoicePrefix: savedInvoicePrefix,
            }));
          }

          if (savedLowStockThreshold !== null) {
            setProfile(prev => ({
              ...prev,
              lowStockThreshold: Number(savedLowStockThreshold),
            }));
          }
        } catch (error) {
          console.error('Unable to load local settings:', error);
        }
      }

      setLoading(false);
    }

    fetchOrg();
  }, [router, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

  const handleSavePreferences = () => {
    if (!organizationId) return;

    try {
      // Save billing preferences locally for this pharmacy/workstation.
      localStorage.setItem(
        `ganit_pharma_invoice_prefix_${organizationId}`,
        profile.invoicePrefix
      );

      localStorage.setItem(
        `ganit_pharma_low_stock_threshold_${organizationId}`,
        String(profile.lowStockThreshold)
      );

      // Save printer format locally for this pharmacy/workstation.
      localStorage.setItem(
        `ganit_pharma_printer_format_${organizationId}`,
        profile.receiptFormat
      );

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Unable to save preferences:', error);
      alert('Unable to save preferences on this device.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs font-bold">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">
            Settings
          </h1>
          <p className="text-sm text-slate-500">
            Details here print on every GST invoice you issue.
          </p>
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
        {/* PHARMACY PROFILE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-950 text-sm">
              Pharmacy profile
            </h3>
            <p className="text-xs text-slate-400">
              Appears on invoice headers.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Trading name
                </label>
                <input
                  type="text"
                  value={profile.tradingName}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      tradingName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Legal name
                </label>
                <input
                  type="text"
                  value={profile.legalName}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      legalName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={profile.gstin}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      gstin: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Drug licence no.
                </label>
                <input
                  type="text"
                  value={profile.drugLicence}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      drugLicence: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      phone: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl font-medium text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Address
              </label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    address: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow transition cursor-pointer"
            >
              Save profile
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* BILLING PREFERENCES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-950 text-sm">
                Billing preferences
              </h3>
              <p className="text-xs text-slate-400">
                Invoice numbers run in sequence per pharmacy.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">
                    Invoice prefix
                  </label>

                  <input
                    type="text"
                    value={profile.invoicePrefix}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        invoicePrefix: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">
                    Low stock threshold
                  </label>

                  <input
                    type="number"
                    value={profile.lowStockThreshold}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        lowStockThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow transition cursor-pointer"
              >
                Save preferences
              </button>
            </div>
          </div>

          {/* PRINTER SETTINGS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4 text-slate-700" />
              </div>

              <div>
                <h3 className="font-bold text-slate-950 text-sm">
                  Printer settings
                </h3>
                <p className="text-xs text-slate-400">
                  Choose the paper format used by this billing computer.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Invoice / receipt format
                </label>

                <select
                  value={profile.receiptFormat}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      receiptFormat: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="a4">
                    A4 Printer — Full GST Invoice
                  </option>

                  <option value="thermal80">
                    Thermal Printer — 80mm
                  </option>

                  <option value="thermal58">
                    Thermal Printer — 58mm
                  </option>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                {profile.receiptFormat === 'a4' && (
                  <div>
                    <p className="font-bold text-slate-800">
                      A4 mode
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Designed for standard A4 paper and full GST invoice
                      printing.
                    </p>
                  </div>
                )}

                {profile.receiptFormat === 'thermal80' && (
                  <div>
                    <p className="font-bold text-slate-800">
                      80mm thermal mode
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Designed for common 80mm pharmacy billing/receipt
                      printers.
                    </p>
                  </div>
                )}

                {profile.receiptFormat === 'thermal58' && (
                  <div>
                    <p className="font-bold text-slate-800">
                      58mm thermal mode
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Designed for compact 58mm thermal receipt printers.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="font-bold text-amber-900">
                  How printer selection works
                </p>

                <p className="text-amber-800 mt-1 leading-relaxed">
                  The software cannot reliably detect the physical printer
                  connected to a computer from the browser. Select the format
                  that matches the printer being used at this billing
                  computer. The setting is saved on this device.
                </p>
              </div>

              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow transition cursor-pointer"
              >
                Save printer settings
              </button>
            </div>
          </div>

          {/* TEAM */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-950 text-sm">
                Team
              </h3>
              <p className="text-xs text-slate-400">
                Roles decide who can edit settings and cancel invoices.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
                <span className="font-mono text-slate-700">
                  {profile.email || 'Admin Owner'}
                </span>

                <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full font-bold">
                  Owner
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
