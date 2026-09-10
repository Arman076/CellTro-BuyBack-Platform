"use client";

import { ArrowRight, Check } from "lucide-react";
import { useMemo, useState } from "react";

import type { ProductVariant } from "@/lib/customer-api";
import ExactValueModal from "@/components/customer/ExactValueModal";

type Props = {
  productId: number;
  productName: string;
  productImage: string | null;
  variants: ProductVariant[];
};

export default function VariantSelector({
  productId,
  productName,
  productImage,
  variants,
}: Props) {
  const activeVariants = useMemo(
    () => variants.filter((variant) => variant.isActive),
    [variants],
  );

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [exactValueOpen, setExactValueOpen] = useState(false);

  const selectedVariant = useMemo(
    () =>
      activeVariants.find((variant) => variant.id === selectedVariantId) ?? null,
    [activeVariants, selectedVariantId],
  );

  function getValue(variant: ProductVariant, names: string[]) {
    return variant.values.find((item) => {
      const name = item.attribute.name?.trim().toLowerCase() || "";
      const slug = item.attribute.slug?.trim().toLowerCase() || "";
      return names.some((target) => name === target || slug === target);
    });
  }

  function cleanMemory(value: string) {
    const clean = value.trim();
    const match = clean.match(/^(\d+(?:\.\d+)?)\s*gb$/i);
    if (match) return match[1];
    return clean.replace(/\s+/g, "").toUpperCase();
  }

  function getVariantLabel(variant: ProductVariant) {
    const ram = getValue(variant, ["ram"]);
    const storage = getValue(variant, [
      "rom",
      "storage",
      "internal storage",
      "internal-storage",
    ]);

    const ramValue = ram ? cleanMemory(ram.option.value) : null;
    const storageValue = storage ? cleanMemory(storage.option.value) : null;

    if (ramValue && storageValue) return `${ramValue} / ${storageValue}`;
    if (ramValue) return ramValue;
    if (storageValue) return storageValue;
    return "Standard";
  }

  function formatPrice(value: string | number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  if (!activeVariants.length) {
    return <div className="interactive-empty">No variant available</div>;
  }

  return (
    <>
      <div className="interactive-pricing">
        <div className="interactive-heading">
          <div>
            <h2>Choose Variant</h2>
            <span>RAM / Storage</span>
          </div>
        </div>

        <div className="interactive-variant-grid">
          {activeVariants.map((variant) => {
            const selected = selectedVariantId === variant.id;

            return (
              <button
                key={variant.id}
                type="button"
                className={`interactive-variant-card ${selected ? "active" : ""}`}
                onClick={() => setSelectedVariantId(variant.id)}
              >
                <span className="interactive-check">
                  {selected && <Check size={15} strokeWidth={3} />}
                </span>

                <strong>{getVariantLabel(variant)}</strong>
                <small>RAM / Storage</small>
              </button>
            );
          })}
        </div>

        {!selectedVariant && (
          <div className="interactive-price-placeholder">
            <span className="placeholder-dot" />
            Select a variant
          </div>
        )}

        {selectedVariant && (
          <div key={selectedVariant.id} className="interactive-price-panel">
            <div className="selected-config-row">
              <span>Selected</span>
              <strong>{getVariantLabel(selectedVariant)}</strong>
            </div>

            <div className="interactive-price-main">
              <span>Estimated Value</span>
              <strong>{formatPrice(selectedVariant.basePrice)}</strong>
            </div>

            <button
              type="button"
              className="interactive-cta"
              onClick={() => setExactValueOpen(true)}
            >
              Get Exact Value
              <ArrowRight size={19} />
            </button>
          </div>
        )}
      </div>

      {selectedVariant && (
        <ExactValueModal
          open={exactValueOpen}
          onClose={() => setExactValueOpen(false)}
          productId={productId}
          productName={productName}
          productImage={productImage}
          variantId={selectedVariant.id}
          variantLabel={getVariantLabel(selectedVariant)}
          basePrice={Number(selectedVariant.basePrice)}
        />
      )}
    </>
  );
}
