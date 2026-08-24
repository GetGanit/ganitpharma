'use client';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Truck, 
  FileText, 
  Users, 
  BarChart3, 
  ShieldCheck, 
  Settings,
  LogOut
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Billing / POS', href: '/dashboard/pos', icon: ShoppingCart, badge: 'F2' },
    { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
    { name: 'Purchases', href: '/dashboard/purchases', icon: Truck },
    { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
    { name: 'Customers', href: '/dashboard/crm', icon: Users },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    { name: 'Compliance', href: '/dashboard/compliance', icon: ShieldCheck },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shrink-0 transition-all duration-300 ease-in-out select-none z-40">
      <div>
        <div className="h-16 px-6 flex items-center border-b border-slate-800">
          <span className="text-lg font-bold text-white tracking-wide">
            Ganit<span className="text-amber-400">Pharma</span>
          </span>
        </div>
        <nav className="p-4 space-y-1 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-extrabold shadow-sm'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-amber-400'}`}>
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-sm font-medium transition"
        >
          <LogOut className="w-5 h-5 shrink-0" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
