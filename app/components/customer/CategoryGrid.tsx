import Link from 'next/link';
import {
  ArrowRight,
  Laptop,
  MonitorSmartphone,
  Smartphone,
  Tablet,
  Watch,
} from 'lucide-react';

import type { Category } from '@/lib/customer-api';

type CategoryGridProps = {
  categories: Category[];
};

function getCategoryIcon(slug: string) {
  const normalizedSlug = slug.toLowerCase();

  if (
    normalizedSlug.includes('mobile') ||
    normalizedSlug.includes('phone')
  ) {
    return Smartphone;
  }

  if (normalizedSlug.includes('laptop')) {
    return Laptop;
  }

  if (normalizedSlug.includes('tablet')) {
    return Tablet;
  }

  if (
    normalizedSlug.includes('watch') ||
    normalizedSlug.includes('wearable')
  ) {
    return Watch;
  }

  return MonitorSmartphone;
}

export default function CategoryGrid({
  categories,
}: CategoryGridProps) {
  if (categories.length === 0) {
    return (
      <section
        id="sell-by-category"
        className="category-section"
      >
        <div className="section-container">

          <div className="section-heading">
            <span>SELL YOUR DEVICE</span>

            <h2>What would you like to sell?</h2>

            <p>
              Select a device category to continue.
            </p>
          </div>

          <div className="empty-state">
            <MonitorSmartphone size={36} />

            <h3>No categories available</h3>

            <p>
              Device categories will appear here once they are
              enabled.
            </p>
          </div>

        </div>
      </section>
    );
  }

  return (
    <section
      id="sell-by-category"
      className="category-section"
    >
      <div className="section-container">

        <div className="section-heading">
          <span>SELL YOUR DEVICE</span>

          <h2>What would you like to sell?</h2>

          <p>
            Choose your device category and get started in a
            few simple steps.
          </p>
        </div>

        <div className="category-grid">

          {categories.map((category) => {
            const Icon = getCategoryIcon(category.slug);

            return (
              <Link
  href={`/sell/${category.slug}`}
  className="category-card customer-premium-card"
              key={category.id}>
                <div className="category-icon">
                  <Icon size={36} strokeWidth={1.7} />
                </div>

                <div className="category-card-content">
                  <h3>{category.name}</h3>

                  <p>
                    Get an instant estimated value for your{' '}
                    {category.name.toLowerCase()}.
                  </p>

                  <span>
                    Sell now
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            );
          })}

        </div>

      </div>
    </section>
  );
}