'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import {
  FolderTree,
  Smartphone,
  Tags,
  Layers3,
} from 'lucide-react';

import { API_BASE_URL } from '@/lib/api';

type DashboardSummary = {
  catalogue: {
    categories: number;
    brands: number;
    models: number;
    variants: number;
  };
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `${API_BASE_URL}/dashboard/summary`,
          {
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load dashboard (${response.status})`,
          );
        }

        const data: DashboardSummary = await response.json();

        setSummary(data);
      } catch (err) {
        console.error('Dashboard load error:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load dashboard',
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const cards = useMemo(
    () => [
      {
        title: 'Categories',
        value: summary?.catalogue.categories ?? 0,
        icon: FolderTree,
        href: '/admin/catalogue/categories',
      },
      {
        title: 'Brands',
        value: summary?.catalogue.brands ?? 0,
        icon: Tags,
        href: '/admin/catalogue/brands',
      },
      {
        title: 'Models',
        value: summary?.catalogue.models ?? 0,
        icon: Smartphone,
        href: '/admin/catalogue/models',
      },
      {
        title: 'Variants',
        value: summary?.catalogue.variants ?? 0,
        icon: Layers3,
        href: '/admin/catalogue/variants',
      },
    ],
    [summary],
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage your product catalogue and website.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-md"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 transition-colors group-hover:bg-gray-200">
                <Icon size={21} />
              </div>

              <p className="text-sm text-gray-500">
                {card.title}
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {loading ? '—' : card.value}
              </p>

              <p className="mt-3 text-xs font-medium text-gray-400 transition-colors group-hover:text-gray-700">
                View {card.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}