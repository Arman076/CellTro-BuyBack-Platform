'use client';

import { useState } from 'react';
import { Menu, Bell, UserRound } from 'lucide-react';

import Sidebar from './Sidebar';

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-gray-200 p-2 hover:bg-gray-100 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Administration
              </p>

              <p className="hidden text-xs text-gray-500 sm:block">
                Catalogue & pricing management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
              <Bell size={20} />
            </button>

            <div className="flex items-center gap-2 rounded-full border border-gray-200 px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                <UserRound size={17} />
              </div>

              <span className="hidden pr-2 text-sm font-medium text-gray-700 sm:block">
                Admin
              </span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}