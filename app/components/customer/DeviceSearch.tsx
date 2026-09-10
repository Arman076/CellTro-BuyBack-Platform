/* eslint-disable @next/next/no-img-element */
"use client";

import {
  Search,
  Smartphone,
  X,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type SearchProduct = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;

  category?: {
    id: number;
    name: string;
    slug: string;
  };

  brand?: {
    id: number;
    name: string;
    slug: string;
  };
};

type Props = {
  variant?: "header" | "hero";
  placeholder?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

export default function DeviceSearch({
  variant = "header",
  placeholder = "Search for your device...",
}: Props) {
  const router = useRouter();

  const wrapperRef =
    useRef<HTMLDivElement | null>(null);

  const [query, setQuery] =
    useState("");

  const [products, setProducts] =
    useState<SearchProduct[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  /* =========================
     LOAD PRODUCTS
  ========================= */

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/products`,
        );

        if (!response.ok) {
          throw new Error(
            "Product search load failed",
          );
        }

        const data: SearchProduct[] =
          await response.json();

        setProducts(
          data.filter(
            (product) =>
              product.isActive,
          ),
        );
      } catch (error) {
        console.error(
          "Device search error:",
          error,
        );

        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    void loadProducts();
  }, []);

  /* =========================
     OUTSIDE CLICK
  ========================= */

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  /* =========================
     FILTER PRODUCTS
  ========================= */

  const results = useMemo(() => {
    const cleanQuery =
      query
        .trim()
        .toLowerCase();

    if (cleanQuery.length < 2) {
      return [];
    }

    return products
      .filter((product) => {
        const searchableText = [
          product.name,
          product.brand?.name,
          product.category?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          cleanQuery,
        );
      })
      .slice(0, 8);
  }, [products, query]);

  /* =========================
     OPEN PRODUCT
  ========================= */

  function openProduct(
    product: SearchProduct,
  ) {
    if (
      !product.category?.slug ||
      !product.brand?.slug
    ) {
      console.warn(
        "Search product missing category or brand:",
        product,
      );

      return;
    }

    setQuery("");
    setOpen(false);

    router.push(
      `/sell/${product.category.slug}/${product.brand.slug}/${product.slug}`,
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (results.length > 0) {
      openProduct(results[0]);
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`device-search-wrapper device-search-${variant}`}
    >
      <form
        className="device-search-form"
        onSubmit={handleSubmit}
      >
        <Search size={18} />

        <input
          type="search"
          value={query}
          onFocus={() =>
            setOpen(true)
          }
          onChange={(event) => {
            setQuery(
              event.target.value,
            );

            setOpen(true);
          }}
          placeholder={placeholder}
          aria-label="Search device"
          autoComplete="off"
        />

        {query && (
          <button
            type="button"
            className="device-search-clear"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}

        {variant === "hero" && (
          <button
            type="submit"
            className="device-search-submit"
          >
            Get Price
          </button>
        )}
      </form>

      {open &&
        query.trim().length >= 2 && (
          <div className="device-search-results">
            {loading ? (
              <div className="device-search-message">
                Searching devices...
              </div>
            ) : results.length === 0 ? (
              <div className="device-search-message">
                No matching device found.
              </div>
            ) : (
              results.map(
                (product) => (
                  <button
                    type="button"
                    key={product.id}
                    className="device-search-result"
                    onClick={() =>
                      openProduct(
                        product,
                      )
                    }
                  >
                    <div className="search-result-image">
                      {product.imageUrl ? (
                        <img
                          src={
                            product.imageUrl
                          }
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <Smartphone
                          size={23}
                        />
                      )}
                    </div>

                    <span>
                      <strong>
                        {product.name}
                      </strong>

                      <small>
                        {product.brand
                          ?.name ?? ""}

                        {product.category
                          ?.name
                          ? ` • ${product.category.name}`
                          : ""}
                      </small>
                    </span>
                  </button>
                ),
              )
            )}
          </div>
        )}
    </div>
  );
}