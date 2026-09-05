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
  Trash2,
  X,
} from 'lucide-react';

import { API_BASE_URL } from '@/lib/api';

interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

interface AttributeOption {
  id: number;
  value: string;
  displayOrder: number;
  isActive: boolean;
}

interface VariantAttribute {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  categoryId: number;
  options: AttributeOption[];
}

interface AttributeForm {
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

interface OptionForm {
  value: string;
  displayOrder: number;
  isActive: boolean;
}

const initialAttributeForm: AttributeForm = {
  name: '',
  slug: '',
  displayOrder: 0,
  isActive: true,
};

const initialOptionForm: OptionForm = {
  value: '',
  displayOrder: 0,
  isActive: true,
};

export default function VariantAttributesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState(0);

  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);

  const [loading, setLoading] = useState(true);
  const [attributesLoading, setAttributesLoading] = useState(false);

  const [attributeModalOpen, setAttributeModalOpen] = useState(false);
  const [optionModalOpen, setOptionModalOpen] = useState(false);

  const [editingAttribute, setEditingAttribute] =
    useState<VariantAttribute | null>(null);

  const [editingOption, setEditingOption] =
    useState<AttributeOption | null>(null);

  const [selectedAttribute, setSelectedAttribute] =
    useState<VariantAttribute | null>(null);

  const [attributeForm, setAttributeForm] =
    useState<AttributeForm>(initialAttributeForm);

  const [optionForm, setOptionForm] =
    useState<OptionForm>(initialOptionForm);

  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/categories`,
        {
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        throw new Error('Categories load failed');
      }

      const data: Category[] = await response.json();

      const activeCategories = data.filter(
        (category) => category.isActive,
      );

      setCategories(activeCategories);

      if (activeCategories.length > 0) {
        setCategoryId((current) =>
          current || activeCategories[0].id,
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        `Categories load nahi hui. Backend ${API_BASE_URL} check karo.`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAttributes = useCallback(
    async (selectedCategoryId: number) => {
      if (!selectedCategoryId) {
        setAttributes([]);
        return;
      }

      try {
        setAttributesLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/variant-attributes?categoryId=${selectedCategoryId}`,
          {
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          const data = await response
            .json()
            .catch(() => null);

          throw new Error(
            Array.isArray(data?.message)
              ? data.message.join(', ')
              : data?.message ||
                  'Variant attributes load failed',
          );
        }

        const data: VariantAttribute[] =
          await response.json();

        setAttributes(
          data.sort(
            (a, b) =>
              a.displayOrder -
              b.displayOrder,
          ),
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
    },
    [],
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (categoryId) {
      void loadAttributes(categoryId);
    }
  }, [categoryId, loadAttributes]);

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) =>
          category.id === categoryId,
      ),
    [categories, categoryId],
  );

  function slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function openAddAttribute() {
    if (!categoryId) {
      alert('Category select karo.');
      return;
    }

    setEditingAttribute(null);
    setAttributeForm(initialAttributeForm);
    setAttributeModalOpen(true);
  }

  function openEditAttribute(
    attribute: VariantAttribute,
  ) {
    setEditingAttribute(attribute);

    setAttributeForm({
      name: attribute.name,
      slug: attribute.slug,
      displayOrder:
        attribute.displayOrder,
      isActive: attribute.isActive,
    });

    setAttributeModalOpen(true);
  }

  async function saveAttribute(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!categoryId) {
      alert('Category select karo.');
      return;
    }

    if (!attributeForm.name.trim()) {
      alert('Attribute name required hai.');
      return;
    }

    const payload = {
      categoryId,
      name: attributeForm.name.trim(),
      slug:
        attributeForm.slug.trim() ||
        slugify(attributeForm.name),
      displayOrder:
        Number(
          attributeForm.displayOrder,
        ),
      isActive:
        attributeForm.isActive,
    };

    try {
      setSaving(true);

      const url = editingAttribute
        ? `${API_BASE_URL}/variant-attributes/${editingAttribute.id}`
        : `${API_BASE_URL}/variant-attributes`;

      const response = await fetch(url, {
        method: editingAttribute
          ? 'PATCH'
          : 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message ||
                'Attribute save failed',
        );
      }

      setAttributeModalOpen(false);
      setEditingAttribute(null);

      await loadAttributes(categoryId);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Attribute save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAttribute(
    attribute: VariantAttribute,
  ) {
    const confirmed = window.confirm(
      `"${attribute.name}" attribute delete karna hai?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/variant-attributes/${attribute.id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message ||
                'Attribute delete failed',
        );
      }

      await loadAttributes(categoryId);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Attribute delete failed',
      );
    }
  }

  function openAddOption(
    attribute: VariantAttribute,
  ) {
    setSelectedAttribute(attribute);
    setEditingOption(null);
    setOptionForm(initialOptionForm);
    setOptionModalOpen(true);
  }

  function openEditOption(
    attribute: VariantAttribute,
    option: AttributeOption,
  ) {
    setSelectedAttribute(attribute);
    setEditingOption(option);

    setOptionForm({
      value: option.value,
      displayOrder:
        option.displayOrder,
      isActive: option.isActive,
    });

    setOptionModalOpen(true);
  }

  async function saveOption(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!selectedAttribute) {
      return;
    }

    if (!optionForm.value.trim()) {
      alert('Option value required hai.');
      return;
    }

    const payload = {
      value: optionForm.value.trim(),
      displayOrder:
        Number(optionForm.displayOrder),
      isActive: optionForm.isActive,
    };

    try {
      setSaving(true);

      const url = editingOption
        ? `${API_BASE_URL}/variant-attributes/${selectedAttribute.id}/options/${editingOption.id}`
        : `${API_BASE_URL}/variant-attributes/${selectedAttribute.id}/options`;

      const response = await fetch(url, {
        method: editingOption
          ? 'PATCH'
          : 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message ||
                'Option save failed',
        );
      }

      setOptionModalOpen(false);
      setSelectedAttribute(null);
      setEditingOption(null);

      await loadAttributes(categoryId);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Option save failed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOption(
    attribute: VariantAttribute,
    option: AttributeOption,
  ) {
    const confirmed = window.confirm(
      `"${option.value}" option delete karna hai?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/variant-attributes/${attribute.id}/options/${option.id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message ||
                'Option delete failed',
        );
      }

      await loadAttributes(categoryId);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Option delete failed',
      );
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Variant Attributes
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Category-wise RAM, Storage,
            Processor, Color jaise
            dynamic attributes configure
            karo.
          </p>
        </div>

        <button
          onClick={openAddAttribute}
          disabled={!categoryId}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus size={18} />
          Add Attribute
        </button>
      </div>

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Select Category
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={categoryId}
            onChange={(event) =>
              setCategoryId(
                Number(
                  event.target.value,
                ),
              )
            }
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 sm:max-w-sm"
          >
            <option value={0}>
              Select Category
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
              void loadAttributes(
                categoryId,
              )
            }
            disabled={!categoryId}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>
      </div>

      {loading ||
      attributesLoading ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-sm text-gray-500">
          Loading...
        </div>
      ) : !categoryId ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-gray-500">
          Category select karo.
        </div>
      ) : attributes.length ===
        0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
          <p className="font-semibold text-gray-800">
            No attributes configured
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {selectedCategory?.name} ke
            liye RAM, Storage ya koi
            other attribute add karo.
          </p>

          <button
            onClick={openAddAttribute}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={17} />
            Add First Attribute
          </button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {attributes.map(
            (attribute) => (
              <div
                key={attribute.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">
                        {attribute.name}
                      </h2>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          attribute.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {attribute.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      slug: {attribute.slug}
                      {' • '}
                      order:{' '}
                      {
                        attribute.displayOrder
                      }
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        openEditAttribute(
                          attribute,
                        )
                      }
                      className="rounded-lg border p-2 hover:bg-gray-50"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button
                      onClick={() =>
                        void deleteAttribute(
                          attribute,
                        )
                      }
                      className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">
                      Options
                    </h3>

                    <button
                      onClick={() =>
                        openAddOption(
                          attribute,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                    >
                      <Plus size={14} />
                      Add Option
                    </button>
                  </div>

                  {attribute.options
                    ?.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-4 text-center text-sm text-gray-500">
                      Abhi koi option nahi
                      hai.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attribute.options
                        .sort(
                          (a, b) =>
                            a.displayOrder -
                            b.displayOrder,
                        )
                        .map(
                          (option) => (
                            <div
                              key={
                                option.id
                              }
                              className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {
                                    option.value
                                  }
                                </p>

                                <p className="text-xs text-gray-400">
                                  Order:{' '}
                                  {
                                    option.displayOrder
                                  }{' '}
                                  •{' '}
                                  {option.isActive
                                    ? 'Active'
                                    : 'Inactive'}
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    openEditOption(
                                      attribute,
                                      option,
                                    )
                                  }
                                  className="rounded-lg border p-1.5"
                                >
                                  <Edit3
                                    size={
                                      14
                                    }
                                  />
                                </button>

                                <button
                                  onClick={() =>
                                    void deleteOption(
                                      attribute,
                                      option,
                                    )
                                  }
                                  className="rounded-lg border border-red-100 p-1.5 text-red-500"
                                >
                                  <Trash2
                                    size={
                                      14
                                    }
                                  />
                                </button>
                              </div>
                            </div>
                          ),
                        )}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {attributeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="w-full bg-white sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-bold">
                {editingAttribute
                  ? 'Edit Attribute'
                  : 'Add Attribute'}
              </h2>

              <button
                onClick={() =>
                  setAttributeModalOpen(
                    false,
                  )
                }
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveAttribute}
              className="space-y-4 p-5"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Attribute Name
                </label>

                <input
                  required
                  value={
                    attributeForm.name
                  }
                  onChange={(event) =>
                    setAttributeForm(
                      (previous) => ({
                        ...previous,
                        name: event.target
                          .value,
                        slug:
                          editingAttribute
                            ? previous.slug
                            : slugify(
                                event
                                  .target
                                  .value,
                              ),
                      }),
                    )
                  }
                  placeholder="RAM"
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Slug
                </label>

                <input
                  required
                  value={
                    attributeForm.slug
                  }
                  onChange={(event) =>
                    setAttributeForm(
                      (previous) => ({
                        ...previous,
                        slug: slugify(
                          event.target
                            .value,
                        ),
                      }),
                    )
                  }
                  placeholder="ram"
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Display Order
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    attributeForm.displayOrder
                  }
                  onChange={(event) =>
                    setAttributeForm(
                      (previous) => ({
                        ...previous,
                        displayOrder:
                          Number(
                            event
                              .target
                              .value,
                          ),
                      }),
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </div>

              <label className="flex items-center justify-between rounded-xl border p-4">
                <span className="text-sm font-medium">
                  Active
                </span>

                <input
                  type="checkbox"
                  checked={
                    attributeForm.isActive
                  }
                  onChange={(event) =>
                    setAttributeForm(
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

              <button
                disabled={saving}
                className="w-full rounded-xl bg-gray-900 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingAttribute
                    ? 'Update Attribute'
                    : 'Create Attribute'}
              </button>
            </form>
          </div>
        </div>
      )}

      {optionModalOpen &&
        selectedAttribute && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
            <div className="w-full bg-white sm:max-w-md sm:rounded-2xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {editingOption
                      ? 'Edit Option'
                      : 'Add Option'}
                  </h2>

                  <p className="text-xs text-gray-500">
                    {
                      selectedAttribute.name
                    }
                  </p>
                </div>

                <button
                  onClick={() =>
                    setOptionModalOpen(
                      false,
                    )
                  }
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={saveOption}
                className="space-y-4 p-5"
              >
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Option Value
                  </label>

                  <input
                    required
                    value={
                      optionForm.value
                    }
                    onChange={(event) =>
                      setOptionForm(
                        (previous) => ({
                          ...previous,
                          value:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="8GB"
                    className="w-full rounded-xl border px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Display Order
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      optionForm.displayOrder
                    }
                    onChange={(event) =>
                      setOptionForm(
                        (previous) => ({
                          ...previous,
                          displayOrder:
                            Number(
                              event
                                .target
                                .value,
                            ),
                        }),
                      )
                    }
                    className="w-full rounded-xl border px-3 py-2.5"
                  />
                </div>

                <label className="flex items-center justify-between rounded-xl border p-4">
                  <span className="text-sm font-medium">
                    Active
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      optionForm.isActive
                    }
                    onChange={(event) =>
                      setOptionForm(
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

                <button
                  disabled={saving}
                  className="w-full rounded-xl bg-gray-900 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingOption
                      ? 'Update Option'
                      : 'Add Option'}
                </button>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}