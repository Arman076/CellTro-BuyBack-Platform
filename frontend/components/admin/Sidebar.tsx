'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  LayoutDashboard,
  FolderTree,
  Tags,
  Smartphone,
  Layers3,
  Upload,
  ClipboardList,
  IndianRupee,
  MonitorCog,
  X,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Categories',
    href: '/admin/catalogue/categories',
    icon: FolderTree,
  },
  {
    name: 'Brands',
    href: '/admin/catalogue/brands',
    icon: Tags,
  },
  {
    name: 'Models',
    href: '/admin/catalogue/models',
    icon: Smartphone,
  },
  {
  name: 'Variant Attributes',
  href: '/admin/catalogue/attributes',
  icon: Tags,
},
  {
    name: 'RAM / Storage',
    href: '/admin/catalogue/variants',
    icon: Layers3,
  },
  {
    name: 'Catalogue Upload',
    href: '/admin/catalogue/import',
    icon: Upload,
  },
  {
    name: 'Questionnaire',
    href: '/admin/questionnaire',
    icon: ClipboardList,
  },
  {
    name: 'Pricing',
    href: '/admin/pricing',
    icon: IndianRupee,
  },
  {
    name: 'Website Display',
    href: '/admin/website-content',
    icon: MonitorCog,
  },
];

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50 h-screen w-72
          border-r border-gray-200 bg-white
          transition-transform duration-300
          lg:translate-x-0

          ${
            open
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Buyback Admin
            </h1>

            <p className="text-xs text-gray-500">
              Management Portal
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="h-[calc(100vh-64px)] overflow-y-auto p-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Management
          </p>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              const active =
                pathname === item.href ||
                (item.href !== '/admin' &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 rounded-xl px-3 py-2.5
                    text-sm font-medium transition

                    ${
                      active
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon size={19} />

                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}