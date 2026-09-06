"use client";

import Link from "next/link";

import {
  Search,
  Smartphone,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import type {
  Brand,
} from "@/lib/customer-api";

type BrandGridProps = {
  brands: Brand[];
  categorySlug: string;
  categoryName: string;
};

export default function BrandGrid({
  brands,
  categorySlug,
  categoryName,
}: BrandGridProps) {
  const [search, setSearch] =
    useState("");

  const filteredBrands = useMemo(
    () => {
      const query = search
        .trim()
        .toLowerCase();

      return brands
        .filter(
          (brand) =>
            brand.isActive,
        )
        .filter(
          (brand) =>
            !query ||
            brand.name
              .toLowerCase()
              .includes(query),
        )
        .sort(
          (a, b) =>
            a.displayOrder -
            b.displayOrder,
        );
    },
    [brands, search],
  );

  return (
    <section className="customer-brand-browser">

      {/* =========================
          HEADING
      ========================= */}

      <div className="brand-section-heading">
        <div>
          <span className="brand-heading-label">
            CHOOSE BRAND
          </span>

          <h2>
            Sell your {categoryName}
          </h2>
        </div>

        <span className="brand-count">
          {filteredBrands.length}{" "}
          {filteredBrands.length === 1
            ? "Brand"
            : "Brands"}
        </span>
      </div>

      {/* =========================
          SEARCH
      ========================= */}

      <div className="brand-search-box">
        <Search size={18} />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder={`Search ${categoryName} brands`}
          aria-label={`Search ${categoryName} brands`}
        />

        {search && (
          <button
            type="button"
            onClick={() =>
              setSearch("")
            }
          >
            Clear
          </button>
        )}
      </div>

      {/* =========================
          BRAND GRID
      ========================= */}

      {filteredBrands.length === 0 ? (
        <div className="brand-empty-state">
          <Smartphone size={38} />

          <h3>
            No brands found
          </h3>

          <p>
            Try searching with another
            brand name.
          </p>
        </div>
      ) : (
        <div className="customer-brand-grid">

          {filteredBrands.map(
            (brand) => (
              <Link
                key={brand.id}
                href={`/sell/${categorySlug}/${brand.slug}`}
                className="customer-brand-card customer-premium-card"
                aria-label={`Sell ${brand.name} ${categoryName}`}
              >

                {/* LOGO */}

                <div className="brand-logo-box">
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="brand-logo-fallback">
                      {brand.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                {/* NAME */}

                <h3>
                  {brand.name}
                </h3>

                <span className="brand-card-action">
                  Select Brand
                </span>

              </Link>
            ),
          )}

        </div>
      )}

    </section>
  );
}