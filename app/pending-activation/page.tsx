'use client';
import { ShieldAlert } from 'lucide-react';

export default function PendingActivationPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4 border border-slate-200">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-2xl font-black text-slate-900">Activation Pending</h2>
        <p className="text-xs text-slate-600 font-medium">
          Your pharmacy workspace has been successfully registered. Access will be unlocked once the administrator activates your software license key.
        </p>
      </div>
    </div>
  );
}
