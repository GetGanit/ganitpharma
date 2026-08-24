'use client';
import { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);
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
    <aside 
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shrink-0 transition-all duration-300 ease-in-out select-none z-50 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div>
        <div className="h-16 px-4 flex items-center overflow-hidden border-b border-slate-800 whitespace-nowrap">
          <span className="text-lg font-bold text-white tracking-wide">
            {isExpanded ? <>Ganit<span className="text-amber-400">Pharma</span></> : <span className="text-amber-400 font-extrabold text-xl ml-1">G</span>}
          </span>
        </div>
        <nav className="p-3 space-y-1.5 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                title={!isExpanded ? item.name : undefined}
                className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-extrabold shadow-sm'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className={`whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                    {item.name}
                  </span>
                </div>
                {item.badge && isExpanded && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-amber-400'}`}>
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          title={!isExpanded ? 'Sign Out' : undefined}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-sm font-medium transition overflow-hidden"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={`whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
