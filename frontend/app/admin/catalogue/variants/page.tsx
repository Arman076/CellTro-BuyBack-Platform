'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { API_BASE_URL } from '@/lib/api';

interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

interface Brand {
  id: number;
  name: string;
  isActive: boolean;
  categories: {
    category: {
      id: number;
      name: string;
    };
  }[];
}

interface Product {
  id: number;
  name: string;
  categoryId: number;
  brandId: number;
  isActive: boolean;
  category: {
    id: number;
    name: string;
  };
  brand: {
    id: number;
    name: string;
  };
}

interface VariantAttributeOption {
  id: number;
  value: string;
  isActive: boolean;
}

interface VariantAttribute {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  categoryId: number;
  options: VariantAttributeOption[];
}

interface VariantValue {
  id: number;
  attribute: {
    id: number;
    name: string;
  };
  option: {
    id: number;
    value: string;
  };
}

interface Variant {
  id: number;
  productId: number;
  basePrice: string | number;
  isActive: boolean;
  product: Product;
  values: VariantValue[];
}

interface VariantForm {
  categoryId: number;
  brandId: number;
  productId: number;
  basePrice: number;
  isActive: boolean;
}

const initialForm: VariantForm = {
  categoryId: 0,
  brandId: 0,
  productId: 0,
  basePrice: 0,
  isActive: true,
};

export default function VariantsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [selectedOptions, setSelectedOptions] =
    useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Variant | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(0);
  const [brandFilter, setBrandFilter] = useState(0);
  const [productFilter, setProductFilter] = useState(0);

  const [form, setForm] = useState<VariantForm>(initialForm);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const responses = await Promise.all([
        fetch(`${API_BASE_URL}/categories`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/brands`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/products`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/variants`, { cache: 'no-store' }),
      ]);

      if (responses.some((response) => !response.ok)) {
        throw new Error('Unable to load variants data');
      }

      const [categoryData, brandData, productData, variantData] =
        await Promise.all(responses.map((response) => response.json()));

      setCategories(categoryData);
      setBrands(brandData);
      setProducts(productData);
      setVariants(variantData);
    } catch (error) {
      console.error(error);
      alert(`Backend ${API_BASE_URL} check karo.`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAttributes = useCallback(async (categoryId: number) => {
    if (!categoryId) {
      setAttributes([]);
      return;
    }

    try {
      setAttributesLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/variant-attributes?categoryId=${categoryId}`,
        { cache: 'no-store' },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          result?.message || 'Variant attributes load failed',
        );
      }

      const data: VariantAttribute[] = await response.json();

      setAttributes(
        data
          .filter((item) => item.isActive)
          .sort((a, b) => a.displayOrder - b.displayOrder),
      );
    } catch (error) {
      console.error(error);
      setAttributes([]);
      alert(
        error instanceof Error
          ? error.message
          : 'Variant attributes load failed',
      );
    } finally {
      setAttributesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const formBrands = useMemo(() => {
    if (!form.categoryId) return [];

    return brands.filter((brand) =>
      brand.categories?.some(
        (item) => item.category.id === form.categoryId,
      ),
    );
  }, [brands, form.categoryId]);

  const formProducts = useMemo(() => {
    return products.filter(
      (product) =>
        product.categoryId === form.categoryId &&
        product.brandId === form.brandId,
    );
  }, [products, form.categoryId, form.brandId]);

  const filterBrands = useMemo(() => {
    if (!categoryFilter) return brands;

    return brands.filter((brand) =>
      brand.categories?.some(
        (item) => item.category.id === categoryFilter,
      ),
    );
  }, [brands, categoryFilter]);

  const filterProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch =
        categoryFilter === 0 ||
        product.categoryId === categoryFilter;

      const brandMatch =
        brandFilter === 0 ||
        product.brandId === brandFilter;

      return categoryMatch && brandMatch;
    });
  }, [products, categoryFilter, brandFilter]);

  async function openAddModal() {
    setEditing(null);
    setForm(initialForm);
    setSelectedOptions({});
    setAttributes([]);
    setModalOpen(true);
  }

  async function openEditModal(variant: Variant) {
    setEditing(variant);

    setForm({
      categoryId: variant.product.categoryId,
      brandId: variant.product.brandId,
      productId: variant.productId,
      basePrice: Number(variant.basePrice),
      isActive: variant.isActive,
    });

    const selected: Record<number, number> = {};
    for (const value of variant.values ?? []) {
      selected[value.attribute.id] = value.option.id;
    }

    setSelectedOptions(selected);
    setModalOpen(true);
    await loadAttributes(variant.product.categoryId);
  }

  async function changeCategory(categoryId: number) {
    setForm((previous) => ({
      ...previous,
      categoryId,
      brandId: 0,
      productId: 0,
    }));

    setSelectedOptions({});
    await loadAttributes(categoryId);
  }

  function changeBrand(brandId: number) {
    setForm((previous) => ({
      ...previous,
      brandId,
      productId: 0,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.categoryId) return alert('Category select karo.');
    if (!form.brandId) return alert('Brand select karo.');
    if (!form.productId) return alert('Model select karo.');

    if (attributes.length === 0) {
      return alert(
        'Is category ke liye Variant Attributes configure karo.',
      );
    }

    for (const attribute of attributes) {
      if (!selectedOptions[attribute.id]) {
        return alert(`${attribute.name} select karo.`);
      }
    }

    const payload = {
      productId: Number(form.productId),
      basePrice: Number(form.basePrice),
      isActive: form.isActive,
      values: attributes.map((attribute) => ({
        attributeId: attribute.id,
        optionId: selectedOptions[attribute.id],
      })),
    };

    try {
      setSaving(true);

      const response = await fetch(
        editing
          ? `${API_BASE_URL}/variants/${editing.id}`
          : `${API_BASE_URL}/variants`,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);

        throw new Error(
          Array.isArray(result?.message)
            ? result.message.join(', ')
            : result?.message || 'Variant save failed',
        );
      }

      setModalOpen(false);
      setEditing(null);
      setSelectedOptions({});
      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Variant save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(variant: Variant) {
    const response = await fetch(
      `${API_BASE_URL}/variants/${variant.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !variant.isActive,
        }),
      },
    );

    if (!response.ok) {
      alert('Status update failed');
      return;
    }

    await loadData();
  }

  async function deleteVariant(variant: Variant) {
    if (!window.confirm(`${variant.product.name} delete karna hai?`)) {
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/variants/${variant.id}`,
      { method: 'DELETE' },
    );

    if (!response.ok) {
      alert('Delete failed');
      return;
    }

    await loadData();
  }

  const filteredVariants = variants.filter((variant) => {
    const text = search.toLowerCase();

    const valuesText = (variant.values ?? [])
      .map(
        (value) =>
          `${value.attribute.name} ${value.option.value}`,
      )
      .join(' ')
      .toLowerCase();

    return (
      (!text ||
        variant.product.name.toLowerCase().includes(text) ||
        variant.product.brand.name.toLowerCase().includes(text) ||
        valuesText.includes(text)) &&
      (categoryFilter === 0 ||
        variant.product.categoryId === categoryFilter) &&
      (brandFilter === 0 ||
        variant.product.brandId === brandFilter) &&
      (productFilter === 0 ||
        variant.productId === productFilter)
    );
  });

  function formatPrice(value: string | number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Variants & Pricing
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Dynamic category attributes aur base price manage karo.
          </p>
        </div>

        <button
          onClick={() => void openAddModal()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={18} />
          Add Variant
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex flex-col gap-3 border-b p-4 xl:flex-row">
          <div className="relative w-full xl:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search model or attribute..."
              className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(Number(event.target.value));
              setBrandFilter(0);
              setProductFilter(0);
            }}
            className="rounded-xl border px-3 py-2.5 text-sm"
          >
            <option value={0}>All Categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={brandFilter}
            onChange={(event) => {
              setBrandFilter(Number(event.target.value));
              setProductFilter(0);
            }}
            className="rounded-xl border px-3 py-2.5 text-sm"
          >
            <option value={0}>All Brands</option>
            {filterBrands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={productFilter}
            onChange={(event) =>
              setProductFilter(Number(event.target.value))
            }
            className="rounded-xl border px-3 py-2.5 text-sm"
          >
            <option value={0}>All Models</option>
            {filterProducts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => void loadData()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading variants...
          </div>
        ) : filteredVariants.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No variants found
          </div>
        ) : (
          <div className="divide-y">
            {filteredVariants.map((variant) => (
              <div
                key={variant.id}
                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-semibold">
                    {variant.product.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {variant.product.brand.name} •{' '}
                    {variant.product.category.name}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {(variant.values ?? []).map((value) => (
                      <span
                        key={value.id}
                        className="rounded-lg bg-gray-100 px-2 py-1 text-xs"
                      >
                        {value.attribute.name}: {value.option.value}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="font-semibold">
                    {formatPrice(variant.basePrice)}
                  </div>

                  <button
                    onClick={() => void toggleStatus(variant)}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs"
                  >
                    {variant.isActive ? 'Active' : 'Inactive'}
                  </button>

                  <button
                    onClick={() => void openEditModal(variant)}
                    className="rounded-lg border p-2"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    onClick={() => void deleteVariant(variant)}
                    className="rounded-lg border p-2 text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">
                  {editing ? 'Edit Variant' : 'Add Variant'}
                </h2>
                <p className="text-xs text-gray-500">
                  Dynamic attributes select karo.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Category
                </label>
                <select
                  value={form.categoryId}
                  onChange={(event) =>
                    void changeCategory(
                      Number(event.target.value),
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                  required
                >
                  <option value={0}>Select Category</option>
                  {categories
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Brand
                </label>
                <select
                  value={form.brandId}
                  onChange={(event) =>
                    changeBrand(Number(event.target.value))
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                  required
                >
                  <option value={0}>Select Brand</option>
                  {formBrands
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Model
                </label>
                <select
                  value={form.productId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      productId: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                  required
                >
                  <option value={0}>Select Model</option>
                  {formProducts
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="border-t pt-4">
                <div className="mb-3 text-sm font-semibold">
                  Variant Attributes
                </div>

                {attributesLoading ? (
                  <div className="text-sm text-gray-500">
                    Loading attributes...
                  </div>
                ) : attributes.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
                    Is category ke attributes abhi configured nahi hain.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {attributes.map((attribute) => (
                      <div key={attribute.id}>
                        <label className="mb-1 block text-sm font-medium">
                          {attribute.name}
                        </label>

                        <select
                          required
                          value={
                            selectedOptions[attribute.id] ?? 0
                          }
                          onChange={(event) =>
                            setSelectedOptions((previous) => ({
                              ...previous,
                              [attribute.id]: Number(
                                event.target.value,
                              ),
                            }))
                          }
                          className="w-full rounded-xl border px-3 py-2.5"
                        >
                          <option value={0}>
                            Select {attribute.name}
                          </option>

                          {attribute.options
                            .filter((option) => option.isActive)
                            .map((option) => (
                              <option
                                key={option.id}
                                value={option.id}
                              >
                                {option.value}
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Base Price ₹
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.basePrice}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      basePrice: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <label className="flex items-center justify-between rounded-xl border p-4">
                <span className="text-sm font-medium">Active</span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      isActive: event.target.checked,
                    }))
                  }
                />
              </label>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || attributesLoading}
                  className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editing
                      ? 'Update Variant'
                      : 'Add Variant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
