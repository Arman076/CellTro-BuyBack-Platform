"use client";

import Link from "next/link";

import {
  Search,
  Smartphone,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Product,
  ProductSeries,
} from "@/lib/customer-api";

type ModelGridProps = {
  products: Product[];
  categorySlug: string;
  brandSlug: string;
  brandName: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

export default function ModelGrid({
  products,
  categorySlug,
  brandSlug,
  brandName,
}: ModelGridProps) {
  const [search, setSearch] =
    useState("");

  const [
    selectedSeriesId,
    setSelectedSeriesId,
  ] = useState<number | null>(null);

  const [
    series,
    setSeries,
  ] = useState<ProductSeries[]>([]);

  /* =========================
     LOAD ALL ACTIVE SERIES
  ========================= */

  useEffect(() => {
    async function loadSeries() {
      if (products.length === 0) {
        setSeries([]);
        return;
      }

      const categoryId =
        products[0].categoryId;

      const brandId =
        products[0].brandId;

      try {
        const response = await fetch(
          `${API_BASE_URL}/product-series?categoryId=${categoryId}&brandId=${brandId}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            "Series load failed",
          );
        }

        const data: ProductSeries[] =
          await response.json();

        const activeSeries = data
          .filter(
            (item) =>
              item.isActive,
          )
          .sort(
            (a, b) =>
              a.displayOrder -
              b.displayOrder,
          );

        setSeries(activeSeries);
      } catch (error) {
        console.error(
          "Failed to load series:",
          error,
        );

        setSeries([]);
      }
    }

    void loadSeries();
  }, [products]);

  /* =========================
     FILTER PRODUCTS
  ========================= */

  const filteredProducts =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return products.filter(
        (product) => {
          const matchesSearch =
            !query ||
            product.name
              .toLowerCase()
              .includes(query);

          const matchesSeries =
            selectedSeriesId === null ||
            product.seriesId ===
              selectedSeriesId;

          return (
            matchesSearch &&
            matchesSeries
          );
        },
      );
    }, [
      products,
      search,
      selectedSeriesId,
    ]);

  return (
    <div className="model-browser">

      {/* =====================
          SERIES TABS
      ===================== */}

      {series.length > 0 && (
        <div
          className="series-tabs"
          role="tablist"
          aria-label={`${brandName} device series`}
        >
          <button
            type="button"
            className={
              selectedSeriesId === null
                ? "series-tab active"
                : "series-tab"
            }
            onClick={() =>
              setSelectedSeriesId(null)
            }
          >
            All Series
          </button>

          {series.map(
            (seriesItem) => (
              <button
                type="button"
                key={seriesItem.id}
                className={
                  selectedSeriesId ===
                  seriesItem.id
                    ? "series-tab active"
                    : "series-tab"
                }
                onClick={() =>
                  setSelectedSeriesId(
                    seriesItem.id,
                  )
                }
              >
                {seriesItem.name}
              </button>
            ),
          )}
        </div>
      )}

      {/* =====================
          SEARCH
      ===================== */}

      <div className="model-search-box">
        <Search size={18} />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder={`Search ${brandName} models`}
          aria-label={`Search ${brandName} models`}
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

      {/* =====================
          PRODUCTS
      ===================== */}

      {filteredProducts.length ===
      0 ? (
        <div className="model-empty-state">
          <Smartphone size={34} />

          <h3>
            No models found
          </h3>

          <p>
            Is series me abhi koi
            model available nahi hai.
          </p>
        </div>
      ) : (
        <div className="customer-model-grid">
          {filteredProducts.map(
            (product) => (
              <Link
                key={product.id}
                href={`/sell/${categorySlug}/${brandSlug}/${product.slug}`}
                className="customer-model-card"
                aria-label={`Sell ${product.name}`}
              >
                <div className="model-image-box">
                  {product.imageUrl ? (
                    <img
                      src={
                        product.imageUrl
                      }
                      alt={
                        product.name
                      }
                      loading="lazy"
                    />
                  ) : (
                    <Smartphone
                      size={45}
                    />
                  )}
                </div>

                <h3 className="model-name">
                  {product.name}
                </h3>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}