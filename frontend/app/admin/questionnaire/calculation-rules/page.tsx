"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./CalculationRules.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type IdName = { id: number; name: string };
type Mode = "MAX" | "SUM" | "SINGLE";
type CapType = "PERCENTAGE" | "FIXED" | "";
type Level = "SECTION";
type Scope = "GLOBAL" | "PRODUCT";

type Section = {
  id: number;
  name: string;
  calculationMode?: Mode;
  displayOrder?: number;
};

type Question = {
  id: number;
  questionText: string;
  name: string;
  categoryId?: number | null;
  applyToAllProducts: boolean;
  productMappings: Array<{ productId: number }>;
  section: Section;
};

type Policy = {
  id: number;
  key: string;
  level: Level;
  targetId: number;
  scope: Scope;
  productId?: number | null;
  calculationMode: Mode;
  capType?: "PERCENTAGE" | "FIXED" | null;
  capValue?: number | string | null;
  isActive: boolean;
};

type Draft = {
  calculationMode: Mode;
  capType: CapType;
  capValue: number;
};

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
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

function policyKey(level: Level, targetId: number, scope: Scope) {
  return `${level}:${targetId}:${scope}`;
}

function defaultDraft(mode: Mode): Draft {
  return { calculationMode: mode, capType: "", capValue: 0 };
}

function draftFromPolicy(policy: Policy | undefined, fallbackMode: Mode): Draft {
  if (!policy) return defaultDraft(fallbackMode);
  return {
    calculationMode: policy.calculationMode || fallbackMode,
    capType: (policy.capType || "") as CapType,
    capValue: Number(policy.capValue ?? 0),
  };
}

function RuleEditor({
  level,
  targetId,
  title,
  subtitle,
  fallbackMode,
  productId,
  policies,
  onChanged,
}: {
  level: Level;
  targetId: number;
  title: string;
  subtitle: string;
  fallbackMode: Mode;
  productId: number | null;
  policies: Policy[];
  onChanged: () => Promise<void>;
}) {
  const globalPolicy = policies.find(
    (p) => p.level === level && p.targetId === targetId && p.scope === "GLOBAL",
  );
  const modelPolicy = productId
    ? policies.find(
        (p) =>
          p.level === level &&
          p.targetId === targetId &&
          p.scope === "PRODUCT" &&
          Number(p.productId) === productId,
      )
    : undefined;

  const [globalDraft, setGlobalDraft] = useState<Draft>(() =>
    draftFromPolicy(globalPolicy, fallbackMode),
  );
  const [modelDraft, setModelDraft] = useState<Draft>(() =>
    draftFromPolicy(modelPolicy, globalPolicy?.calculationMode || fallbackMode),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setGlobalDraft(draftFromPolicy(globalPolicy, fallbackMode));
    setModelDraft(
      draftFromPolicy(modelPolicy, globalPolicy?.calculationMode || fallbackMode),
    );
  }, [globalPolicy?.id, modelPolicy?.id, fallbackMode, productId]);

  async function save(scope: Scope) {
    const draft = scope === "GLOBAL" ? globalDraft : modelDraft;
    setBusy(true);
    setError("");
    try {
      await json(`${API}/questionnaire/aggregation-policy`, {
        method: "PUT",
        body: JSON.stringify({
          level,
          targetId,
          scope,
          productId: scope === "PRODUCT" ? productId : null,
          calculationMode: draft.calculationMode,
          capType: draft.capType || null,
          capValue: draft.capType ? Number(draft.capValue) : null,
          isActive: true,
        }),
      });
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save calculation rule");
    } finally {
      setBusy(false);
    }
  }

  async function removeModelOverride() {
    if (!productId) return;
    setBusy(true);
    setError("");
    try {
      await json(
        `${API}/questionnaire/aggregation-policy?level=${level}&targetId=${targetId}&productId=${productId}`,
        { method: "DELETE" },
      );
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove model override");
    } finally {
      setBusy(false);
    }
  }

  function editor(
    scope: Scope,
    draft: Draft,
    setDraft: (value: Draft) => void,
  ) {
    return (
      <div className={`rounded-2xl border p-4 ${scope === "PRODUCT" ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200"}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-bold text-slate-900">
              {scope === "GLOBAL" ? "Global rule" : "Selected model override"}
            </div>
            <div className="text-xs text-slate-500">
              {scope === "GLOBAL"
                ? "Used by every applicable model unless a model override exists."
                : modelPolicy
                  ? "This model currently overrides the global rule."
                  : "Save to create an override only for this model."}
            </div>
          </div>
          {scope === "PRODUCT" && modelPolicy && (
            <button className={styles.secondary} disabled={busy} onClick={removeModelOverride}>
              Use Global
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className={styles.label}>
            Calculation
            <select
              className={`${styles.input} mt-1`}
              value={draft.calculationMode}
              onChange={(e) => setDraft({ ...draft, calculationMode: e.target.value as Mode })}
            >
              <option value="SUM">SUM — add deductions</option>
              <option value="MAX">MAX — highest deduction only</option>
              <option value="SINGLE">SINGLE — one effective deduction</option>
            </select>
          </label>

          <label className={styles.label}>
            Maximum deduction cap
            <select
              className={`${styles.input} mt-1`}
              value={draft.capType}
              onChange={(e) => setDraft({ ...draft, capType: e.target.value as CapType })}
            >
              <option value="">No cap</option>
              <option value="PERCENTAGE">Percentage of base price</option>
              <option value="FIXED">Fixed ₹ amount</option>
            </select>
          </label>

          <label className={styles.label}>
            Cap value
            <input
              className={`${styles.input} mt-1`}
              type="number"
              min={0}
              max={draft.capType === "PERCENTAGE" ? 100 : undefined}
              disabled={!draft.capType}
              value={draft.capValue}
              onChange={(e) => setDraft({ ...draft, capValue: Number(e.target.value) })}
              placeholder={draft.capType === "FIXED" ? "5000" : "25"}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {draft.calculationMode === "SUM"
              ? "Selected/missing deductions are added first, then the cap is applied."
              : "Only the highest applicable deduction is used before the cap."}
          </p>
          <button className={styles.primary} disabled={busy} onClick={() => save(scope)}>
            {busy ? "Saving..." : scope === "GLOBAL" ? "Save Global Rule" : "Save Model Override"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">{level}</div>
        <h3 className="mt-1 text-lg font-bold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className={`grid gap-4 ${productId ? "xl:grid-cols-2" : ""}`}>
        {editor("GLOBAL", globalDraft, setGlobalDraft)}
        {productId && editor("PRODUCT", modelDraft, setModelDraft)}
      </div>
      {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
    </article>
  );
}

export default function CalculationRulesPage() {
  const [categories, setCategories] = useState<IdName[]>([]);
  const [brands, setBrands] = useState<IdName[]>([]);
  const [products, setProducts] = useState<IdName[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function loadPolicies(selectedProductId?: string) {
    const suffix = selectedProductId ? `?productId=${selectedProductId}` : "";
    const data = await json(`${API}/questionnaire/aggregation-policy${suffix}`);
    setPolicies(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    Promise.all([
      json(`${API}/categories`),
      json(`${API}/questionnaire/branch/questions`),
      loadPolicies(),
    ])
      .then(([categoryData, questionData]) => {
        setCategories(categoryData);
        setQuestions(questionData);
      })
      .catch((e) => setError(e.message));
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
  }, [categoryId, brandId]);

  useEffect(() => {
    loadPolicies(productId || undefined).catch((e) => setError(e.message));
  }, [productId]);

  const applicableQuestions = useMemo(() => {
    const selectedCategory = Number(categoryId || 0);
    const selectedProduct = Number(productId || 0);
    const term = search.trim().toLowerCase();

    return questions
      .filter((q) => !selectedCategory || q.categoryId == null || Number(q.categoryId) === selectedCategory)
      .filter((q) => {
        if (!selectedProduct) return true;
        return q.applyToAllProducts || q.productMappings?.some((m) => Number(m.productId) === selectedProduct);
      })
      .filter((q) => {
        if (!term) return true;
        return `${q.section?.name || ""} ${q.questionText || ""} ${q.name || ""}`
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) =>
        Number(a.section?.displayOrder || 0) - Number(b.section?.displayOrder || 0) || a.id - b.id,
      );
  }, [questions, categoryId, productId, search]);

  const sections = useMemo(() => {
    const map = new Map<number, Section>();
    for (const q of applicableQuestions) {
      if (q.section?.id) map.set(q.section.id, q.section);
    }
    return [...map.values()].sort(
      (a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0) || a.id - b.id,
    );
  }, [applicableQuestions]);

  const selectedProductId = productId ? Number(productId) : null;
  const refresh = () => loadPolicies(productId || undefined);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-slate-950 p-5 text-white sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">CELLTRO Pricing Engine</div>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Deduction Calculation Control</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                Control MAX/SUM/SINGLE and an optional maximum deduction cap per section. Global section rules can be overridden for one model without duplicating questions or deductions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/questionnaire/model-overrides" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold">Model Overrides</a>
              <a href="/admin/questionnaire/questions" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950">Questionnaire Builder</a>
            </div>
          </div>
        </header>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <select className={styles.input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className={styles.input} value={brandId} disabled={!categoryId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">Select Brand</option>
              {brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className={styles.input} value={productId} disabled={!brandId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Global / All Models</option>
              {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input className={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search section..." />
          </div>
          <div className="mt-3 rounded-2xl bg-indigo-50 p-3 text-sm text-indigo-900">
            Example: Screen section has Cracked 10% + Faulty 10% + Damaged 10%. Set <b>Section = SUM</b> and <b>Cap = 25%</b>. One issue = 10%, two = 20%, all three = 25% maximum.
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Section Rules</h2>
            <p className="mt-1 text-sm text-slate-500">The cap is applied only at section level. Individual issues keep their own deduction value; Screen, Body, Functional, Accessories, or any custom section can have its own ceiling.</p>
          </div>
          {sections.map((section) => (
            <RuleEditor
              key={`SECTION:${section.id}:${selectedProductId || 0}:${policies.map((p) => p.id).join("-")}`}
              level="SECTION"
              targetId={section.id}
              title={section.name}
              subtitle={`Current section default: ${section.calculationMode || "SUM"}`}
              fallbackMode={(section.calculationMode || "SUM") as Mode}
              productId={selectedProductId}
              policies={policies}
              onChanged={refresh}
            />
          ))}
        </section>

      </div>
    </div>
  );
}
