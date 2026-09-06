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
  categoryId: number;

  brandSlug: string;
  brandName: string;

  brandId?: number;

  allBrands?: boolean;
};


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";


type SeriesGroup = {
  key: string;
  name: string;
  ids: number[];
  displayOrder: number;
};


export default function ModelGrid({
  products,
  categorySlug,
  categoryId,
  brandSlug,
  brandName,
  brandId,
  allBrands = false,
}: ModelGridProps) {

  const [
    search,
    setSearch,
  ] = useState("");


  const [
    selectedSeriesKey,
    setSelectedSeriesKey,
  ] = useState<string | null>(
    null,
  );


  const [
    series,
    setSeries,
  ] = useState<ProductSeries[]>(
    [],
  );


  /* =========================
     LOAD SERIES
  ========================= */

  useEffect(() => {
    async function loadSeries() {
      try {

        let endpoint =
          `/product-series?categoryId=${categoryId}`;


        /*
          Normal brand:
          category + brand series

          All Brands:
          category ke saare series
        */

        if (
          !allBrands &&
          brandId
        ) {
          endpoint +=
            `&brandId=${brandId}`;
        }


        const response =
          await fetch(
            `${API_BASE_URL}${endpoint}`,
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


        const activeSeries =
          data
            .filter(
              (item) =>
                item.isActive,
            )
            .sort(
              (a, b) =>
                a.displayOrder -
                b.displayOrder,
            );


        setSeries(
          activeSeries,
        );

      } catch (error) {

        console.error(
          "Failed to load series:",
          error,
        );

        setSeries([]);

      }
    }


    void loadSeries();

  }, [
    categoryId,
    brandId,
    allBrands,
  ]);


  /* =========================
     GROUP SAME SERIES NAMES
  ========================= */

  const seriesGroups =
    useMemo(() => {

      const groups =
        new Map<
          string,
          SeriesGroup
        >();


      for (
        const seriesItem
        of series
      ) {

        const normalizedName =
          seriesItem.name
            .trim()
            .toLowerCase();


        const existing =
          groups.get(
            normalizedName,
          );


        if (existing) {

          existing.ids.push(
            seriesItem.id,
          );

          existing.displayOrder =
            Math.min(
              existing.displayOrder,
              seriesItem.displayOrder,
            );

          continue;
        }


        groups.set(
          normalizedName,
          {
            key:
              normalizedName,

            name:
              seriesItem.name,

            ids: [
              seriesItem.id,
            ],

            displayOrder:
              seriesItem.displayOrder,
          },
        );

      }


      return Array
        .from(
          groups.values(),
        )
        .sort(
          (a, b) =>
            a.displayOrder -
            b.displayOrder,
        );

    }, [series]);


  /* =========================
     SELECTED SERIES IDS
  ========================= */

  const selectedSeriesIds =
    useMemo(() => {

      if (
        selectedSeriesKey ===
        null
      ) {
        return null;
      }


      const selectedGroup =
        seriesGroups.find(
          (group) =>
            group.key ===
            selectedSeriesKey,
        );


      if (!selectedGroup) {
        return null;
      }


      return new Set(
        selectedGroup.ids,
      );

    }, [
      selectedSeriesKey,
      seriesGroups,
    ]);


  /* =========================
     FILTER MODELS
  ========================= */

  const filteredProducts =
    useMemo(() => {

      const query =
        search
          .trim()
          .toLowerCase();


      return products.filter(
        (product) => {

          /* SEARCH */

          const searchableText =
            [
              product.name,
              product.brand?.name,
              product.series?.name,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


          const matchesSearch =
            !query ||
            searchableText.includes(
              query,
            );


          /* SERIES */

          const matchesSeries =
            selectedSeriesIds ===
            null
              ? true
              : product.seriesId
                ? selectedSeriesIds.has(
                    product.seriesId,
                  )
                : false;


          return (
            matchesSearch &&
            matchesSeries
          );

        },
      );

    }, [
      products,
      search,
      selectedSeriesIds,
    ]);


  return (
    <div className="model-browser">

      {/* =========================
          SERIES TABS
      ========================= */}

      {seriesGroups.length >
        0 && (
        <div
          className="series-tabs"
          role="tablist"
          aria-label={`${brandName} device series`}
        >

          <button
            type="button"
            className={
              selectedSeriesKey ===
              null
                ? "series-tab active"
                : "series-tab"
            }
            onClick={() =>
              setSelectedSeriesKey(
                null,
              )
            }
          >
            All Series
          </button>


          {seriesGroups.map(
            (seriesItem) => (
              <button
                type="button"
                key={
                  seriesItem.key
                }
                className={
                  selectedSeriesKey ===
                  seriesItem.key
                    ? "series-tab active"
                    : "series-tab"
                }
                onClick={() =>
                  setSelectedSeriesKey(
                    seriesItem.key,
                  )
                }
              >
                {seriesItem.name}
              </button>
            ),
          )}

        </div>
      )}


      {/* =========================
          MODEL SEARCH
      ========================= */}

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
          placeholder={
            allBrands
              ? "Search all models or brands"
              : `Search ${brandName} models`
          }
          aria-label={
            allBrands
              ? "Search all models"
              : `Search ${brandName} models`
          }
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
          MODELS
      ========================= */}

      {filteredProducts.length ===
      0 ? (

        <div className="model-empty-state">

          <Smartphone
            size={34}
          />

          <h3>
            No models found
          </h3>

          <p>
            No model is currently
            available for this
            selection.
          </p>

        </div>

      ) : (

        <div className="customer-model-grid">

          {filteredProducts.map(
            (product) => {

              /*
                All Brands page par
                actual product brand slug
                use karna mandatory hai.

                Example:

                /sell/mobile/all
                     ↓
                click S23
                     ↓
                /sell/mobile/samsung/s23

                NOT:
                /sell/mobile/all/s23
              */

              const actualBrandSlug =
                allBrands
                  ? product.brand
                      ?.slug
                  : brandSlug;


              if (!actualBrandSlug) {
                return null;
              }


              return (
                <Link
                  key={product.id}
                  href={`/sell/${categorySlug}/${actualBrandSlug}/${product.slug}`}
                  className="customer-model-card customer-premium-card"
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


                  {allBrands &&
                    product.brand
                      ?.name && (
                    <span className="model-brand-name">
                      {
                        product.brand
                          .name
                      }
                    </span>
                  )}

                </Link>
              );

            },
          )}

        </div>

      )}

    </div>
  );
}