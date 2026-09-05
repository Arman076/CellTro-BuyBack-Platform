'use client';

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Edit3,
  ImagePlus,
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
  slug: string;
  logoUrl: string | null;
  displayOrder: number;
  isActive: boolean;

  categories: {
    category: {
      id: number;
      name: string;
    };
  }[];

  _count?: {
    products: number;
  };
}

interface BrandForm {
  name: string;
  slug: string;
  categoryId: number;
  logoUrl: string;
  displayOrder: number;
  isActive: boolean;
}

const initialForm: BrandForm = {
  name: '',
  slug: '',
  categoryId: 0,
  logoUrl: '',
  displayOrder: 0,
  isActive: true,
};

export default function BrandsPage() {
  const [brands, setBrands] =
    useState<Brand[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Brand | null>(null);

  const [search, setSearch] =
    useState('');

  const [categoryFilter, setCategoryFilter] =
    useState(0);

  const [form, setForm] =
    useState<BrandForm>(initialForm);

  const loadData = useCallback(
    async () => {
      try {
        setLoading(true);

        const [
          brandsResponse,
          categoriesResponse,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/brands`, {
            cache: 'no-store',
          }),

          fetch(
            `${API_BASE_URL}/categories`,
            {
              cache: 'no-store',
            },
          ),
        ]);

        if (
          !brandsResponse.ok ||
          !categoriesResponse.ok
        ) {
          throw new Error(
            'Unable to load catalogue data',
          );
        }

        setBrands(
          await brandsResponse.json(),
        );

        setCategories(
          await categoriesResponse.json(),
        );
      } catch (error) {
        console.error(error);

        alert(
          'Brands/categories load nahi hue.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function openAddModal() {
    const category =
      categories.find(
        (item) => item.isActive,
      );

    setEditing(null);

    setForm({
      ...initialForm,
      categoryId:
        category?.id ?? 0,
      displayOrder:
        brands.length + 1,
    });

    setModalOpen(true);
  }

  function openEditModal(
    brand: Brand,
  ) {
    setEditing(brand);

    setForm({
      name: brand.name,
      slug: brand.slug,
      logoUrl:
        brand.logoUrl ?? '',
      categoryId:
        brand.categories?.[0]
          ?.category.id ?? 0,
      displayOrder:
        brand.displayOrder,
      isActive:
        brand.isActive,
    });

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
        logoUrl: url,
      }));
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Upload failed',
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!form.categoryId) {
      alert('Category select karo.');
      return;
    }

    if (!form.name.trim()) {
      alert('Brand name enter karo.');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        editing
          ? `${API_BASE_URL}/brands/${editing.id}`
          : `${API_BASE_URL}/brands`,
        {
          method: editing
            ? 'PATCH'
            : 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug.trim(),
            categoryId:
              form.categoryId,

            logoUrl:
              form.logoUrl || undefined,

            displayOrder:
              Number(
                form.displayOrder,
              ),

            isActive:
              form.isActive,
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
                'Brand save failed',
        );
      }

      setModalOpen(false);
      setEditing(null);

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Brand save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(
    brand: Brand,
  ) {
    await fetch(
      `${API_BASE_URL}/brands/${brand.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          isActive:
            !brand.isActive,
        }),
      },
    );

    await loadData();
  }

  async function deleteBrand(
    brand: Brand,
  ) {
    if (
      !window.confirm(
        `${brand.name} delete karna hai?`,
      )
    ) {
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/brands/${brand.id}`,
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

  const filteredBrands =
    brands.filter((brand) => {
      const searchMatch =
        brand.name
          .toLowerCase()
          .includes(
            search.toLowerCase(),
          );

      const categoryMatch =
        categoryFilter === 0 ||
        brand.categories?.some(
          (item) =>
            item.category.id ===
            categoryFilter,
        );

      return (
        searchMatch &&
        categoryMatch
      );
    });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Brands
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Category ke andar brands
            aur logos manage karo.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={18} />
          Add Brand
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row">
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
              placeholder="Search brands..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                Number(
                  event.target.value,
                ),
              )
            }
            className="rounded-xl border border-gray-200 px-4"
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
            Loading...
          </div>
        ) : (
          <div className="divide-y">
            {filteredBrands.map(
              (brand) => (
                <div
                  key={brand.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border bg-gray-50">
                      {brand.logoUrl ? (
                        <img
                          src={
                            brand.logoUrl
                          }
                          alt={
                            brand.name
                          }
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-lg font-bold text-gray-400">
                          {brand.name
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold">
                        {brand.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {brand.categories
                          ?.map(
                            (item) =>
                              item.category
                                .name,
                          )
                          .join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        void toggleStatus(
                          brand,
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        brand.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {brand.isActive
                        ? 'Active'
                        : 'Inactive'}
                    </button>

                    <button
                      onClick={() =>
                        openEditModal(
                          brand,
                        )
                      }
                      className="rounded-lg border p-2"
                    >
                      <Edit3 size={17} />
                    </button>

                    <button
                      onClick={() =>
                        void deleteBrand(
                          brand,
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
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">
                  {editing
                    ? 'Edit Brand'
                    : 'Add Brand'}
                </h2>

                <p className="text-xs text-gray-500">
                  Brand aur logo manage
                  karo.
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
                  onChange={(event) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        categoryId:
                          Number(
                            event.target
                              .value,
                          ),
                      }),
                    )
                  }
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
                  Brand Name
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
                  Brand Logo
                </label>

                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 hover:bg-gray-100">
                  <ImagePlus size={20} />

                  <span className="text-sm font-medium">
                    {uploading
                      ? 'Uploading...'
                      : 'Choose Image'}
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={(event) =>
                      void handleImageChange(
                        event,
                      )
                    }
                    className="hidden"
                  />
                </label>

                {form.logoUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-20 w-20 overflow-hidden rounded-xl border bg-white">
                      <img
                        src={
                          form.logoUrl
                        }
                        alt="Brand preview"
                        className="h-full w-full object-contain p-2"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            logoUrl: '',
                          }),
                        )
                      }
                      className="text-sm font-medium text-red-600"
                    >
                      Remove image
                    </button>
                  </div>
                )}
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
                <div>
                  <p className="text-sm font-medium">
                    Active
                  </p>

                  <p className="text-xs text-gray-500">
                    Website par brand
                    available rahega.
                  </p>
                </div>

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
                      ? 'Update Brand'
                      : 'Add Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}