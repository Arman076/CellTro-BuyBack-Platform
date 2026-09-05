'use client';

import { useEffect, useMemo, useState } from 'react';

import { API_BASE_URL } from '@/lib/api';

type Category = {
  id: number;
  name: string;
};

type Brand = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  brandId: number;
  categoryId: number;
};

type QuestionnaireOption = {
  id: number;
  label: string;
  value: string;
};

type ProductMapping = {
  productId: number;
};

type Question = {
  id: number;
  name: string;
  questionText: string;
  applyToAllProducts: boolean;

  section: {
    id: number;
    name: string;
  };

  options: QuestionnaireOption[];

  productMappings?: ProductMapping[];
};

export default function QuestionnaireDeductionsPage() {
  const [categories, setCategories] = useState<Category[]>(
    [],
  );

  const [brands, setBrands] = useState<Brand[]>([]);

  const [products, setProducts] = useState<Product[]>(
    [],
  );

  const [questions, setQuestions] = useState<Question[]>(
    [],
  );

  const [categoryId, setCategoryId] = useState('');

  const [brandId, setBrandId] = useState('');

  const [questionId, setQuestionId] = useState('');

  const [optionId, setOptionId] = useState('');

  const [deductionPercent, setDeductionPercent] =
    useState('');

  const [search, setSearch] = useState('');

  const [selectedProductIds, setSelectedProductIds] =
    useState<number[]>([]);

  const [updateExisting, setUpdateExisting] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');

  const selectedQuestion = useMemo(
    () =>
      questions.find(
        (question) =>
          question.id === Number(questionId),
      ),
    [questions, questionId],
  );

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/categories`).then((res) =>
        res.json(),
      ),

      fetch(
        `${API_BASE_URL}/questionnaire/questions`,
      ).then((res) => res.json()),
    ])
      .then(([categoryData, questionData]) => {
        setCategories(
          Array.isArray(categoryData)
            ? categoryData
            : [],
        );

        setQuestions(
          Array.isArray(questionData)
            ? questionData
            : [],
        );
      })
      .catch(() => {
        setMessage(
          'Unable to load questionnaire configuration.',
        );
      });
  }, []);

  useEffect(() => {
    setBrandId('');
    setSelectedProductIds([]);

    if (!categoryId) {
      setBrands([]);
      return;
    }

    fetch(
      `${API_BASE_URL}/brands?categoryId=${categoryId}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setBrands(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setBrands([]);
      });
  }, [categoryId]);

  useEffect(() => {
    setSelectedProductIds([]);

    if (!categoryId || !brandId) {
      setProducts([]);
      return;
    }

    fetch(
      `${API_BASE_URL}/products?categoryId=${categoryId}&brandId=${brandId}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setProducts([]);
      });
  }, [categoryId, brandId]);

  useEffect(() => {
    setOptionId('');
    setSelectedProductIds([]);
  }, [questionId]);

  const categoryQuestions = useMemo(() => {
    if (!categoryId) {
      return questions;
    }

    /*
     * If your questions endpoint returns categoryId,
     * add category filtering here.
     *
     * For now product applicability is enforced
     * securely by backend.
     */
    return questions;
  }, [questions, categoryId]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      if (
        normalizedSearch &&
        !product.name
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        return false;
      }

      if (
        selectedQuestion &&
        !selectedQuestion.applyToAllProducts
      ) {
        const allowedIds = new Set(
          (
            selectedQuestion.productMappings || []
          ).map((mapping) => mapping.productId),
        );

        return allowedIds.has(product.id);
      }

      return true;
    });
  }, [products, search, selectedQuestion]);

  function toggleProduct(productId: number) {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function selectAllVisible() {
    const visibleIds = visibleProducts.map(
      (product) => product.id,
    );

    setSelectedProductIds((current) => [
      ...new Set([...current, ...visibleIds]),
    ]);
  }

  function clearSelection() {
    setSelectedProductIds([]);
  }

  async function saveRules() {
    setMessage('');

    if (!questionId) {
      setMessage('Please select a question/item.');
      return;
    }

    if (!optionId) {
      setMessage(
        'Please select the answer that should cause deduction.',
      );
      return;
    }

    if (!selectedProductIds.length) {
      setMessage(
        'Please select at least one phone.',
      );
      return;
    }

    const deduction = Number(deductionPercent);

    if (
      !Number.isFinite(deduction) ||
      deduction < 0 ||
      deduction > 100
    ) {
      setMessage(
        'Deduction must be between 0 and 100%.',
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/questionnaire/deduction-rules/bulk`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            itemId: Number(questionId),
            optionId: Number(optionId),
            productIds: selectedProductIds,
            deductionPercent: deduction,
            updateExisting,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            'Unable to save deduction rules.',
        );
      }

      setMessage(
        `Saved successfully. Created: ${
          result.created
        }, Updated: ${
          result.updated
        }, Skipped: ${result.skipped}`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save deduction rules.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Questionnaire Deduction Rules
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Map questionnaire answers to one or multiple
          phone models without creating duplicate
          questions.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border bg-white p-4 text-sm text-gray-700">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Category
            </label>

            <select
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
              className="w-full rounded-xl border px-3 py-2.5"
            >
              <option value="">
                Select category
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Brand
            </label>

            <select
              value={brandId}
              disabled={!categoryId}
              onChange={(event) =>
                setBrandId(event.target.value)
              }
              className="w-full rounded-xl border px-3 py-2.5 disabled:bg-gray-100"
            >
              <option value="">
                Select brand
              </option>

              {brands.map((brand) => (
                <option
                  key={brand.id}
                  value={brand.id}
                >
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Question / Item
            </label>

            <select
              value={questionId}
              onChange={(event) =>
                setQuestionId(event.target.value)
              }
              className="w-full rounded-xl border px-3 py-2.5"
            >
              <option value="">
                Select question
              </option>

              {categoryQuestions.map((question) => (
                <option
                  key={question.id}
                  value={question.id}
                >
                  {question.section?.name
                    ? `${question.section.name} — `
                    : ''}
                  {question.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Deduct When Customer Selects
            </label>

            <select
              value={optionId}
              disabled={!selectedQuestion}
              onChange={(event) =>
                setOptionId(event.target.value)
              }
              className="w-full rounded-xl border px-3 py-2.5 disabled:bg-gray-100"
            >
              <option value="">
                Select answer
              </option>

              {selectedQuestion?.options?.map(
                (option) => (
                  <option
                    key={option.id}
                    value={option.id}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Deduction %
            </label>

            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={deductionPercent}
                onChange={(event) =>
                  setDeductionPercent(
                    event.target.value,
                  )
                }
                placeholder="e.g. 2"
                className="w-full rounded-xl border px-3 py-2.5 pr-10"
              />

              <span className="absolute right-3 top-2.5 text-gray-500">
                %
              </span>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={(event) =>
                setUpdateExisting(
                  event.target.checked,
                )
              }
              className="mt-1"
            />

            <span>
              <span className="block text-sm font-medium">
                Update existing rules
              </span>

              <span className="block text-xs text-gray-500">
                Keep disabled to safely skip already
                configured phones.
              </span>
            </span>
          </label>

          <button
            onClick={saveRules}
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading
              ? 'Saving...'
              : `Save Rules (${selectedProductIds.length} phones)`}
          </button>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                Select Phones
              </h2>

              <p className="text-sm text-gray-500">
                Select one phone or as many phones as
                required.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={clearSelection}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Clear
              </button>
            </div>
          </div>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search phone model..."
            className="mt-5 w-full rounded-xl border px-3 py-2.5"
          />

          {!brandId ? (
            <div className="py-16 text-center text-sm text-gray-500">
              Select category and brand first.
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              No applicable phone models found.
            </div>
          ) : (
            <div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((product) => {
                const selected =
                  selectedProductIds.includes(
                    product.id,
                  );

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() =>
                      toggleProduct(product.id)
                    }
                    className={`rounded-xl border p-3 text-left transition ${
                      selected
                        ? 'border-gray-900 bg-gray-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        readOnly
                      />

                      <span className="text-sm font-medium">
                        {product.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}