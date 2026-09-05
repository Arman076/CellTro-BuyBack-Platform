'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
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
  slug: string;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

const initialForm: FormData = {
  name: '',
  slug: '',
  displayOrder: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Category | null>(null);

  const [search, setSearch] =
    useState('');

  const [form, setForm] =
    useState<FormData>(initialForm);

  const loadCategories =
    useCallback(async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/categories`,
          {
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          throw new Error(
            'Unable to load categories',
          );
        }

        const data: Category[] =
          await response.json();

        setCategories(data);
      } catch (error) {
        console.error(error);
        alert(
          'Categories load nahi hui. Backend check karo.',
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCategories();
  }, [loadCategories]);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function openAddModal() {
    setEditing(null);

    setForm({
      ...initialForm,
      displayOrder:
        categories.length + 1,
    });

    setModalOpen(true);
  }

  function openEditModal(
    category: Category,
  ) {
    setEditing(category);

    setForm({
      name: category.name,
      slug: category.slug,
      displayOrder:
        category.displayOrder,
      isActive: category.isActive,
    });

    setModalOpen(true);
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      const url = editing
        ? `${API_BASE_URL}/categories/${editing.id}`
        : `${API_BASE_URL}/categories`;

      const response = await fetch(url, {
        method: editing
          ? 'PATCH'
          : 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const result =
          await response.json();

        throw new Error(
          result.message ||
            'Unable to save category',
        );
      }

      setModalOpen(false);
      setEditing(null);
      setForm(initialForm);

      await loadCategories();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : 'Category save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(
    category: Category,
  ) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/categories/${category.id}`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            isActive:
              !category.isActive,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          'Status update failed',
        );
      }

      await loadCategories();
    } catch (error) {
      console.error(error);

      alert('Status update failed');
    }
  }

  async function deleteCategory(
    category: Category,
  ) {
    const confirmed =
      window.confirm(
        `${category.name} delete karna hai?`,
      );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/categories/${category.id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(
          'Delete failed',
        );
      }

      await loadCategories();
    } catch (error) {
      console.error(error);

      alert(
        'Category delete nahi hui. Agar category ke andar brands/products hain to pehle unhe handle karna padega.',
      );
    }
  }

  const filteredCategories =
    categories.filter((category) =>
      category.name
        .toLowerCase()
        .includes(
          search.toLowerCase(),
        ),
    );

  return (
    <div>
      {/* Header */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Categories
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Mobile, Laptop, Tablet
            aur other product categories
            manage karo.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Plus size={18} />

          Add Category
        </button>
      </div>

      {/* Main card */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
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
              placeholder="Search categories..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
            />
          </div>

          <button
            onClick={() =>
              void loadCategories()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={17} />

            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading categories...
          </div>
        ) : filteredCategories.length ===
          0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-gray-700">
              No categories found
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Add your first category.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3">
                      Category
                    </th>

                    <th className="px-5 py-3">
                      Slug
                    </th>

                    <th className="px-5 py-3">
                      Order
                    </th>

                    <th className="px-5 py-3">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredCategories.map(
                    (category) => (
                      <tr
                        key={
                          category.id
                        }
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {
                              category.name
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-500">
                          {
                            category.slug
                          }
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {
                            category.displayOrder
                          }
                        </td>

                        <td className="px-5 py-4">
                          <button
                            onClick={() =>
                              void toggleStatus(
                                category,
                              )
                            }
                            className={`
                              rounded-full px-3 py-1
                              text-xs font-semibold

                              ${
                                category.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }
                            `}
                          >
                            {category.isActive
                              ? 'Active'
                              : 'Inactive'}
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                openEditModal(
                                  category,
                                )
                              }
                              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100"
                            >
                              <Edit3
                                size={
                                  17
                                }
                              />
                            </button>

                            <button
                              onClick={() =>
                                void deleteCategory(
                                  category,
                                )
                              }
                              className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50"
                            >
                              <Trash2
                                size={
                                  17
                                }
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}

            <div className="divide-y divide-gray-100 md:hidden">
              {filteredCategories.map(
                (category) => (
                  <div
                    key={category.id}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {
                            category.name
                          }
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          /
                          {
                            category.slug
                          }
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          void toggleStatus(
                            category,
                          )
                        }
                        className={`
                          rounded-full px-2.5 py-1
                          text-xs font-semibold

                          ${
                            category.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }
                        `}
                      >
                        {category.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Display order:{' '}
                        {
                          category.displayOrder
                        }
                      </span>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            openEditModal(
                              category,
                            )
                          }
                          className="rounded-lg border border-gray-200 p-2"
                        >
                          <Edit3
                            size={16}
                          />
                        </button>

                        <button
                          onClick={() =>
                            void deleteCategory(
                              category,
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
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal */}

      {modalOpen && (
        <div className="fixed inset-0 z-100 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editing
                    ? 'Edit Category'
                    : 'Add Category'}
                </h2>

                <p className="text-xs text-gray-500">
                  Category website
                  catalogue me use hogi.
                </p>
              </div>

              <button
                onClick={() =>
                  setModalOpen(false)
                }
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Category Name
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
                  placeholder="Mobile"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
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
                  placeholder="mobile"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-gray-400"
                />
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 p-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Active
                  </p>

                  <p className="text-xs text-gray-500">
                    Customer website par
                    category show hogi.
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
                  className="h-5 w-5"
                />
              </label>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setModalOpen(false)
                  }
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  type="submit"
                  className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editing
                      ? 'Update Category'
                      : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}