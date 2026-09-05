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
  brand?: {
    id: number;
    name: string;
  };
};

type Audience = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
};

type Section = {
  id: number;
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

type OptionRow = {
  label: string;
  deductionPercent: number;
};

type Question = {
  id: number;
  code: string;
  name: string;
  questionText: string;
  answerType: 'YES_NO' | 'SINGLE_SELECT' | 'MULTI_SELECT';
  displayOrder: number;
  isRequired: boolean;
  isActive: boolean;
  applyToAllProducts: boolean;

  section?: Section;

  options?: {
    id: number;
    label: string;
    value: string;
    deductionPercent: number | string;
  }[];

  audiences?: {
    audienceId: number;
    audience: Audience;
  }[];

  productMappings?: {
    productId: number;
    product: Product;
  }[];
};

function createInternalValue(label: string) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default function QuestionnairePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [sections, setSections] = useState<Section[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [productId, setProductId] = useState<number | ''>('');

  const [sectionId, setSectionId] = useState<number | ''>('');
  const [audienceIds, setAudienceIds] = useState<number[]>([]);

  const [questionName, setQuestionName] = useState('');
  const [questionText, setQuestionText] = useState('');

  const [answerType, setAnswerType] = useState<
    'YES_NO' | 'SINGLE_SELECT' | 'MULTI_SELECT'
  >('YES_NO');

  const [options, setOptions] = useState<OptionRow[]>([
    {
      label: 'Yes',
      deductionPercent: 0,
    },
    {
      label: 'No',
      deductionPercent: 0,
    },
  ]);

  const [isRequired, setIsRequired] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(1);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    setBrandId('');
    setProductId('');
    setBrands([]);
    setProducts([]);

    if (categoryId) {
      loadBrands(Number(categoryId));
    }
  }, [categoryId]);

  useEffect(() => {
    setProductId('');
    setProducts([]);

    if (categoryId && brandId) {
      loadProducts(
        Number(categoryId),
        Number(brandId),
      );
    }
  }, [brandId]);

  useEffect(() => {
    if (productId) {
      loadQuestions(Number(productId));
    } else {
      setQuestions([]);
    }
  }, [productId]);

  async function loadInitialData() {
    try {
      setLoading(true);

      const [
        categoryResponse,
        sectionResponse,
        audienceResponse,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/categories`),
        fetch(`${API_BASE_URL}/questionnaire/sections`),
        fetch(`${API_BASE_URL}/questionnaire/audiences`),
      ]);

      if (!categoryResponse.ok) {
        throw new Error('Unable to load categories');
      }

      if (!sectionResponse.ok) {
        throw new Error('Unable to load sections');
      }

      if (!audienceResponse.ok) {
        throw new Error('Unable to load audiences');
      }

      setCategories(await categoryResponse.json());
      setSections(await sectionResponse.json());

      const audienceData =
        await audienceResponse.json();

      setAudiences(audienceData);

      const customer =
        audienceData.find(
          (item: Audience) =>
            item.code === 'CUSTOMER',
        );

      if (customer) {
        setAudienceIds([customer.id]);
      }
    } catch (err: any) {
      setError(
        err.message || 'Unable to load questionnaire',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadBrands(selectedCategoryId: number) {
    try {
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/brands?categoryId=${selectedCategoryId}`,
      );

      if (!response.ok) {
        throw new Error('Unable to load brands');
      }

      setBrands(await response.json());
    } catch (err: any) {
      setError(err.message || 'Unable to load brands');
    }
  }

  async function loadProducts(
    selectedCategoryId: number,
    selectedBrandId: number,
  ) {
    try {
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/products?categoryId=${selectedCategoryId}&brandId=${selectedBrandId}`,
      );

      if (!response.ok) {
        throw new Error('Unable to load models');
      }

      setProducts(await response.json());
    } catch (err: any) {
      setError(err.message || 'Unable to load models');
    }
  }

  async function loadQuestions(selectedProductId: number) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/questionnaire/questions`,
      );

      if (!response.ok) {
        throw new Error('Unable to load questions');
      }

      const data: Question[] =
        await response.json();

      const filtered = data.filter(
        (question) =>
          question.applyToAllProducts ||
          question.productMappings?.some(
            (mapping) =>
              mapping.productId ===
              selectedProductId,
          ),
      );

      setQuestions(filtered);
    } catch (err: any) {
      setError(err.message || 'Unable to load questions');
    }
  }

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (item) => item.id === Number(categoryId),
      ),
    [categories, categoryId],
  );

  const selectedBrand = useMemo(
    () =>
      brands.find(
        (item) => item.id === Number(brandId),
      ),
    [brands, brandId],
  );

  const selectedProduct = useMemo(
    () =>
      products.find(
        (item) => item.id === Number(productId),
      ),
    [products, productId],
  );

  function changeAnswerType(
    type:
      | 'YES_NO'
      | 'SINGLE_SELECT'
      | 'MULTI_SELECT',
  ) {
    setAnswerType(type);

    if (type === 'YES_NO') {
      setOptions([
        {
          label: 'Yes',
          deductionPercent: 0,
        },
        {
          label: 'No',
          deductionPercent: 0,
        },
      ]);
    } else {
      setOptions([
        {
          label: '',
          deductionPercent: 0,
        },
      ]);
    }
  }

  function updateOption(
    index: number,
    field: keyof OptionRow,
    value: string | number,
  ) {
    setOptions((current) =>
      current.map((option, currentIndex) =>
        currentIndex === index
          ? {
              ...option,
              [field]: value,
            }
          : option,
      ),
    );
  }

  function addOption() {
    setOptions((current) => [
      ...current,
      {
        label: '',
        deductionPercent: 0,
      },
    ]);
  }

  function removeOption(index: number) {
    setOptions((current) =>
      current.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    );
  }

  function toggleAudience(id: number) {
    setAudienceIds((current) =>
      current.includes(id)
        ? current.filter(
            (audienceId) =>
              audienceId !== id,
          )
        : [...current, id],
    );
  }

  async function createQuestion() {
    try {
      setMessage('');
      setError('');

      if (!categoryId) {
        throw new Error('Select category');
      }

      if (!brandId) {
        throw new Error('Select brand');
      }

      if (!productId) {
        throw new Error('Select model');
      }

      if (!sectionId) {
        throw new Error(
          'Select questionnaire section',
        );
      }

      if (!questionName.trim()) {
        throw new Error(
          'Enter question name',
        );
      }

      if (!questionText.trim()) {
        throw new Error(
          'Enter customer question',
        );
      }

      if (!audienceIds.length) {
        throw new Error(
          'Select at least one audience',
        );
      }

      const invalidOption = options.find(
        (option) =>
          !option.label.trim() ||
          option.deductionPercent < 0 ||
          option.deductionPercent > 100,
      );

      if (invalidOption) {
        throw new Error(
          'Check answer options and deduction percentage',
        );
      }

      setSaving(true);

      const code = createInternalValue(
        `${selectedProduct?.name}_${questionName}`,
      );

      const response = await fetch(
        `${API_BASE_URL}/questionnaire/questions`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            code,

            name: questionName.trim(),
            questionText:
              questionText.trim(),

            answerType,

            sectionId:
              Number(sectionId),

            categoryId:
              Number(categoryId),

            displayOrder,

            isRequired,
            isActive,

            applyToAllProducts: false,

            audienceIds,

            productIds: [
              Number(productId),
            ],

            options: options.map(
              (option, index) => ({
                label:
                  option.label.trim(),

                value:
                  createInternalValue(
                    option.label,
                  ),

                deductionPercent:
                  Number(
                    option.deductionPercent,
                  ),

                displayOrder:
                  index + 1,

                isActive: true,
              }),
            ),
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ||
                'Unable to create question',
        );
      }

      setMessage(
        'Question added successfully',
      );

      resetQuestionForm();

      await loadQuestions(
        Number(productId),
      );
    } catch (err: any) {
      setError(
        err.message || 'Unable to save question',
      );
    } finally {
      setSaving(false);
    }
  }

  function resetQuestionForm() {
    setSectionId('');
    setQuestionName('');
    setQuestionText('');

    setAnswerType('YES_NO');

    setOptions([
      {
        label: 'Yes',
        deductionPercent: 0,
      },
      {
        label: 'No',
        deductionPercent: 0,
      },
    ]);

    setDisplayOrder(1);
    setIsRequired(true);
    setIsActive(true);
  }

  async function deleteQuestion(id: number) {
    const confirmed =
      window.confirm(
        'Delete this question?',
      );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/questionnaire/questions/${id}`,
        {
          method: 'DELETE',
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to delete question',
        );
      }

      setMessage(
        'Question deleted successfully',
      );

      await loadQuestions(
        Number(productId),
      );
    } catch (err: any) {
      setError(
        err.message ||
          'Unable to delete question',
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-sm font-medium text-slate-500">
          Loading Questionnaire...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Questionnaire Management
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Configure model specific questions,
            accessories and percentage
            deductions without changing code.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Select Product
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select category, brand and model
              before configuring its
              questionnaire.
            </p>
          </div>

          <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Category
              </label>

              <select
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(
                    event.target.value
                      ? Number(
                          event.target.value,
                        )
                      : '',
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              >
                <option value="">
                  Select category
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
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Brand
              </label>

              <select
                value={brandId}
                disabled={!categoryId}
                onChange={(event) =>
                  setBrandId(
                    event.target.value
                      ? Number(
                          event.target.value,
                        )
                      : '',
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition disabled:bg-slate-100 focus:border-slate-900"
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
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Model
              </label>

              <select
                value={productId}
                disabled={!brandId}
                onChange={(event) =>
                  setProductId(
                    event.target.value
                      ? Number(
                          event.target.value,
                        )
                      : '',
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition disabled:bg-slate-100 focus:border-slate-900"
              >
                <option value="">
                  Select model
                </option>

                {products.map(
                  (product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          {selectedProduct && (
            <div className="mx-5 mb-5 rounded-xl bg-slate-900 px-5 py-4 text-white sm:mx-6 sm:mb-6">
              <p className="text-xs uppercase tracking-wider text-slate-300">
                Editing Questionnaire
              </p>

              <p className="mt-1 font-semibold">
                {selectedCategory?.name}
                {' / '}
                {selectedBrand?.name}
                {' / '}
                {selectedProduct.name}
              </p>
            </div>
          )}
        </div>

        {productId && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_390px]">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Add Questionnaire Item
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add accessories, condition
                  checks or functional problems
                  for this model.
                </p>
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Section
                  </label>

                  <select
                    value={sectionId}
                    onChange={(event) =>
                      setSectionId(
                        event.target.value
                          ? Number(
                              event.target.value,
                            )
                          : '',
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                  >
                    <option value="">
                      Select section
                    </option>

                    {sections
                      .filter(
                        (section) =>
                          section.isActive,
                      )
                      .map((section) => (
                        <option
                          key={section.id}
                          value={section.id}
                        >
                          {section.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Item Name
                    </label>

                    <input
                      value={questionName}
                      onChange={(event) =>
                        setQuestionName(
                          event.target.value,
                        )
                      }
                      placeholder="Example: S Pen"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Answer Type
                    </label>

                    <select
                      value={answerType}
                      onChange={(event) =>
                        changeAnswerType(
                          event.target
                            .value as
                            | 'YES_NO'
                            | 'SINGLE_SELECT'
                            | 'MULTI_SELECT',
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    >
                      <option value="YES_NO">
                        Yes / No
                      </option>

                      <option value="SINGLE_SELECT">
                        Single Choice
                      </option>

                      <option value="MULTI_SELECT">
                        Multiple Choice
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Question shown to user
                  </label>

                  <input
                    value={questionText}
                    onChange={(event) =>
                      setQuestionText(
                        event.target.value,
                      )
                    }
                    placeholder="Example: Is the S Pen available?"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Answer & Deduction
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Enter only what admin
                        needs. Internal values
                        are generated
                        automatically.
                      </p>
                    </div>

                    {answerType !==
                      'YES_NO' && (
                      <button
                        type="button"
                        onClick={addOption}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                      >
                        + Add
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {options.map(
                      (option, index) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_180px_auto]"
                        >
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Answer
                            </label>

                            <input
                              value={
                                option.label
                              }
                              disabled={
                                answerType ===
                                'YES_NO'
                              }
                              onChange={(
                                event,
                              ) =>
                                updateOption(
                                  index,
                                  'label',
                                  event.target
                                    .value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Deduction %
                            </label>

                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={
                                option.deductionPercent
                              }
                              onChange={(
                                event,
                              ) =>
                                updateOption(
                                  index,
                                  'deductionPercent',
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                            />
                          </div>

                          {answerType !==
                            'YES_NO' && (
                            <button
                              type="button"
                              onClick={() =>
                                removeOption(
                                  index,
                                )
                              }
                              className="mt-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">
                    Audience
                  </h3>

                  <div className="flex flex-wrap gap-3">
                    {audiences
                      .filter(
                        (audience) =>
                          audience.isActive,
                      )
                      .map((audience) => (
                        <label
                          key={audience.id}
                          className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium transition ${
                            audienceIds.includes(
                              audience.id,
                            )
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={audienceIds.includes(
                              audience.id,
                            )}
                            onChange={() =>
                              toggleAudience(
                                audience.id,
                              )
                            }
                          />

                          {audience.name}
                        </label>
                      ))}
                  </div>
                </div>

                <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(event) =>
                        setIsRequired(
                          event.target
                            .checked,
                        )
                      }
                    />

                    Required
                  </label>

                  <label className="flex items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) =>
                        setIsActive(
                          event.target
                            .checked,
                        )
                      }
                    />

                    Active
                  </label>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Display Order
                    </label>

                    <input
                      type="number"
                      value={displayOrder}
                      onChange={(event) =>
                        setDisplayOrder(
                          Number(
                            event.target
                              .value,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={createQuestion}
                  disabled={saving}
                  className="w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 sm:w-auto"
                >
                  {saving
                    ? 'Saving...'
                    : 'Add Questionnaire Item'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="font-semibold text-slate-900">
                  Model Questionnaire
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Questions currently
                  applicable to this model.
                </p>
              </div>

              <div className="max-h-[850px] space-y-5 overflow-y-auto p-4">
                {sections
                  .filter(
                    (section) =>
                      questions.some(
                        (question) =>
                          question.section
                            ?.id ===
                          section.id,
                      ),
                  )
                  .map((section) => {
                    const sectionQuestions =
                      questions.filter(
                        (question) =>
                          question.section
                            ?.id ===
                          section.id,
                      );

                    return (
                      <div
                        key={section.id}
                        className="overflow-hidden rounded-xl border border-slate-200"
                      >
                        <div className="bg-slate-100 px-4 py-3">
                          <h3 className="text-sm font-bold text-slate-800">
                            {section.name}
                          </h3>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {sectionQuestions.map(
                            (question) => (
                              <div
                                key={
                                  question.id
                                }
                                className="p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                      {
                                        question.name
                                      }
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                      {
                                        question.questionText
                                      }
                                    </p>
                                  </div>

                                  <button
                                    onClick={() =>
                                      deleteQuestion(
                                        question.id,
                                      )
                                    }
                                    className="text-xs font-medium text-red-500"
                                  >
                                    Delete
                                  </button>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {question.options?.map(
                                    (
                                      option,
                                    ) => (
                                      <span
                                        key={
                                          option.id
                                        }
                                        className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
                                      >
                                        {
                                          option.label
                                        }
                                        {' · '}
                                        {Number(
                                          option.deductionPercent,
                                        )}
                                        %
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    );
                  })}

                {!questions.length && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      No questions configured
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Add the first question
                      for this model.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}