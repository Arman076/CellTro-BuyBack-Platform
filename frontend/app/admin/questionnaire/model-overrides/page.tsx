"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./DeductionPage.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

type IdName = { id: number; name: string };
type DeductionType = "PERCENTAGE" | "FIXED";
type DeductionTrigger = "SELECTED" | "MISSING";
type Severity = "NORMAL" | "SEVERE";
type ApplicabilityScope =
  | "GLOBAL"
  | "CATEGORY"
  | "BRAND"
  | "SERIES"
  | "PRODUCT"
  | "VARIANT";

type Rule = {
  id: number;
  optionId: number;
  scope: string;
  productId?: number | null;
  deductionType: DeductionType;
  deductionValue: number | string;
  isActive: boolean;
};

type FlatOption = {
  id: number;
  label: string;
  path: string;
  issueCode?: string | null;
  deductionType: DeductionType;
  deductionValue: number;
  deductionTrigger: DeductionTrigger;
  applicabilityScope: ApplicabilityScope;
  applicabilityTargetId?: number | null;
  severity: Severity;
  agentRejectAllowed: boolean;
};

type Question = {
  id: number;
  name: string;
  questionText: string;
  categoryId?: number | null;
  applyToAllProducts: boolean;
  section: {
    name: string;
    displayOrder: number;
    calculationMode?: "MAX" | "SUM" | "SINGLE";
  };
  productMappings: Array<{ productId: number }>;
  options: any[];
};

type PolicyDraft = {
  applicabilityScope: "GLOBAL" | "PRODUCT";
  deductionTrigger: DeductionTrigger;
  severity: Severity;
  agentRejectAllowed: boolean;
  issueCode: string;
};

type OverrideDraft = {
  deductionType: DeductionType;
  deductionValue: number;
};

type QuotePolicyState = {
  normalMinQuoteType: DeductionType;
  normalMinQuoteValue: number;
  severeMinQuoteType: DeductionType;
  severeMinQuoteValue: number;
  enabled?: boolean;
};

function asFlat(option: any, path: string): FlatOption {
  return {
    id: Number(option.id),
    label: option.label,
    path,
    issueCode: option.issueCode || null,
    deductionType: option.deductionType || "PERCENTAGE",
    deductionValue: Number(option.deductionValue ?? option.deductionPercent ?? 0),
    deductionTrigger: option.deductionTrigger || "SELECTED",
    applicabilityScope: option.applicabilityScope || "GLOBAL",
    applicabilityTargetId: option.applicabilityTargetId ?? null,
    severity: option.severity || "NORMAL",
    agentRejectAllowed: Boolean(option.agentRejectAllowed),
  };
}

function flattenQuestion(question: Question): FlatOption[] {
  const result: FlatOption[] = [];
  const seen = new Set<number>();

  const push = (option: any, path: string) => {
    const id = Number(option.id);
    if (seen.has(id)) return;
    seen.add(id);
    result.push(asFlat(option, path));
  };

  for (const option of question.options || []) {
    push(option, option.label);

    for (const group of option.issueGroups || []) {
      for (const child of group.childOptions || []) {
        push(child, `${option.label} → ${group.name} → ${child.label}`);
      }
    }

    for (const child of option.childOptions || []) {
      push(child, `${option.label} → ${child.label}`);
    }
  }

  return result;
}

export default function DeductionPage() {
  const [categories, setCategories] = useState<IdName[]>([]);
  const [brands, setBrands] = useState<IdName[]>([]);
  const [products, setProducts] = useState<IdName[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [search, setSearch] = useState("");

  const [editingPolicy, setEditingPolicy] = useState<number | null>(null);
  const [editingOverride, setEditingOverride] = useState<number | null>(null);
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft | null>(null);
  const [overrideDraft, setOverrideDraft] = useState<OverrideDraft | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [globalPolicy, setGlobalPolicy] = useState<QuotePolicyState>({
    normalMinQuoteType: "PERCENTAGE",
    normalMinQuoteValue: 10,
    severeMinQuoteType: "PERCENTAGE",
    severeMinQuoteValue: 2,
  });
  const [modelPolicy, setModelPolicy] = useState<QuotePolicyState>({
    normalMinQuoteType: "PERCENTAGE",
    normalMinQuoteValue: 10,
    severeMinQuoteType: "PERCENTAGE",
    severeMinQuoteValue: 2,
    enabled: false,
  });

  useEffect(() => {
    Promise.all([
      json(`${API}/categories`),
      json(`${API}/questionnaire/branch/questions`),
      json(`${API}/questionnaire/quote-policy`),
    ])
      .then(([categoryData, questionData, policyData]) => {
        setCategories(categoryData);
        setQuestions(questionData);
        const g = policyData?.global || policyData?.effective;
        if (g) {
          setGlobalPolicy({
            normalMinQuoteType: (g.normalMinQuoteType || "PERCENTAGE") as DeductionType,
            normalMinQuoteValue: Number(g.normalMinQuoteValue ?? g.normalMinQuotePercent ?? 10),
            severeMinQuoteType: (g.severeMinQuoteType || "PERCENTAGE") as DeductionType,
            severeMinQuoteValue: Number(g.severeMinQuoteValue ?? g.severeMinQuotePercent ?? 2),
          });
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setBrandId("");
    setProductId("");
    setRules([]);
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
    setRules([]);
    if (!brandId || !categoryId) {
      setProducts([]);
      return;
    }
    json(`${API}/products?categoryId=${categoryId}&brandId=${brandId}`)
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, [brandId, categoryId]);

  useEffect(() => {
    if (!productId) {
      setModelPolicy({
        ...globalPolicy,
        enabled: false,
      });
      return;
    }
    json(`${API}/questionnaire/quote-policy?productId=${productId}`)
      .then((data) => {
        const p = data?.product;
        const effective = data?.effective;
        const source = p || effective || {};
        setModelPolicy({
          normalMinQuoteType: (source.normalMinQuoteType || globalPolicy.normalMinQuoteType) as DeductionType,
          normalMinQuoteValue: Number(source.normalMinQuoteValue ?? source.normalMinQuotePercent ?? globalPolicy.normalMinQuoteValue),
          severeMinQuoteType: (source.severeMinQuoteType || globalPolicy.severeMinQuoteType) as DeductionType,
          severeMinQuoteValue: Number(source.severeMinQuoteValue ?? source.severeMinQuotePercent ?? globalPolicy.severeMinQuoteValue),
          enabled: Boolean(p?.isActive),
        });
      })
      .catch((e) => setError(e.message));
  }, [productId]);

  async function saveGlobalPolicy() {
    try {
      setSaving(true); setError(""); setMessage("");
      await json(`${API}/questionnaire/quote-policy`, {
        method: "PUT",
        body: JSON.stringify({
          scope: "GLOBAL",
          normalMinQuoteType: globalPolicy.normalMinQuoteType,
          normalMinQuoteValue: Number(globalPolicy.normalMinQuoteValue),
          severeMinQuoteType: globalPolicy.severeMinQuoteType,
          severeMinQuoteValue: Number(globalPolicy.severeMinQuoteValue),
          isActive: true,
        }),
      });
      setMessage("Global final quote policy saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save global quote policy"); }
    finally { setSaving(false); }
  }

  async function saveModelPolicy() {
    if (!productId) return;
    try {
      setSaving(true); setError(""); setMessage("");
      await json(`${API}/questionnaire/quote-policy`, {
        method: "PUT",
        body: JSON.stringify({
          scope: "PRODUCT",
          productId: Number(productId),
          normalMinQuoteType: modelPolicy.normalMinQuoteType,
          normalMinQuoteValue: Number(modelPolicy.normalMinQuoteValue),
          severeMinQuoteType: modelPolicy.severeMinQuoteType,
          severeMinQuoteValue: Number(modelPolicy.severeMinQuoteValue),
          isActive: modelPolicy.enabled,
        }),
      });
      setMessage(modelPolicy.enabled ? "Model-specific final quote policy saved." : "Model override disabled; global policy will be used.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save model quote policy"); }
    finally { setSaving(false); }
  }

  const applicable = useMemo(() => {
    if (!productId || !categoryId) return [];
    const selectedProduct = Number(productId);
    const selectedCategory = Number(categoryId);
    const term = search.trim().toLowerCase();

    return questions
      .filter((question) => {
        const categoryOk = !question.categoryId || question.categoryId === selectedCategory;
        const productOk =
          question.applyToAllProducts ||
          question.productMappings?.some((mapping) => mapping.productId === selectedProduct);

        if (!categoryOk || !productOk) return false;
        if (!term) return true;

        return (
          question.name.toLowerCase().includes(term) ||
          question.questionText.toLowerCase().includes(term) ||
          flattenQuestion(question).some((option) =>
            `${option.path} ${option.issueCode || ""}`.toLowerCase().includes(term),
          )
        );
      })
      .sort((a, b) => a.section.displayOrder - b.section.displayOrder);
  }, [questions, categoryId, productId, search]);

  const allOptionIds = useMemo(
    () => applicable.flatMap((question) => flattenQuestion(question).map((o) => o.id)),
    [applicable],
  );

  useEffect(() => {
    if (!productId || !allOptionIds.length) {
      setRules([]);
      return;
    }

    let cancelled = false;
    Promise.all(
      allOptionIds.map((id) =>
        json(`${API}/questionnaire/deduction-rules?optionId=${id}`),
      ),
    )
      .then((chunks) => {
        if (!cancelled) setRules(chunks.flat());
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, allOptionIds.join(",")]);

  function currentOverride(optionId: number) {
    return rules.find(
      (rule) =>
        rule.optionId === optionId &&
        rule.scope === "PRODUCT" &&
        rule.productId === Number(productId) &&
        rule.isActive,
    );
  }

  function formatDeduction(type: DeductionType, value: number) {
    return type === "FIXED" ? `₹${value.toLocaleString("en-IN")}` : `${value}%`;
  }

  function beginPolicy(option: FlatOption) {
    setEditingPolicy(option.id);
    setEditingOverride(null);
    setPolicyDraft({
      applicabilityScope:
        option.applicabilityScope === "PRODUCT" &&
        option.applicabilityTargetId === Number(productId)
          ? "PRODUCT"
          : "GLOBAL",
      deductionTrigger: option.deductionTrigger,
      severity: option.severity,
      agentRejectAllowed: option.agentRejectAllowed,
      issueCode: option.issueCode || "",
    });
  }

  async function savePolicy(option: FlatOption) {
    if (!policyDraft || !productId) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");

      await json(`${API}/questionnaire/branch/options/${option.id}/policy`, {
        method: "PATCH",
        body: JSON.stringify({
          applicabilityScope: policyDraft.applicabilityScope,
          applicabilityTargetId:
            policyDraft.applicabilityScope === "PRODUCT"
              ? Number(productId)
              : null,
          deductionTrigger: policyDraft.deductionTrigger,
          severity: policyDraft.severity,
          agentRejectAllowed: policyDraft.agentRejectAllowed,
          issueCode: policyDraft.issueCode.trim() || null,
        }),
      });

      const refreshed = await json(`${API}/questionnaire/branch/questions`);
      setQuestions(refreshed);
      setEditingPolicy(null);
      setPolicyDraft(null);
      setMessage(
        policyDraft.applicabilityScope === "PRODUCT"
          ? "Option is now visible only for this model."
          : "Option policy saved for all applicable models.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save option policy");
    } finally {
      setSaving(false);
    }
  }

  function beginOverride(option: FlatOption) {
    const override = currentOverride(option.id);
    setEditingOverride(option.id);
    setEditingPolicy(null);
    setOverrideDraft({
      deductionType: override?.deductionType || option.deductionType,
      deductionValue: Number(override?.deductionValue ?? option.deductionValue),
    });
  }

  async function saveOverride(option: FlatOption) {
    if (!overrideDraft || !productId) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (overrideDraft.deductionValue < 0) {
        throw new Error("Deduction cannot be negative");
      }
      if (
        overrideDraft.deductionType === "PERCENTAGE" &&
        overrideDraft.deductionValue > 100
      ) {
        throw new Error("Percentage deduction cannot exceed 100%");
      }

      await json(`${API}/questionnaire/deduction-rules/scoped`, {
        method: "POST",
        body: JSON.stringify({
          optionId: option.id,
          scope: "PRODUCT",
          targetId: Number(productId),
          deductionType: overrideDraft.deductionType,
          deductionValue: Number(overrideDraft.deductionValue),
          priority: 100,
        }),
      });

      const refreshedRules = await json(
        `${API}/questionnaire/deduction-rules?optionId=${option.id}`,
      );
      setRules((current) => [
        ...current.filter((rule) => rule.optionId !== option.id),
        ...refreshedRules,
      ]);
      setEditingOverride(null);
      setOverrideDraft(null);
      setMessage("Price deduction override saved only for this model.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save override");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-slate-950 p-5 text-white sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
                CELLTRO Pricing Rules
              </div>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                Option Rules & Model Price Override
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Keep one common question. Make only an option model-specific, choose
                Selected/Missing deduction, mark severe issues, allow agent rejection,
                and override deduction for one model without duplicating questions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/admin/questionnaire"
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold"
              >
                Overview
              </a>
              <a
                href="/admin/questionnaire/calculation-rules"
                className="rounded-xl border border-indigo-400 px-4 py-2.5 text-sm font-bold text-indigo-100"
              >
                Calculation Rules
              </a>
              <a
                href="/admin/questionnaire/questions"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950"
              >
                Questionnaire Builder
              </a>
            </div>
          </div>
        </header>

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <select className={styles.input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select Category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <select className={styles.input} value={brandId} onChange={(e) => setBrandId(e.target.value)} disabled={!categoryId}>
              <option value="">Select Brand</option>
              {brands.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <select className={styles.input} value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!brandId}>
              <option value="">Select Model</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-950">Final Quote Control</h2>
            <p className="mt-1 text-sm text-slate-500">Admin decides the minimum value shown even when deductions are very high. Percentage floors are calculated from the original variant base price. Fixed floors are absolute rupee minimums.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="font-bold text-slate-900">Global policy</div>
              <div className="mt-3 grid gap-4">
                <div className="grid gap-2 sm:grid-cols-[1fr_150px_1fr] sm:items-end">
                  <label className={styles.fieldLabel}>Normal minimum quote type
                    <select className={`${styles.input} mt-1`} value={globalPolicy.normalMinQuoteType} onChange={(e) => setGlobalPolicy({ ...globalPolicy, normalMinQuoteType: e.target.value as DeductionType })}>
                      <option value="PERCENTAGE">Percentage of base price</option>
                      <option value="FIXED">Fixed minimum ₹</option>
                    </select>
                  </label>
                  <label className={styles.fieldLabel}>Value
                    <input className={`${styles.input} mt-1`} type="number" min={0} max={globalPolicy.normalMinQuoteType === "PERCENTAGE" ? 100 : undefined} value={globalPolicy.normalMinQuoteValue} onChange={(e) => setGlobalPolicy({ ...globalPolicy, normalMinQuoteValue: Number(e.target.value) })} />
                  </label>
                  <p className="text-xs text-slate-500">{globalPolicy.normalMinQuoteType === "PERCENTAGE" ? "Example 10 = customer gets at least 10% of base price." : "Example 5000 = final quote cannot go below ₹5,000."}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_150px_1fr] sm:items-end">
                  <label className={styles.fieldLabel}>Severe minimum quote type
                    <select className={`${styles.input} mt-1`} value={globalPolicy.severeMinQuoteType} onChange={(e) => setGlobalPolicy({ ...globalPolicy, severeMinQuoteType: e.target.value as DeductionType })}>
                      <option value="PERCENTAGE">Percentage of base price</option>
                      <option value="FIXED">Fixed minimum ₹</option>
                    </select>
                  </label>
                  <label className={styles.fieldLabel}>Value
                    <input className={`${styles.input} mt-1`} type="number" min={0} max={globalPolicy.severeMinQuoteType === "PERCENTAGE" ? 100 : undefined} value={globalPolicy.severeMinQuoteValue} onChange={(e) => setGlobalPolicy({ ...globalPolicy, severeMinQuoteValue: Number(e.target.value) })} />
                  </label>
                  <p className="text-xs text-slate-500">Applied when at least one selected issue is marked Severe.</p>
                </div>
              </div>
              <button disabled={saving} onClick={saveGlobalPolicy} className={`${styles.btnPrimary} mt-3`}>Save Global Policy</button>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
              <div className="font-bold text-slate-900">Selected model override</div>
              {!productId ? (
                <p className="mt-2 text-sm text-slate-500">Select a model above to configure a model-specific minimum final quote.</p>
              ) : (
                <>
                  <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={modelPolicy.enabled} onChange={(e) => setModelPolicy({ ...modelPolicy, enabled: e.target.checked })} /> Use model-specific final quote policy
                  </label>
                  <div className="mt-3 grid gap-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className={styles.fieldLabel}>Normal minimum type
                        <select className={`${styles.input} mt-1`} value={modelPolicy.normalMinQuoteType} onChange={(e) => setModelPolicy({ ...modelPolicy, normalMinQuoteType: e.target.value as DeductionType })}>
                          <option value="PERCENTAGE">Percentage</option>
                          <option value="FIXED">Fixed ₹</option>
                        </select>
                      </label>
                      <label className={styles.fieldLabel}>Normal minimum value
                        <input className={`${styles.input} mt-1`} type="number" min={0} max={modelPolicy.normalMinQuoteType === "PERCENTAGE" ? 100 : undefined} value={modelPolicy.normalMinQuoteValue} onChange={(e) => setModelPolicy({ ...modelPolicy, normalMinQuoteValue: Number(e.target.value) })} />
                      </label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className={styles.fieldLabel}>Severe minimum type
                        <select className={`${styles.input} mt-1`} value={modelPolicy.severeMinQuoteType} onChange={(e) => setModelPolicy({ ...modelPolicy, severeMinQuoteType: e.target.value as DeductionType })}>
                          <option value="PERCENTAGE">Percentage</option>
                          <option value="FIXED">Fixed ₹</option>
                        </select>
                      </label>
                      <label className={styles.fieldLabel}>Severe minimum value
                        <input className={`${styles.input} mt-1`} type="number" min={0} max={modelPolicy.severeMinQuoteType === "PERCENTAGE" ? 100 : undefined} value={modelPolicy.severeMinQuoteValue} onChange={(e) => setModelPolicy({ ...modelPolicy, severeMinQuoteValue: Number(e.target.value) })} />
                      </label>
                    </div>
                  </div>
                  <button disabled={saving} onClick={saveModelPolicy} className={`${styles.btnPrimary} mt-3`}>Save Model Policy</button>
                </>
              )}
            </div>
          </div>
        </section>

        {productId && (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Applicable Questions & Options</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Final quote floor is admin-controlled globally or per model.
                  Same issueCode is deducted only once.
                </p>
              </div>
              <input
                className={`${styles.input} md:max-w-sm`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search question, option or issue code..."
              />
            </div>

            <div className="mt-5 space-y-5">
              {applicable.map((question) => (
                <article key={question.id} className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
                      <span>{question.section.name}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-slate-500">
                        {question.section.calculationMode || "SUM"}
                      </span>
                    </div>
                    <div className="mt-1 font-bold text-slate-900">{question.questionText}</div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {flattenQuestion(question).map((option) => {
                      const override = currentOverride(option.id);
                      const policyOpen = editingPolicy === option.id;
                      const overrideOpen = editingOverride === option.id;
                      const modelSpecific =
                        option.applicabilityScope === "PRODUCT" &&
                        option.applicabilityTargetId === Number(productId);

                      return (
                        <div key={option.id} className="p-4">
                          <div className="grid gap-4 xl:grid-cols-[1.5fr_.8fr_.8fr_auto] xl:items-center">
                            <div>
                              <div className="font-semibold text-slate-900">{option.path}</div>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                <span>Default: <b>{formatDeduction(option.deductionType, option.deductionValue)}</b></span>
                                <span>•</span>
                                <span>Trigger: <b>{option.deductionTrigger}</b></span>
                                <span>•</span>
                                <span>Severity: <b>{option.severity}</b></span>
                              </div>
                              {option.issueCode && (
                                <div className="mt-1 text-xs font-mono text-slate-400">issueCode: {option.issueCode}</div>
                              )}
                            </div>

                            <div>
                              <div className="text-xs font-bold uppercase text-slate-400">Visibility</div>
                              <div className="mt-1 font-semibold text-slate-800">
                                {modelSpecific ? "This model only" : option.applicabilityScope === "GLOBAL" ? "All applicable models" : option.applicabilityScope}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-bold uppercase text-slate-400">This model price</div>
                              <div className="mt-1 font-semibold text-slate-800">
                                {override
                                  ? formatDeduction(override.deductionType, Number(override.deductionValue))
                                  : "Uses default"}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 xl:justify-end">
                              <button onClick={() => beginPolicy(option)} className={styles.btnSecondary}>Option Rule</button>
                              <button onClick={() => beginOverride(option)} className={styles.btnPrimary}>
                                {override ? "Edit Override" : "Price Override"}
                              </button>
                            </div>
                          </div>

                          {policyOpen && policyDraft && (
                            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                <label className={styles.fieldLabel}>
                                  Visibility
                                  <select className={`${styles.input} mt-1`} value={policyDraft.applicabilityScope} onChange={(e) => setPolicyDraft({ ...policyDraft, applicabilityScope: e.target.value as "GLOBAL" | "PRODUCT" })}>
                                    <option value="GLOBAL">All applicable models</option>
                                    <option value="PRODUCT">Only selected model</option>
                                  </select>
                                </label>
                                <label className={styles.fieldLabel}>
                                  Deduct when
                                  <select className={`${styles.input} mt-1`} value={policyDraft.deductionTrigger} onChange={(e) => setPolicyDraft({ ...policyDraft, deductionTrigger: e.target.value as DeductionTrigger })}>
                                    <option value="SELECTED">Selected</option>
                                    <option value="MISSING">Not selected / Missing</option>
                                  </select>
                                </label>
                                <label className={styles.fieldLabel}>
                                  Severity
                                  <select className={`${styles.input} mt-1`} value={policyDraft.severity} onChange={(e) => setPolicyDraft({ ...policyDraft, severity: e.target.value as Severity })}>
                                    <option value="NORMAL">Normal</option>
                                    <option value="SEVERE">Severe</option>
                                  </select>
                                </label>
                                <label className={styles.fieldLabel}>
                                  issueCode
                                  <input className={`${styles.input} mt-1`} value={policyDraft.issueCode} onChange={(e) => setPolicyDraft({ ...policyDraft, issueCode: e.target.value })} placeholder="SCREEN_CRACKED" />
                                </label>
                                <label className="flex min-h-[46px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 xl:mt-6">
                                  <input type="checkbox" checked={policyDraft.agentRejectAllowed} onChange={(e) => setPolicyDraft({ ...policyDraft, agentRejectAllowed: e.target.checked })} />
                                  Agent can reject
                                </label>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button disabled={saving} onClick={() => savePolicy(option)} className={styles.btnPrimary}>{saving ? "Saving..." : "Save Option Rule"}</button>
                                <button onClick={() => { setEditingPolicy(null); setPolicyDraft(null); }} className={styles.btnSecondary}>Cancel</button>
                              </div>
                            </div>
                          )}

                          {overrideOpen && overrideDraft && (
                            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                              <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
                                <label className={styles.fieldLabel}>
                                  Deduction type
                                  <select className={`${styles.input} mt-1`} value={overrideDraft.deductionType} onChange={(e) => setOverrideDraft({ ...overrideDraft, deductionType: e.target.value as DeductionType })}>
                                    <option value="PERCENTAGE">Percentage (%)</option>
                                    <option value="FIXED">Fixed amount (₹)</option>
                                  </select>
                                </label>
                                <label className={styles.fieldLabel}>
                                  This model deduction
                                  <input className={`${styles.input} mt-1`} type="number" min={0} max={overrideDraft.deductionType === "PERCENTAGE" ? 100 : undefined} value={overrideDraft.deductionValue} onChange={(e) => setOverrideDraft({ ...overrideDraft, deductionValue: Number(e.target.value) })} />
                                </label>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                Only this model gets this deduction. The same question and option remain shared.
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button disabled={saving} onClick={() => saveOverride(option)} className={styles.btnPrimary}>{saving ? "Saving..." : "Save Model Override"}</button>
                                <button onClick={() => { setEditingOverride(null); setOverrideDraft(null); }} className={styles.btnSecondary}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}

              {!applicable.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No applicable questionnaire options found for this model.
                </div>
              )}
            </div>
          </section>
        )}
      </div>


    </div>
  );
}
