"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type IdName = { id: number; name: string };
type Section = IdName & {
  code: string;
  displayOrder: number;
  isActive?: boolean;
  calculationMode?: "MAX" | "SUM" | "SINGLE";
};
type Audience = IdName & { code: string };
type Capability = IdName & { code: string };

type DeductionType = "PERCENTAGE" | "FIXED";
type DeductionTrigger = "SELECTED" | "MISSING";
type SelectionMode = "SINGLE" | "MULTI";
type ApplicabilityScope = "GLOBAL" | "PRODUCT";

type ChildForm = {
  id?: number;
  label: string;
  issueCode: string;
  deductionType: DeductionType;
  deductionValue: number;
  deductionTrigger: DeductionTrigger;
  applicabilityScope: ApplicabilityScope;
  applicabilityTargetId: number | null;
  capabilityIds: number[];
  isActive: boolean;
};

type GroupForm = {
  id?: number;
  name: string;
  isActive: boolean;
  childOptions: ChildForm[];
};

type AnswerForm = ChildForm & {
  showChildOptions: boolean;
  childPrompt: string;
  requireChildSelection: boolean;
  minChildSelections: number;
  maxChildSelections: number | null;
  childSelectionMode: SelectionMode;
  childOptions: ChildForm[];
  issueGroups: GroupForm[];
};

type Question = {
  id: number;
  name: string;
  questionText: string;
  answerType: "YES_NO" | "SINGLE_SELECT" | "MULTI_SELECT";
  displayOrder: number;
  isRequired: boolean;
  isActive: boolean;
  applyToAllProducts: boolean;
  categoryId?: number | null;
  category?: IdName | null;
  section: Section;
  audiences: Array<{ audienceId?: number; audience: Audience }>;
  productMappings: Array<{ productId: number; product?: any }>;
  options: any[];
};

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message || `Request failed (${response.status})`,
    );
  }

  return data;
}

function key(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const blankChild = (): ChildForm => ({
  label: "",
  issueCode: "",
  deductionType: "PERCENTAGE",
  deductionValue: 0,
  deductionTrigger: "SELECTED",
  applicabilityScope: "GLOBAL",
  applicabilityTargetId: null,
  capabilityIds: [],
  isActive: true,
});

const blankGroup = (): GroupForm => ({
  name: "",
  isActive: true,
  childOptions: [blankChild()],
});

const answer = (label: string): AnswerForm => ({
  ...blankChild(),
  label,
  showChildOptions: false,
  childPrompt: "",
  requireChildSelection: false,
  minChildSelections: 0,
  maxChildSelections: null,
  childSelectionMode: "MULTI",
  childOptions: [],
  issueGroups: [],
});

function deductionText(o: any) {
  const value = Number(o.deductionValue ?? o.deductionPercent ?? 0);
  return o.deductionType === "FIXED" ? `₹${value}` : `${value}%`;
}

export default function QuestionnaireBuilderPage() {
  const [categories, setCategories] = useState<IdName[]>([]);
  const [brands, setBrands] = useState<IdName[]>([]);
  const [products, setProducts] = useState<IdName[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [scope, setScope] = useState<"CATEGORY" | "MODEL">("CATEGORY");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [name, setName] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [answerType, setAnswerType] =
    useState<"YES_NO" | "SINGLE_SELECT" | "MULTI_SELECT">("YES_NO");
  const [audienceIds, setAudienceIds] = useState<number[]>([]);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isRequired, setIsRequired] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [answers, setAnswers] = useState<AnswerForm[]>([
    answer("Yes"),
    answer("No"),
  ]);

  const [sectionName, setSectionName] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadQuestions() {
    setQuestions(await json(`${API}/questionnaire/branch/questions`));
  }

  async function loadSections() {
    setSections(await json(`${API}/questionnaire/sections`));
  }

  useEffect(() => {
    (async () => {
      try {
        const [c, s, a, cap, q] = await Promise.all([
          json(`${API}/categories`),
          json(`${API}/questionnaire/sections`),
          json(`${API}/questionnaire/audiences`),
          json(`${API}/questionnaire/capabilities`),
          json(`${API}/questionnaire/branch/questions`),
        ]);

        setCategories(c);
        setSections(s);
        setAudiences(a);
        setCapabilities(cap);
        setQuestions(q);

        const defaults = a
          .filter((x: Audience) => ["CUSTOMER"].includes(x.code))
          .map((x: Audience) => x.id);
        setAudienceIds(defaults);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load questionnaire");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setBrandId("");
    setProductId("");
    setProducts([]);

    if (!categoryId) {
      setBrands([]);
      return;
    }

    json(`${API}/brands?categoryId=${categoryId}`)
      .then(setBrands)
      .catch((e) => setError(e.message));
  }, [categoryId]);

  useEffect(() => {
    setProductId("");
    if (!categoryId || !brandId) {
      setProducts([]);
      return;
    }

    json(`${API}/products?categoryId=${categoryId}&brandId=${brandId}`)
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, [brandId]);

  const visibleQuestions = useMemo(() => {
    const value = search.trim().toLowerCase();

    return questions.filter(
      (q) =>
        !value ||
        q.name.toLowerCase().includes(value) ||
        q.questionText.toLowerCase().includes(value) ||
        q.section?.name?.toLowerCase().includes(value),
    );
  }, [questions, search]);

  function reset() {
    setEditingId(null);
    setScope("CATEGORY");
    setCategoryId("");
    setBrandId("");
    setProductId("");
    setSectionId("");
    setName("");
    setQuestionText("");
    setAnswerType("YES_NO");
    setDisplayOrder(1);
    setIsRequired(true);
    setIsActive(true);
    setAudienceIds(
      audiences.filter((x) => x.code === "CUSTOMER").map((x) => x.id),
    );
    setAnswers([answer("Yes"), answer("No")]);
  }

  function changeType(type: typeof answerType) {
    setAnswerType(type);
    setAnswers(type === "YES_NO" ? [answer("Yes"), answer("No")] : [answer("")]);
  }

  function addAnswer() {
    if (answerType === "YES_NO") return;
    setAnswers((current) => [...current, answer("")]);
  }

  function removeAnswer(index: number) {
    if (answerType === "YES_NO") return;
    setAnswers((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  function updateAnswer(index: number, patch: Partial<AnswerForm>) {
    setAnswers((current) =>
      current.map((x, i) => (i === index ? { ...x, ...patch } : x)),
    );
  }

  function updateGroup(
    answerIndex: number,
    groupIndex: number,
    patch: Partial<GroupForm>,
  ) {
    setAnswers((current) =>
      current.map((a, ai) =>
        ai !== answerIndex
          ? a
          : {
              ...a,
              issueGroups: a.issueGroups.map((g, gi) =>
                gi === groupIndex ? { ...g, ...patch } : g,
              ),
            },
      ),
    );
  }

  function updateGroupedChild(
    answerIndex: number,
    groupIndex: number,
    childIndex: number,
    patch: Partial<ChildForm>,
  ) {
    const group = answers[answerIndex].issueGroups[groupIndex];
    updateGroup(answerIndex, groupIndex, {
      childOptions: group.childOptions.map((c, ci) =>
        ci === childIndex ? { ...c, ...patch } : c,
      ),
    });
  }

  function toggleGroupedCapability(
    answerIndex: number,
    groupIndex: number,
    childIndex: number,
    capabilityId: number,
  ) {
    const child =
      answers[answerIndex].issueGroups[groupIndex].childOptions[childIndex];

    updateGroupedChild(answerIndex, groupIndex, childIndex, {
      capabilityIds: child.capabilityIds.includes(capabilityId)
        ? child.capabilityIds.filter((x) => x !== capabilityId)
        : [...child.capabilityIds, capabilityId],
    });
  }

  function addGroup(answerIndex: number) {
    updateAnswer(answerIndex, {
      showChildOptions: true,
      childSelectionMode: "MULTI",
      issueGroups: [...answers[answerIndex].issueGroups, blankGroup()],
    });
  }

  function removeGroup(answerIndex: number, groupIndex: number) {
    updateAnswer(answerIndex, {
      issueGroups: answers[answerIndex].issueGroups.filter(
        (_, index) => index !== groupIndex,
      ),
    });
  }

  function addIssue(answerIndex: number, groupIndex: number) {
    const group = answers[answerIndex].issueGroups[groupIndex];
    updateGroup(answerIndex, groupIndex, {
      childOptions: [...group.childOptions, blankChild()],
    });
  }

  function removeIssue(
    answerIndex: number,
    groupIndex: number,
    childIndex: number,
  ) {
    const group = answers[answerIndex].issueGroups[groupIndex];
    updateGroup(answerIndex, groupIndex, {
      childOptions: group.childOptions.filter((_, index) => index !== childIndex),
    });
  }

  function mapApiOption(o: any): AnswerForm {
    const groups: GroupForm[] = (o.issueGroups || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      isActive: g.isActive !== false,
      childOptions: (g.childOptions || []).map((c: any) => ({
        id: c.id,
        label: c.label,
        issueCode: c.issueCode || "",
        deductionType: c.deductionType || "PERCENTAGE",
        deductionValue: Number(c.deductionValue ?? c.deductionPercent ?? 0),
        deductionTrigger: c.deductionTrigger || "SELECTED",
        applicabilityScope: c.applicabilityScope === "PRODUCT" ? "PRODUCT" : "GLOBAL",
        applicabilityTargetId: c.applicabilityTargetId == null ? null : Number(c.applicabilityTargetId),
        capabilityIds: (c.capabilities || []).map(
          (x: any) => x.capabilityId ?? x.capability?.id,
        ),
        isActive: c.isActive !== false,
      })),
    }));

    return {
      id: o.id,
      label: o.label,
      issueCode: o.issueCode || "",
      deductionType: o.deductionType || "PERCENTAGE",
      deductionValue: Number(o.deductionValue ?? o.deductionPercent ?? 0),
      deductionTrigger: o.deductionTrigger || "SELECTED",
      applicabilityScope: o.applicabilityScope === "PRODUCT" ? "PRODUCT" : "GLOBAL",
      applicabilityTargetId: o.applicabilityTargetId == null ? null : Number(o.applicabilityTargetId),
      capabilityIds: (o.capabilities || []).map(
        (x: any) => x.capabilityId ?? x.capability?.id,
      ),
      isActive: o.isActive !== false,
      showChildOptions: o.showChildOptions || groups.length > 0,
      childPrompt: o.childPrompt || "",
      requireChildSelection: o.requireChildSelection || false,
      minChildSelections: Number(o.minChildSelections || 0),
      maxChildSelections:
        o.maxChildSelections == null ? null : Number(o.maxChildSelections),
      childSelectionMode: o.childSelectionMode || "MULTI",
      childOptions: [],
      issueGroups: groups,
    };
  }

  async function edit(q: Question) {
    setEditingId(q.id);
    setScope(q.applyToAllProducts ? "CATEGORY" : "MODEL");
    setCategoryId(String(q.categoryId ?? q.category?.id ?? ""));
    setSectionId(String(q.section.id));
    setName(q.name);
    setQuestionText(q.questionText);
    setAnswerType(q.answerType);
    setDisplayOrder(q.displayOrder);
    setIsRequired(q.isRequired);
    setIsActive(q.isActive);
    setAudienceIds(q.audiences.map((x) => x.audienceId ?? x.audience.id));
    setAnswers(q.options.map(mapApiOption));

    const mapped = q.productMappings?.[0];
    if (mapped?.productId) {
      const p = await json(`${API}/products/${mapped.productId}`).catch(() => null);
      if (p) {
        setCategoryId(String(p.categoryId ?? p.category?.id ?? ""));
        setBrandId(String(p.brandId ?? p.brand?.id ?? ""));
        setTimeout(() => setProductId(String(mapped.productId)), 100);
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function payload() {
    return {
      code: key(`${name}_${Date.now()}`),
      name: name.trim(),
      questionText: questionText.trim(),
      answerType,
      sectionId: Number(sectionId),
      categoryId: Number(categoryId),
      displayOrder,
      isRequired,
      isActive,
      applyToAllProducts: scope === "CATEGORY",
      audienceIds,
      productIds: scope === "MODEL" ? [Number(productId)] : [],
      options: answers.map((a, ai) => ({
        id: a.id,
        label: a.label.trim(),
        value: key(a.label || `ANSWER_${ai + 1}`),
        issueCode: a.issueCode ? key(a.issueCode) : null,
        deductionType: a.deductionType,
        deductionValue: Number(a.deductionValue),
        deductionTrigger: a.deductionTrigger,
        applicabilityScope: a.applicabilityScope,
        applicabilityTargetId: a.applicabilityScope === "PRODUCT" ? Number(productId) : null,
        displayOrder: ai + 1,
        isActive: a.isActive,
        capabilityIds: a.capabilityIds,
        showChildOptions: a.showChildOptions || a.issueGroups.length > 0,
        childPrompt: a.childPrompt.trim() || null,
        requireChildSelection: a.requireChildSelection,
        minChildSelections: a.requireChildSelection
          ? Math.max(1, Number(a.minChildSelections || 1))
          : Number(a.minChildSelections || 0),
        maxChildSelections:
          a.maxChildSelections == null || a.maxChildSelections === 0
            ? null
            : Number(a.maxChildSelections),
        childSelectionMode: a.childSelectionMode,
        childOptions: [],
        issueGroups: a.issueGroups.map((g, gi) => ({
          id: g.id,
          name: g.name.trim(),
          displayOrder: gi + 1,
          isActive: g.isActive,
          childOptions: g.childOptions.map((c, ci) => ({
            id: c.id,
            label: c.label.trim(),
            value: key(`${g.name}_${c.label || `ISSUE_${ci + 1}`}`),
            issueCode: c.issueCode
              ? key(c.issueCode)
              : key(`${name}_${g.name}_${c.label}`),
            deductionType: c.deductionType,
            deductionValue: Number(c.deductionValue),
            deductionTrigger: c.deductionTrigger,
            applicabilityScope: c.applicabilityScope,
            applicabilityTargetId: c.applicabilityScope === "PRODUCT" ? Number(productId) : null,
            displayOrder: ci + 1,
            isActive: c.isActive,
            capabilityIds: c.capabilityIds,
          })),
        })),
      })),
    };
  }

  async function save() {
    setNotice("");
    setError("");

    try {
      if (!categoryId || !sectionId || !name.trim() || !questionText.trim()) {
        throw new Error("Category, section, name and question are required");
      }
      if (!audienceIds.length) throw new Error("Select at least one audience");
      if (scope === "MODEL" && !productId) throw new Error("Select model");
      const usesModelSpecificOption = answers.some((a) =>
        a.applicabilityScope === "PRODUCT" ||
        a.issueGroups.some((g) => g.childOptions.some((c) => c.applicabilityScope === "PRODUCT")),
      );
      if (usesModelSpecificOption && !productId) {
        throw new Error("Select Brand and Model because one answer/issue is model-specific");
      }
      if (answers.some((a) => !a.label.trim())) {
        throw new Error("All main answers need a label");
      }

      for (const a of answers) {
        if (a.issueGroups.length) {
          if (!a.childPrompt.trim()) {
            throw new Error(`Enter issue-screen title for ${a.label}`);
          }
          for (const g of a.issueGroups) {
            if (!g.name.trim()) throw new Error("Every issue group needs a heading");
            if (!g.childOptions.length) {
              throw new Error(`${g.name} needs at least one issue`);
            }
            if (g.childOptions.some((c) => !c.label.trim())) {
              throw new Error(`Check issue names inside ${g.name}`);
            }
          }
        }
      }

      setSaving(true);
      const body = payload();

      if (editingId) {
        await json(`${API}/questionnaire/branch/questions/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await json(`${API}/questionnaire/branch/questions`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      setNotice(editingId ? "Question updated." : "Question created.");
      await loadQuestions();
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(q: Question) {
    try {
      await json(`${API}/questionnaire/branch/questions/${q.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !q.isActive }),
      });
      await loadQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to change status");
    }
  }

  async function removeQuestion(q: Question) {
    if (!window.confirm(`Delete "${q.questionText}"?`)) return;

    try {
      await json(`${API}/questionnaire/branch/questions/${q.id}`, {
        method: "DELETE",
      });
      await loadQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete");
    }
  }

  async function addSection() {
    setError("");
    if (!sectionName.trim()) return;

    try {
      await json(`${API}/questionnaire/branch/sections`, {
        method: "POST",
        body: JSON.stringify({
          name: sectionName.trim(),
          displayOrder: sections.length + 1,
          calculationMode: "SUM",
          isActive: true,
        }),
      });
      setSectionName("");
      await loadSections();
      setNotice("Section created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create section");
    }
  }

  function toggleAudience(id: number) {
    setAudienceIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading questionnaire...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">
            Celltro Admin
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Questionnaire Builder</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Configure questions, grouped issue headings and deductions without
                customer-frontend code changes.
              </p>
            </div>
            <a
              href="/admin/questionnaire"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900"
            >
              Questionnaire Overview →
            </a>
          </div>
        </header>

        {notice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Questionnaire Sections</h2>
              <p className="mt-1 text-sm text-slate-500">
                Example: Screen Condition, Other Problems, Purchase Location.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                className="rounded-xl border px-4 py-2.5 text-sm"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="New section name"
              />
              <button
                type="button"
                onClick={addSection}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
              >
                + Add Section
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[...sections]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((section) => (
                <span
                  key={section.id}
                  className="rounded-full border bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {section.name}
                </span>
              ))}
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                {editingId ? "Update Question" : "Create Question"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                For “Any Other Problem?” add grouped issues under the YES answer.
              </p>
            </div>
            {editingId && (
              <button
                onClick={reset}
                className="rounded-xl border px-4 py-2 text-sm font-bold"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <select
              className="rounded-xl border px-4 py-3"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select Category</option>
              {categories.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>

            <select
              className="rounded-xl border px-4 py-3"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              <option value="">Select Questionnaire Section</option>
              {[...sections]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
            </select>

            <div className="grid grid-cols-2 gap-3 lg:col-span-2">
              <button
                type="button"
                onClick={() => setScope("CATEGORY")}
                className={`rounded-2xl border p-4 text-left ${
                  scope === "CATEGORY" ? "border-slate-950 bg-slate-950 text-white" : ""
                }`}
              >
                <b>All Category Models</b>
                <span className="mt-1 block text-xs opacity-70">
                  Common question; avoids duplicates.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope("MODEL")}
                className={`rounded-2xl border p-4 text-left ${
                  scope === "MODEL" ? "border-slate-950 bg-slate-950 text-white" : ""
                }`}
              >
                <b>Specific Model</b>
                <span className="mt-1 block text-xs opacity-70">
                  Use only when wording/behavior differs.
                </span>
              </button>
            </div>

            <div className="lg:col-span-2 rounded-2xl border bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-950">Model selector</p>
              <p className="mt-1 text-xs text-amber-800">
                {scope === "MODEL"
                  ? "Required because this entire question is model-specific."
                  : "Optional. Select a model only when an individual answer/issue should be available for that model."}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <select
                  className="rounded-xl border bg-white px-4 py-3"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  disabled={!categoryId}
                >
                  <option value="">Select Brand</option>
                  {brands.map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>

                <select
                  className="rounded-xl border bg-white px-4 py-3"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={!brandId}
                >
                  <option value="">Select Model</option>
                  {products.map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <input
              className="rounded-xl border px-4 py-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Internal name: Other Problems"
            />

            <input
              className="rounded-xl border px-4 py-3"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Customer question: Any other problem?"
            />

            <div className="grid grid-cols-3 gap-2 lg:col-span-2">
              {([
                ["YES_NO", "Yes / No"],
                ["SINGLE_SELECT", "Single Choice"],
                ["MULTI_SELECT", "Multi Choice"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changeType(value)}
                  className={`rounded-xl border p-3 text-sm font-bold ${
                    answerType === value ? "bg-slate-900 text-white" : ""
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {answers.map((a, ai) => (
              <div key={ai} className="rounded-3xl border bg-slate-50 p-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_150px_150px_190px_110px]">
                  <input
                    className="rounded-xl border bg-white px-4 py-3"
                    value={a.label}
                    disabled={answerType === "YES_NO"}
                    onChange={(e) => updateAnswer(ai, { label: e.target.value })}
                    placeholder="Answer"
                  />

                  <select
                    className="rounded-xl border bg-white px-3 py-3"
                    value={a.deductionType}
                    onChange={(e) =>
                      updateAnswer(ai, {
                        deductionType: e.target.value as DeductionType,
                      })
                    }
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed ₹</option>
                  </select>

                  <input
                    className="rounded-xl border bg-white px-4 py-3"
                    type="number"
                    min="0"
                    value={a.deductionValue}
                    onChange={(e) =>
                      updateAnswer(ai, { deductionValue: Number(e.target.value) })
                    }
                    placeholder="Deduction"
                  />

                  <select
                    className="rounded-xl border bg-white px-3 py-3"
                    value={a.applicabilityScope}
                    onChange={(e) =>
                      updateAnswer(ai, {
                        applicabilityScope: e.target.value as ApplicabilityScope,
                        applicabilityTargetId:
                          e.target.value === "PRODUCT" && productId ? Number(productId) : null,
                      })
                    }
                  >
                    <option value="GLOBAL">All applicable models</option>
                    <option value="PRODUCT">Only selected model</option>
                  </select>

                  {answerType !== "YES_NO" ? (
                    <button
                      type="button"
                      onClick={() => removeAnswer(ai)}
                      disabled={answers.length <= 1}
                      className="rounded-xl border border-red-200 bg-white px-3 py-3 text-sm font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={a.showChildOptions}
                      onChange={(e) =>
                        updateAnswer(ai, { showChildOptions: e.target.checked })
                      }
                    />
                    Open detailed issues
                  </label>

                  {a.showChildOptions && (
                    <>
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={a.requireChildSelection}
                          onChange={(e) =>
                            updateAnswer(ai, {
                              requireChildSelection: e.target.checked,
                              minChildSelections: e.target.checked ? 1 : 0,
                            })
                          }
                        />
                        Require issue selection
                      </label>

                      <input
                        className="rounded-xl border bg-white px-3 py-2 text-sm"
                        value={a.childPrompt}
                        onChange={(e) =>
                          updateAnswer(ai, { childPrompt: e.target.value })
                        }
                        placeholder="Issue screen title: Select Issues"
                      />

                      <button
                        type="button"
                        onClick={() => addGroup(ai)}
                        className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white"
                      >
                        + Add Issue Group
                      </button>
                    </>
                  )}
                </div>

                {a.showChildOptions && (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                      <b>Deduction behavior:</b> use <b>Deduct if selected</b> for faults such as Cracked Screen.
                      Use <b>Deduct if NOT selected</b> for available-item lists such as Original Bill, Box, Charger or S Pen.
                      A MISSING deduction is evaluated only for options applicable to the selected model.
                    </div>
                    {a.issueGroups.map((group, gi) => (
                      <div key={gi} className="rounded-2xl border bg-white p-4">
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded-xl border px-4 py-2.5 font-semibold"
                            value={group.name}
                            onChange={(e) =>
                              updateGroup(ai, gi, { name: e.target.value })
                            }
                            placeholder="Heading: Physical Issues"
                          />

                          <button
                            type="button"
                            onClick={() => removeGroup(ai, gi)}
                            className="rounded-xl border border-red-200 px-3 text-sm font-bold text-red-600"
                          >
                            Delete Group
                          </button>
                        </div>

                        <div className="mt-4 space-y-3">
                          {group.childOptions.map((child, ci) => (
                            <div
                              key={ci}
                              className="rounded-2xl border bg-slate-50 p-4"
                            >
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_125px_120px_170px_190px_110px]">
                                <input
                                  className="rounded-xl border bg-white px-3 py-2.5"
                                  value={child.label}
                                  onChange={(e) =>
                                    updateGroupedChild(ai, gi, ci, {
                                      label: e.target.value,
                                    })
                                  }
                                  placeholder="Back Glass Broken"
                                />

                                <select
                                  className="rounded-xl border bg-white px-2"
                                  value={child.deductionType}
                                  onChange={(e) =>
                                    updateGroupedChild(ai, gi, ci, {
                                      deductionType:
                                        e.target.value as DeductionType,
                                    })
                                  }
                                >
                                  <option value="PERCENTAGE">%</option>
                                  <option value="FIXED">₹ Fixed</option>
                                </select>

                                <input
                                  className="rounded-xl border bg-white px-3"
                                  type="number"
                                  min="0"
                                  value={child.deductionValue}
                                  onChange={(e) =>
                                    updateGroupedChild(ai, gi, ci, {
                                      deductionValue: Number(e.target.value),
                                    })
                                  }
                                  placeholder="Value"
                                />

                                <select
                                  className="rounded-xl border bg-white px-2 py-2.5"
                                  value={child.deductionTrigger}
                                  onChange={(e) =>
                                    updateGroupedChild(ai, gi, ci, {
                                      deductionTrigger: e.target.value as DeductionTrigger,
                                    })
                                  }
                                >
                                  <option value="SELECTED">Deduct if selected</option>
                                  <option value="MISSING">Deduct if NOT selected</option>
                                </select>

                                <select
                                  className="rounded-xl border bg-white px-2 py-2.5"
                                  value={child.applicabilityScope}
                                  onChange={(e) =>
                                    updateGroupedChild(ai, gi, ci, {
                                      applicabilityScope: e.target.value as ApplicabilityScope,
                                      applicabilityTargetId:
                                        e.target.value === "PRODUCT" && productId ? Number(productId) : null,
                                    })
                                  }
                                >
                                  <option value="GLOBAL">All applicable models</option>
                                  <option value="PRODUCT">Only selected model</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => removeIssue(ai, gi, ci)}
                                  className="rounded-xl border border-red-200 text-sm font-bold text-red-600"
                                >
                                  Remove
                                </button>
                              </div>

                              {!!capabilities.length && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {capabilities.map((cap) => (
                                    <label
                                      key={cap.id}
                                      className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs ${
                                        child.capabilityIds.includes(cap.id)
                                          ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                                          : "bg-white"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={child.capabilityIds.includes(cap.id)}
                                        onChange={() =>
                                          toggleGroupedCapability(ai, gi, ci, cap.id)
                                        }
                                      />
                                      {cap.name}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addIssue(ai, gi)}
                          className="mt-3 rounded-xl border px-3 py-2 text-sm font-bold"
                        >
                          + Add Issue
                        </button>
                      </div>
                    ))}

                    {!a.issueGroups.length && (
                      <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-slate-500">
                        Add headings such as Physical Issues and Technical Issues.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {answerType !== "YES_NO" && (
              <div className="rounded-2xl border border-dashed bg-white p-4">
                <button
                  type="button"
                  onClick={addAnswer}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
                >
                  + Add Answer Option
                </button>
                <p className="mt-2 text-xs text-slate-500">
                  Single Choice can have many answer options but the customer selects one.
                  Multi Choice can have many answer options and the customer can select multiple.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {audiences
              .filter((x) => x.isActive !== false)
              .map((audience) => (
                <label
                  key={audience.id}
                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-bold ${
                    audienceIds.includes(audience.id)
                      ? "bg-slate-900 text-white"
                      : "bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={audienceIds.includes(audience.id)}
                    onChange={() => toggleAudience(audience.id)}
                  />
                  {audience.name}
                </label>
              ))}
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
              Required
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>

            <input
              className="rounded-xl border bg-white px-3 py-2"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              placeholder="Display order"
            />
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="mt-6 rounded-xl bg-slate-950 px-6 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Question"
                : "Create Question"}
          </button>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Configured Questions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Question, issue groups and deductions are visible together.
              </p>
            </div>

            <input
              className="rounded-xl border px-4 py-2.5 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search question or section"
            />
          </div>

          <div className="mt-5 space-y-4">
            {visibleQuestions.map((q) => (
              <article key={q.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">
                        {q.section.name}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          q.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {q.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <h3 className="mt-3 font-bold text-slate-900">{q.questionText}</h3>
                    <p className="mt-1 text-xs text-slate-500">{q.name}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => edit(q)}
                      className="rounded-xl border px-3 py-2 text-xs font-bold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStatus(q)}
                      className="rounded-xl border px-3 py-2 text-xs font-bold"
                    >
                      {q.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q)}
                      className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {q.options.map((o: any) => (
                    <div key={o.id} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <b>{o.label}</b>
                        <span className="text-sm font-bold text-slate-700">
                          {deductionText(o)}
                        </span>
                      </div>

                      {(o.issueGroups || []).map((g: any) => (
                        <div key={g.id} className="mt-4">
                          <h4 className="text-sm font-bold text-slate-800">
                            {g.name}
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(g.childOptions || []).map((child: any) => (
                              <span
                                key={child.id}
                                className="rounded-lg border bg-white px-3 py-2 text-xs"
                              >
                                {child.label} · <b>{deductionText(child)}</b>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </article>
            ))}

            {!visibleQuestions.length && (
              <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">
                No configured questions found.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
