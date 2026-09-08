'use client';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function PendingActivationPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-slate-200">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-2xl font-black text-slate-900">Registration Successful</h2>
        <p className="text-xs text-slate-600 font-medium">
          Your workspace has been registered and is pending administrator activation. You can close this window. Once activated, you can log in directly with your credentials.
        </p>
        <div className="pt-4">
          <Link
            href="/login"
            className="inline-block w-full py-3 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition"
          >
            Go to Login Page
          </Link>
        </div>
      </div>
    </div>
  );
}
