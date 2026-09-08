'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function PendingActivationPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Poll the organizations table every 3 seconds to check if activation status flipped to true
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check the user's profile and linked organization status
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, organizations(is_active)')
        .eq('id', user.id)
        .single();

      if (profile?.organizations?.is_active === true) {
        clearInterval(interval);
        router.push('/dashboard');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-slate-200">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-2xl font-black text-slate-900">Activation Pending</h2>
        <p className="text-xs text-slate-600 font-medium">
          Your pharmacy workspace has been registered. Access will automatically unlock once the administrator activates your software license key.
        </p>
        <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> Waiting for admin activation...
        </div>
      </div>
    </div>
  );
}
