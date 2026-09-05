'use client';

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Edit3,
  ImagePlus,
  Plus,
  RefreshCw,
  Search,
  Settings2,
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

interface ProductSeries {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  brandId: number;
  displayOrder: number;
  isActive: boolean;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;

  categoryId: number;
  brandId: number;
  seriesId: number | null;

  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;

  category: {
    id: number;
    name: string;
  };

  brand: {
    id: number;
    name: string;
  };

  series?: ProductSeries | null;

  _count?: {
    variants: number;
  };
}

interface ProductForm {
  name: string;
  slug: string;

  categoryId: number;
  brandId: number;
  seriesId: number;

  imageUrl: string;
  description: string;

  displayOrder: number;

  isActive: boolean;
  isFeatured: boolean;
}

interface SeriesForm {
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

const initialForm: ProductForm = {
  name: '',
  slug: '',

  categoryId: 0,
  brandId: 0,
  seriesId: 0,

  imageUrl: '',
  description: '',

  displayOrder: 0,

  isActive: true,
  isFeatured: false,
};

const initialSeriesForm: SeriesForm = {
  name: '',
  slug: '',
  displayOrder: 0,
  isActive: true,
};

export default function ModelsPage() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [brands, setBrands] =
    useState<Brand[]>([]);

  const [series, setSeries] =
    useState<ProductSeries[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Product | null>(null);

  const [search, setSearch] =
    useState('');

  const [categoryFilter, setCategoryFilter] =
    useState(0);

  const [brandFilter, setBrandFilter] =
    useState(0);

  const [form, setForm] =
    useState<ProductForm>(initialForm);

  const [
    createSeriesOpen,
    setCreateSeriesOpen,
  ] = useState(false);

  const [
    manageSeriesOpen,
    setManageSeriesOpen,
  ] = useState(false);

  const [
    editingSeries,
    setEditingSeries,
  ] =
    useState<ProductSeries | null>(
      null,
    );

  const [
    seriesForm,
    setSeriesForm,
  ] =
    useState<SeriesForm>(
      initialSeriesForm,
    );

  const [seriesSaving, setSeriesSaving] =
    useState(false);

  function generateSlug(
    value: string,
  ) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);

        const [
          productsResponse,
          categoriesResponse,
          brandsResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE_URL}/products`,
            {
              cache: 'no-store',
            },
          ),

          fetch(
            `${API_BASE_URL}/categories`,
            {
              cache: 'no-store',
            },
          ),

          fetch(
            `${API_BASE_URL}/brands`,
            {
              cache: 'no-store',
            },
          ),
        ]);

        if (
          !productsResponse.ok ||
          !categoriesResponse.ok ||
          !brandsResponse.ok
        ) {
          throw new Error(
            'Catalogue load failed',
          );
        }

        setProducts(
          await productsResponse.json(),
        );

        setCategories(
          await categoriesResponse.json(),
        );

        setBrands(
          await brandsResponse.json(),
        );
      } catch (error) {
        console.error(error);

        alert(
          'Models data load nahi hua.',
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function loadSeries(
    categoryId: number,
    brandId: number,
  ) {
    if (!categoryId || !brandId) {
      setSeries([]);
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/product-series?categoryId=${categoryId}&brandId=${brandId}`,
      {
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      setSeries([]);
      return;
    }

    setSeries(
      await response.json(),
    );
  }

  const formBrands = useMemo(() => {
    return brands.filter(
      (brand) =>
        brand.isActive &&
        brand.categories?.some(
          (item) =>
            item.category.id ===
            form.categoryId,
        ),
    );
  }, [
    brands,
    form.categoryId,
  ]);

  const filterBrands = useMemo(() => {
    if (!categoryFilter) {
      return brands;
    }

    return brands.filter(
      (brand) =>
        brand.categories?.some(
          (item) =>
            item.category.id ===
            categoryFilter,
        ),
    );
  }, [
    brands,
    categoryFilter,
  ]);

  function openAddModal() {
    const category =
      categories.find(
        (item) => item.isActive,
      );

    const categoryId =
      category?.id ?? 0;

    const brand =
      brands.find(
        (item) =>
          item.isActive &&
          item.categories?.some(
            (mapping) =>
              mapping.category.id ===
              categoryId,
          ),
      );

    const brandId =
      brand?.id ?? 0;

    setEditing(null);

    setForm({
      ...initialForm,
      categoryId,
      brandId,
      displayOrder:
        products.length + 1,
    });

    void loadSeries(
      categoryId,
      brandId,
    );

    setModalOpen(true);
  }

  function openEditModal(
    product: Product,
  ) {
    setEditing(product);

    setForm({
      name: product.name,
      slug: product.slug,

      categoryId:
        product.categoryId,

      brandId:
        product.brandId,

      seriesId:
        product.seriesId ?? 0,

      imageUrl:
        product.imageUrl ?? '',

      description:
        product.description ?? '',

      displayOrder:
        product.displayOrder,

      isActive:
        product.isActive,

      isFeatured:
        product.isFeatured,
    });

    void loadSeries(
      product.categoryId,
      product.brandId,
    );

    setModalOpen(true);
  }

  async function uploadImage(
    file: File,
  ) {
    const data = new FormData();

    data.append('file', file);

    const response = await fetch(
      `${API_BASE_URL}/uploads/image`,
      {
        method: 'POST',
        body: data,
      },
    );

    if (!response.ok) {
      const result =
        await response.json();

      throw new Error(
        result.message ||
          'Image upload failed',
      );
    }

    const result =
      await response.json();

    return result.url as string;
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);

      const url =
        await uploadImage(file);

      setForm((previous) => ({
        ...previous,
        imageUrl: url,
      }));
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Image upload failed',
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  function openCreateSeries() {
    if (
      !form.categoryId ||
      !form.brandId
    ) {
      alert(
        'Pehle Category aur Brand select karo.',
      );
      return;
    }

    setEditingSeries(null);

    setSeriesForm({
      ...initialSeriesForm,
      displayOrder:
        series.length + 1,
    });

    setCreateSeriesOpen(true);
  }

  function openEditSeries(
    item: ProductSeries,
  ) {
    setEditingSeries(item);

    setSeriesForm({
      name: item.name,
      slug: item.slug,
      displayOrder:
        item.displayOrder,
      isActive:
        item.isActive,
    });

    setCreateSeriesOpen(true);
  }

  async function saveSeries(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !seriesForm.name.trim()
    ) {
      alert(
        'Series name enter karo.',
      );
      return;
    }

    try {
      setSeriesSaving(true);

      const response = await fetch(
        editingSeries
          ? `${API_BASE_URL}/product-series/${editingSeries.id}`
          : `${API_BASE_URL}/product-series`,
        {
          method: editingSeries
            ? 'PATCH'
            : 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name:
              seriesForm.name.trim(),

            slug:
              seriesForm.slug.trim(),

            categoryId:
              form.categoryId,

            brandId:
              form.brandId,

            displayOrder:
              Number(
                seriesForm.displayOrder,
              ),

            isActive:
              seriesForm.isActive,
          }),
        },
      );

      if (!response.ok) {
        const result =
          await response.json();

        throw new Error(
          Array.isArray(
            result.message,
          )
            ? result.message.join(', ')
            : result.message ||
                'Series save failed',
        );
      }

      const saved =
        await response.json();

      await loadSeries(
        form.categoryId,
        form.brandId,
      );

      if (!editingSeries) {
        setForm((previous) => ({
          ...previous,
          seriesId: saved.id,
        }));
      }

      setCreateSeriesOpen(false);
      setEditingSeries(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Series save failed',
      );
    } finally {
      setSeriesSaving(false);
    }
  }

  async function deleteSeries(
    item: ProductSeries,
  ) {
    if (
      !window.confirm(
        `${item.name} delete karna hai?`,
      )
    ) {
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/product-series/${item.id}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      const result =
        await response.json();

      alert(
        result.message ||
          'Series delete nahi hui.',
      );

      return;
    }

    await loadSeries(
      form.categoryId,
      form.brandId,
    );
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!form.categoryId) {
      alert('Category select karo.');
      return;
    }

    if (!form.brandId) {
      alert('Brand select karo.');
      return;
    }

    if (!form.name.trim()) {
      alert(
        'Model name enter karo.',
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        editing
          ? `${API_BASE_URL}/products/${editing.id}`
          : `${API_BASE_URL}/products`,
        {
          method: editing
            ? 'PATCH'
            : 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name:
              form.name.trim(),

            slug:
              form.slug.trim(),

            categoryId:
              form.categoryId,

            brandId:
              form.brandId,

            seriesId:
              form.seriesId ||
              undefined,

            imageUrl:
              form.imageUrl ||
              undefined,

            description:
              form.description.trim() ||
              undefined,

            displayOrder:
              Number(
                form.displayOrder,
              ),

            isActive:
              form.isActive,

            isFeatured:
              form.isFeatured,
          }),
        },
      );

      if (!response.ok) {
        const result =
          await response.json();

        throw new Error(
          Array.isArray(
            result.message,
          )
            ? result.message.join(', ')
            : result.message ||
                'Model save failed',
        );
      }

      setModalOpen(false);
      setEditing(null);

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Model save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(
    product: Product,
  ) {
    if (
      !window.confirm(
        `${product.name} delete karna hai?`,
      )
    ) {
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/products/${product.id}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      const result =
        await response.json();

      alert(
        result.message ||
          'Delete failed',
      );

      return;
    }

    await loadData();
  }

  const filteredProducts =
    products.filter((product) => {
      const searchMatch =
        product.name
          .toLowerCase()
          .includes(
            search.toLowerCase(),
          );

      const categoryMatch =
        categoryFilter === 0 ||
        product.categoryId ===
          categoryFilter;

      const brandMatch =
        brandFilter === 0 ||
        product.brandId ===
          brandFilter;

      return (
        searchMatch &&
        categoryMatch &&
        brandMatch
      );
    });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Models
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Models, images aur series
            manage karo.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 font-semibold text-white"
        >
          <Plus size={18} />
          Add Model
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search models..."
              className="w-full rounded-xl border py-2.5 pl-10 pr-4"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(
                Number(
                  event.target.value,
                ),
              );

              setBrandFilter(0);
            }}
            className="rounded-xl border px-3"
          >
            <option value={0}>
              All Categories
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ),
            )}
          </select>

          <select
            value={brandFilter}
            onChange={(event) =>
              setBrandFilter(
                Number(
                  event.target.value,
                ),
              )
            }
            className="rounded-xl border px-3"
          >
            <option value={0}>
              All Brands
            </option>

            {filterBrands.map(
              (brand) => (
                <option
                  key={brand.id}
                  value={brand.id}
                >
                  {brand.name}
                </option>
              ),
            )}
          </select>

          <button
            onClick={() =>
              void loadData()
            }
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            Loading models...
          </div>
        ) : (
          <div className="divide-y">
            {filteredProducts.map(
              (product) => (
                <div
                  key={product.id}
                  className="flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-xl border bg-gray-50">
                      {product.imageUrl ? (
                        <img
                          src={
                            product.imageUrl
                          }
                          alt={
                            product.name
                          }
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold">
                        {product.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {product.brand.name}
                        {' • '}
                        {
                          product.category
                            .name
                        }
                      </p>

                      <p className="mt-1 text-xs font-medium text-gray-600">
                        Series:{' '}
                        {product.series
                          ?.name ??
                          'Not assigned'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {product._count
                        ?.variants ?? 0}{' '}
                      variants
                    </span>

                    <button
                      onClick={() =>
                        openEditModal(
                          product,
                        )
                      }
                      className="rounded-lg border p-2"
                    >
                      <Edit3 size={17} />
                    </button>

                    <button
                      onClick={() =>
                        void deleteProduct(
                          product,
                        )
                      }
                      className="rounded-lg border border-red-100 p-2 text-red-500"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-100 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">
                  {editing
                    ? 'Edit Model'
                    : 'Add Model'}
                </h2>

                <p className="text-xs text-gray-500">
                  Category, brand aur
                  series select karo.
                </p>
              </div>

              <button
                onClick={() =>
                  setModalOpen(false)
                }
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
                  value={
                    form.categoryId
                  }
                  onChange={(event) => {
                    const categoryId =
                      Number(
                        event.target
                          .value,
                      );

                    const brand =
                      brands.find(
                        (item) =>
                          item.isActive &&
                          item.categories?.some(
                            (mapping) =>
                              mapping
                                .category
                                .id ===
                              categoryId,
                          ),
                      );

                    const brandId =
                      brand?.id ?? 0;

                    setForm(
                      (previous) => ({
                        ...previous,
                        categoryId,
                        brandId,
                        seriesId: 0,
                      }),
                    );

                    void loadSeries(
                      categoryId,
                      brandId,
                    );
                  }}
                  className="w-full rounded-xl border px-3 py-2.5"
                >
                  {categories
                    .filter(
                      (category) =>
                        category.isActive,
                    )
                    .map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      ),
                    )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Brand
                </label>

                <select
                  value={form.brandId}
                  onChange={(event) => {
                    const brandId =
                      Number(
                        event.target
                          .value,
                      );

                    setForm(
                      (previous) => ({
                        ...previous,
                        brandId,
                        seriesId: 0,
                      }),
                    );

                    void loadSeries(
                      form.categoryId,
                      brandId,
                    );
                  }}
                  className="w-full rounded-xl border px-3 py-2.5"
                >
                  {formBrands.map(
                    (brand) => (
                      <option
                        key={brand.id}
                        value={brand.id}
                      >
                        {brand.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Series
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={
                        openCreateSeries
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                    >
                      <Plus size={14} />
                      Create Series
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setManageSeriesOpen(
                          true,
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600"
                    >
                      <Settings2
                        size={14}
                      />
                      Manage
                    </button>
                  </div>
                </div>

                <select
                  value={form.seriesId}
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        seriesId:
                          Number(
                            event.target
                              .value,
                          ),
                      }),
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                >
                  <option value={0}>
                    No Series
                  </option>

                  {series
                    .filter(
                      (item) =>
                        item.isActive,
                    )
                    .map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Model Name
                </label>

                <input
                  required
                  value={form.name}
                  onChange={(event) => {
                    const name =
                      event.target.value;

                    setForm(
                      (previous) => ({
                        ...previous,
                        name,
                        slug: editing
                          ? previous.slug
                          : generateSlug(
                              name,
                            ),
                      }),
                    );
                  }}
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Slug
                </label>

                <input
                  required
                  value={form.slug}
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        slug:
                          generateSlug(
                            event.target
                              .value,
                          ),
                      }),
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Model Image
                </label>

                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-gray-50 px-4 py-5">
                  <ImagePlus size={20} />

                  {uploading
                    ? 'Uploading...'
                    : 'Choose Image'}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) =>
                      void handleImageChange(
                        event,
                      )
                    }
                  />
                </label>

                {form.imageUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-24 w-24 overflow-hidden rounded-xl border">
                      <img
                        src={
                          form.imageUrl
                        }
                        alt="Preview"
                        className="h-full w-full object-contain p-2"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            imageUrl: '',
                          }),
                        )
                      }
                      className="text-sm text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        description:
                          event.target
                            .value,
                      }),
                    )
                  }
                  rows={3}
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Display Order
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.displayOrder
                  }
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        displayOrder:
                          Number(
                            event.target
                              .value,
                          ),
                      }),
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <label className="flex items-center justify-between rounded-xl border p-4">
                Active

                <input
                  type="checkbox"
                  checked={
                    form.isActive
                  }
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        isActive:
                          event.target
                            .checked,
                      }),
                    )
                  }
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border p-4">
                Featured

                <input
                  type="checkbox"
                  checked={
                    form.isFeatured
                  }
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        isFeatured:
                          event.target
                            .checked,
                      }),
                    )
                  }
                />
              </label>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setModalOpen(false)
                  }
                  className="rounded-xl border px-4 py-2"
                >
                  Cancel
                </button>

                <button
                  disabled={
                    saving ||
                    uploading
                  }
                  className="rounded-xl bg-gray-900 px-5 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editing
                      ? 'Update Model'
                      : 'Add Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createSeriesOpen && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-bold">
                {editingSeries
                  ? 'Edit Series'
                  : 'Create Series'}
              </h2>

              <button
                onClick={() =>
                  setCreateSeriesOpen(
                    false,
                  )
                }
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveSeries}
              className="space-y-4 p-5"
            >
              <p className="text-sm text-gray-500">
                Category ID:{' '}
                {form.categoryId} · Brand
                ID: {form.brandId}
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Series Name
                </label>

                <input
                  required
                  value={
                    seriesForm.name
                  }
                  onChange={(event) => {
                    const name =
                      event.target.value;

                    setSeriesForm(
                      (previous) => ({
                        ...previous,
                        name,
                        slug:
                          editingSeries
                            ? previous.slug
                            : generateSlug(
                                name,
                              ),
                      }),
                    );
                  }}
                  placeholder="Galaxy S"
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Slug
                </label>

                <input
                  required
                  value={
                    seriesForm.slug
                  }
                  onChange={(event) =>
                    setSeriesForm(
                      (previous) => ({
                        ...previous,
                        slug:
                          generateSlug(
                            event.target
                              .value,
                          ),
                      }),
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Display Order
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    seriesForm.displayOrder
                  }
                  onChange={(event) =>
                    setSeriesForm(
                      (previous) => ({
                        ...previous,
                        displayOrder:
                          Number(
                            event.target
                              .value,
                          ),
                      }),
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <label className="flex items-center justify-between rounded-xl border p-4">
                Active

                <input
                  type="checkbox"
                  checked={
                    seriesForm.isActive
                  }
                  onChange={(event) =>
                    setSeriesForm(
                      (previous) => ({
                        ...previous,
                        isActive:
                          event.target
                            .checked,
                      }),
                    )
                  }
                />
              </label>

              <button
                disabled={seriesSaving}
                className="w-full rounded-xl bg-gray-900 py-2.5 font-semibold text-white"
              >
                {seriesSaving
                  ? 'Saving...'
                  : editingSeries
                    ? 'Update Series'
                    : 'Create & Select'}
              </button>
            </form>
          </div>
        </div>
      )}

      {manageSeriesOpen && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-bold">
                  Manage Series
                </h2>

                <p className="text-xs text-gray-500">
                  Current category +
                  brand
                </p>
              </div>

              <button
                onClick={() =>
                  setManageSeriesOpen(
                    false,
                  )
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] divide-y overflow-y-auto">
              {series.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No series created.
                </div>
              ) : (
                series.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {item.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        /{item.slug} ·{' '}
                        {item.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setManageSeriesOpen(
                            false,
                          );

                          openEditSeries(
                            item,
                          );
                        }}
                        className="rounded-lg border p-2"
                      >
                        <Edit3
                          size={16}
                        />
                      </button>

                      <button
                        onClick={() =>
                          void deleteSeries(
                            item,
                          )
                        }
                        className="rounded-lg border border-red-100 p-2 text-red-500"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}