'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, BarChart2,
  Users, Settings, Zap, CreditCard, TruckIcon, ChevronLeft, ChevronRight,
  Boxes, Wallet, PackagePlus, ArrowRightLeft, PackageCheck, ClipboardCheck,
  Barcode, ShieldAlert, UserCheck, Store, Bell, Receipt
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navSections = [
  {
    title: 'Catalog & Inventory',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/products', icon: Package, label: 'Products' },
      { href: '/products/barcodes/labels', icon: Barcode, label: 'Barcode Studio' },
      { href: '/branches', icon: Store, label: 'Branches' },
      { href: '/inventory/stock', icon: Warehouse, label: 'Inventory Stock' },
      { href: '/inventory/entry', icon: PackagePlus, label: 'Stock Entry' },
      { href: '/inventory/transfers', icon: ArrowRightLeft, label: 'Stock Transfers' },
      { href: '/inventory/stock-counts', icon: ClipboardCheck, label: 'Stock Counts' },
    ],
  },
  {
    title: 'Store Operations',
    items: [
      { href: '/pos', icon: CreditCard, label: 'POS Terminal' },
      { href: '/pos/today', icon: Receipt, label: "Today's Live Sales" },
      { href: '/sales', icon: ShoppingCart, label: 'Sales Orders' },
      { href: '/customers', icon: UserCheck, label: 'Customers' },
      { href: '/purchasing/orders', icon: TruckIcon, label: 'Purchasing' },
      { href: '/inventory/receiving', icon: PackageCheck, label: 'Goods Receiving' },
      { href: '/finance', icon: Wallet, label: 'Finance' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/notifications', icon: Bell, label: 'Notifications' },
      { href: '/reports', icon: BarChart2, label: 'Reports' },
      { href: '/users', icon: Users, label: 'Team & Roles' },
      { href: '/settings', icon: Settings, label: 'Settings' },
      { href: '/admin/tenants', icon: ShieldAlert, label: 'Super Admin' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-slate-950 border-r border-slate-800/80 text-slate-100 transition-all duration-300 relative select-none',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1px] shadow-md shadow-blue-500/20 flex items-center justify-center flex-shrink-0">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Boxes className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-base font-bold tracking-tight text-white block truncate">
                InventoryOS
              </span>
              <span className="text-[10px] font-medium text-slate-400 block tracking-wide uppercase">
                Enterprise
              </span>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white hover:bg-slate-800/80 h-8 w-8 ml-auto rounded-lg transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar scroll-smooth pr-1.5">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[11px] font-semibold text-slate-500 tracking-wider uppercase mb-1.5">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30 shadow-sm shadow-blue-500/10'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110',
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {isActive && (
                    <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#38bdf8]" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
