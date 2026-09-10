"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type IdName = { id: number; name: string };
type Section = IdName & { code: string; displayOrder: number };
type Audience = IdName & { code: string };
type Capability = IdName & { code: string };
type DeductionType = "PERCENTAGE" | "FIXED";
type DeductionTrigger = "SELECTED" | "MISSING";
type SelectionMode = "SINGLE" | "MULTI";

type ChildForm = {
  id?: number;
  label: string;
  issueCode: string;
  deductionType: DeductionType;
  deductionValue: number;
  deductionTrigger: DeductionTrigger;
  capabilityIds: number[];
  isActive: boolean;
};

type AnswerForm = ChildForm & {
  showChildOptions: boolean;
  childPrompt: string;
  requireChildSelection: boolean;
  minChildSelections: number;
  maxChildSelections: number | null;
  childSelectionMode: SelectionMode;
  childOptions: ChildForm[];
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
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(Array.isArray(d?.message) ? d.message.join(", ") : d?.message || `Request failed (${r.status})`);
  }
  return d;
}

function key(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const blankChild = (): ChildForm => ({
  label: "",
  issueCode: "",
  deductionType: "PERCENTAGE",
  deductionValue: 0,
  deductionTrigger: "SELECTED",
  capabilityIds: [],
  isActive: true,
});

const answer = (label: string): AnswerForm => ({
  ...blankChild(),
  label,
  issueCode: "",
  showChildOptions: false,
  childPrompt: "",
  requireChildSelection: false,
  minChildSelections: 0,
  maxChildSelections: null,
  childSelectionMode: "MULTI",
  childOptions: [],
});

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
  const [answerType, setAnswerType] = useState<"YES_NO" | "SINGLE_SELECT" | "MULTI_SELECT">("YES_NO");
  const [audienceIds, setAudienceIds] = useState<number[]>([]);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isRequired, setIsRequired] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [answers, setAnswers] = useState<AnswerForm[]>([answer("Yes"), answer("No")]);

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadQuestions() {
    setQuestions(await json(`${API}/questionnaire/branch/questions`));
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
        setAudienceIds(a.filter((x: Audience) => ["CUSTOMER", "AGENT"].includes(x.code)).map((x: Audience) => x.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setBrandId("");
    setProductId("");
    setProducts([]);
    if (!categoryId) return setBrands([]);
    json(`${API}/brands?categoryId=${categoryId}`).then(setBrands).catch((e) => setError(e.message));
  }, [categoryId]);

  useEffect(() => {
    setProductId("");
    if (!categoryId || !brandId) return setProducts([]);
    json(`${API}/products?categoryId=${categoryId}&brandId=${brandId}`).then(setProducts).catch((e) => setError(e.message));
  }, [brandId]);

  const visibleQuestions = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) => !s || q.name.toLowerCase().includes(s) || q.questionText.toLowerCase().includes(s));
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
    setAudienceIds(audiences.filter((x) => ["CUSTOMER", "AGENT"].includes(x.code)).map((x) => x.id));
    setAnswers([answer("Yes"), answer("No")]);
  }

  function updateAnswer(index: number, patch: Partial<AnswerForm>) {
    setAnswers((current) => current.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  }

  function updateChild(answerIndex: number, childIndex: number, patch: Partial<ChildForm>) {
    setAnswers((current) =>
      current.map((a, ai) =>
        ai !== answerIndex
          ? a
          : {
              ...a,
              childOptions: a.childOptions.map((c, ci) => (ci === childIndex ? { ...c, ...patch } : c)),
            },
      ),
    );
  }

  function toggleCapability(answerIndex: number, childIndex: number, capabilityId: number) {
    const child = answers[answerIndex].childOptions[childIndex];
    const next = child.capabilityIds.includes(capabilityId)
      ? child.capabilityIds.filter((x) => x !== capabilityId)
      : [...child.capabilityIds, capabilityId];
    updateChild(answerIndex, childIndex, { capabilityIds: next });
  }

  function changeType(type: typeof answerType) {
    setAnswerType(type);
    if (type === "YES_NO") setAnswers([answer("Yes"), answer("No")]);
    else setAnswers([answer("")]);
  }

  function mapApiOption(o: any): AnswerForm {
    return {
      id: o.id,
      label: o.label,
      issueCode: o.issueCode || "",
      deductionType: o.deductionType || "PERCENTAGE",
      deductionValue: Number(o.deductionValue ?? o.deductionPercent ?? 0),
      deductionTrigger: o.deductionTrigger || "SELECTED",
      capabilityIds: (o.capabilities || []).map((x: any) => x.capabilityId ?? x.capability?.id),
      isActive: o.isActive,
      showChildOptions: o.showChildOptions || false,
      childPrompt: o.childPrompt || "",
      requireChildSelection: o.requireChildSelection || false,
      minChildSelections: Number(o.minChildSelections || 0),
      maxChildSelections: o.maxChildSelections == null ? null : Number(o.maxChildSelections),
      childSelectionMode: o.childSelectionMode || "MULTI",
      childOptions: (o.childOptions || []).map((c: any) => ({
        id: c.id,
        label: c.label,
        issueCode: c.issueCode || "",
        deductionType: c.deductionType || "PERCENTAGE",
        deductionValue: Number(c.deductionValue ?? c.deductionPercent ?? 0),
        deductionTrigger: c.deductionTrigger || "SELECTED",
        capabilityIds: (c.capabilities || []).map((x: any) => x.capabilityId ?? x.capability?.id),
        isActive: c.isActive,
      })),
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
        displayOrder: ai + 1,
        isActive: a.isActive,
        capabilityIds: a.capabilityIds,
        showChildOptions: a.showChildOptions,
        childPrompt: a.childPrompt.trim() || null,
        requireChildSelection: a.requireChildSelection,
        minChildSelections: a.requireChildSelection ? Math.max(1, Number(a.minChildSelections || 1)) : Number(a.minChildSelections || 0),
        maxChildSelections: a.maxChildSelections == null || a.maxChildSelections === 0 ? null : Number(a.maxChildSelections),
        childSelectionMode: a.childSelectionMode,
        childOptions: a.showChildOptions
          ? a.childOptions.map((c, ci) => ({
              id: c.id,
              label: c.label.trim(),
              value: key(`${a.label}_${c.label || `SUB_${ci + 1}`}`),
              issueCode: c.issueCode ? key(c.issueCode) : key(`${name}_${c.label}`),
              deductionType: c.deductionType,
              deductionValue: Number(c.deductionValue),
              deductionTrigger: c.deductionTrigger,
              displayOrder: ci + 1,
              isActive: c.isActive,
              capabilityIds: c.capabilityIds,
            }))
          : [],
      })),
    };
  }

  async function save() {
    setNotice("");
    setError("");
    try {
      if (!categoryId || !sectionId || !name.trim() || !questionText.trim()) throw new Error("Category, section, name and question are required");
      if (!audienceIds.length) throw new Error("Select Customer or Agent");
      if (scope === "MODEL" && !productId) throw new Error("Select model");
      if (answers.some((a) => !a.label.trim())) throw new Error("All main answers need a label");
      for (const a of answers) {
        if (a.showChildOptions && !a.childPrompt.trim()) throw new Error(`Enter sub-option heading for ${a.label}`);
        if (a.showChildOptions && !a.childOptions.length) throw new Error(`Add at least one sub-option under ${a.label}`);
        if (a.showChildOptions && a.childOptions.some((c) => !c.label.trim())) throw new Error(`Check sub-option names under ${a.label}`);
      }

      setSaving(true);
      const body = payload();
      const result = editingId
        ? await json(`${API}/questionnaire/branch/questions/${editingId}`, { method: "PUT", body: JSON.stringify(body) })
        : await json(`${API}/questionnaire/branch/questions`, { method: "POST", body: JSON.stringify(body) });

      setNotice(editingId ? "Question updated successfully." : "Question created successfully.");
      await loadQuestions();
      reset();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Loading questionnaire...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-300">Celltro Admin</p>
              <h1 className="mt-2 text-3xl font-bold">Questionnaire Builder</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Configure the main answer and separately decide whether YES, NO, or any answer should open sub-options.
              </p>
            </div>
            <a href="/admin/questionnaire/deduction" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900">
              Model-wise Deduction →
            </a>
          </div>
        </header>

        {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{editingId ? "Update Question" : "Create Question"}</h2>
              <p className="mt-1 text-sm text-slate-500">Common question = category level. Only make a model-specific question when the wording/behavior itself is different.</p>
            </div>
            {editingId && <button onClick={reset} className="rounded-xl border px-4 py-2 text-sm font-bold">Cancel Edit</button>}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select Category</option>
              {categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>

            <select className="input" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">Select Section</option>
              {[...sections].sort((a,b)=>a.displayOrder-b.displayOrder).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-3 lg:col-span-2">
              <button type="button" onClick={() => setScope("CATEGORY")} className={`cardChoice ${scope === "CATEGORY" ? "cardChoiceOn" : ""}`}>
                <b>All Category Models</b><span>Recommended for Screen, Body, Functions, Accessories, Age</span>
              </button>
              <button type="button" onClick={() => setScope("MODEL")} className={`cardChoice ${scope === "MODEL" ? "cardChoiceOn" : ""}`}>
                <b>Specific Model</b><span>Only when that model needs a different question</span>
              </button>
            </div>

            {scope === "MODEL" && <>
              <select className="input" value={brandId} onChange={(e) => setBrandId(e.target.value)} disabled={!categoryId}>
                <option value="">Select Brand</option>{brands.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!brandId}>
                <option value="">Select Model</option>{products.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </>}

            <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Internal name: Screen Condition" />
            <input className="input" value={questionText} onChange={(e)=>setQuestionText(e.target.value)} placeholder="Customer question: Is your screen okay?" />

            <div className="grid grid-cols-3 gap-2 lg:col-span-2">
              {([["YES_NO","Yes / No"],["SINGLE_SELECT","Single Choice"],["MULTI_SELECT","Multi Choice"]] as const).map(([v,l]) =>
                <button key={v} type="button" onClick={()=>changeType(v)} className={`rounded-xl border p-3 text-sm font-bold ${answerType===v?"bg-slate-900 text-white":""}`}>{l}</button>
              )}
            </div>

            <div className="flex flex-wrap gap-3 lg:col-span-2">
              {audiences.filter((x)=>["CUSTOMER","AGENT"].includes(x.code)).map((x) =>
                <label key={x.id} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${audienceIds.includes(x.id)?"border-indigo-500 bg-indigo-50":""}`}>
                  <input type="checkbox" checked={audienceIds.includes(x.id)} onChange={()=>setAudienceIds((c)=>c.includes(x.id)?c.filter((id)=>id!==x.id):[...c,x.id])} />
                  <span className="ml-2">{x.code==="CUSTOMER"?"Customer":"Agent"}</span>
                </label>
              )}
              <label className="rounded-xl border px-4 py-3 text-sm font-semibold"><input type="checkbox" checked={isRequired} onChange={(e)=>setIsRequired(e.target.checked)} /><span className="ml-2">Required</span></label>
              <label className="rounded-xl border px-4 py-3 text-sm font-semibold"><input type="checkbox" checked={isActive} onChange={(e)=>setIsActive(e.target.checked)} /><span className="ml-2">Active</span></label>
              <input className="input max-w-28" type="number" min={0} value={displayOrder} onChange={(e)=>setDisplayOrder(Number(e.target.value))} title="Display order" />
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Answer Branches</h3>
                <p className="text-sm text-slate-500">YES and NO are fully independent: direct deduction + optional sub-options.</p>
              </div>
              {answerType !== "YES_NO" && <button type="button" onClick={()=>setAnswers((c)=>[...c,answer("")])} className="rounded-xl border px-4 py-2 text-sm font-bold">+ Add Answer</button>}
            </div>

            <div className="mt-4 space-y-5">
              {answers.map((a, ai) => (
                <div key={a.id ?? ai} className="rounded-3xl border bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="min-w-28 rounded-xl bg-slate-900 px-4 py-3 text-center font-bold text-white">
                      {a.label || `Answer ${ai+1}`}
                    </div>
                    <input className="input" value={a.label} onChange={(e)=>updateAnswer(ai,{label:e.target.value})} placeholder="Answer label" disabled={answerType==="YES_NO"} />
                    <select className="input lg:max-w-44" value={a.deductionType} onChange={(e)=>updateAnswer(ai,{deductionType:e.target.value as DeductionType})}>
                      <option value="PERCENTAGE">Percentage %</option>
                      <option value="FIXED">Fixed ₹</option>
                    </select>
                    <input className="input lg:max-w-32" type="number" min={0} value={a.deductionValue} onChange={(e)=>updateAnswer(ai,{deductionValue:Number(e.target.value)})} />
                  </div>

                  <div className="mt-4 rounded-2xl border bg-white p-4">
                    <label className="flex items-center justify-between gap-3">
                      <span><b>Show additional options?</b><small className="mt-1 block text-slate-500">Example: NO → screen problems, YES → available accessories.</small></span>
                      <input type="checkbox" checked={a.showChildOptions} onChange={(e)=>updateAnswer(ai,{showChildOptions:e.target.checked})} className="h-5 w-5" />
                    </label>

                    {a.showChildOptions && (
                      <div className="mt-5 space-y-4">
                        <input className="input" value={a.childPrompt} onChange={(e)=>updateAnswer(ai,{childPrompt:e.target.value})} placeholder='Sub-question heading, e.g. "What is wrong with the screen?"' />

                        <div className="grid gap-3 md:grid-cols-4">
                          <select className="input" value={a.childSelectionMode} onChange={(e)=>updateAnswer(ai,{childSelectionMode:e.target.value as SelectionMode})}>
                            <option value="MULTI">Multiple selection</option>
                            <option value="SINGLE">Single selection</option>
                          </select>
                          <label className="rounded-xl border p-3 text-sm"><input type="checkbox" checked={a.requireChildSelection} onChange={(e)=>updateAnswer(ai,{requireChildSelection:e.target.checked,minChildSelections:e.target.checked?Math.max(1,a.minChildSelections):0})} /><span className="ml-2 font-semibold">Selection required</span></label>
                          <input className="input" type="number" min={0} value={a.minChildSelections} onChange={(e)=>updateAnswer(ai,{minChildSelections:Number(e.target.value)})} placeholder="Minimum" />
                          <input className="input" type="number" min={0} value={a.maxChildSelections ?? ""} onChange={(e)=>updateAnswer(ai,{maxChildSelections:e.target.value===""?null:Number(e.target.value)})} placeholder="Maximum (blank = no limit)" />
                        </div>

                        <div className="space-y-3">
                          {a.childOptions.map((c, ci) => (
                            <div key={c.id ?? ci} className="rounded-2xl border bg-slate-50 p-4">
                              <div className="grid gap-3 lg:grid-cols-[1.2fr_.65fr_.5fr_.85fr_auto]">
                                <input className="input" value={c.label} onChange={(e)=>updateChild(ai,ci,{label:e.target.value})} placeholder="Sub-option: Screen Cracked" />
                                <select className="input" value={c.deductionType} onChange={(e)=>updateChild(ai,ci,{deductionType:e.target.value as DeductionType})}><option value="PERCENTAGE">%</option><option value="FIXED">₹</option></select>
                                <input className="input" type="number" min={0} value={c.deductionValue} onChange={(e)=>updateChild(ai,ci,{deductionValue:Number(e.target.value)})} />
                                <select className="input" value={c.deductionTrigger} onChange={(e)=>updateChild(ai,ci,{deductionTrigger:e.target.value as DeductionTrigger})}>
                                  <option value="SELECTED">Deduct if selected</option>
                                  <option value="MISSING">Deduct if not selected</option>
                                </select>
                                <button type="button" onClick={()=>updateAnswer(ai,{childOptions:a.childOptions.filter((_,idx)=>idx!==ci)})} className="rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-600">Remove</button>
                              </div>

                              <details className="mt-3">
                                <summary className="cursor-pointer text-xs font-bold text-indigo-700">Feature filter (optional)</summary>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {capabilities.map((cap) => {
                                    const on = c.capabilityIds.includes(cap.id);
                                    return <button key={cap.id} type="button" onClick={()=>toggleCapability(ai,ci,cap.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on?"bg-indigo-600 text-white":""}`}>{cap.name}</button>
                                  })}
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>

                        <button type="button" onClick={()=>updateAnswer(ai,{childOptions:[...a.childOptions,blankChild()]})} className="rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700">
                          + Add Sub-option
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button disabled={saving} onClick={save} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update Question" : "Save Question"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold">Existing Questions</h2><p className="text-sm text-slate-500">Edit, update, or disable without deleting history.</p></div>
            <input className="input max-w-xs" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search..." />
          </div>

          <div className="mt-5 space-y-3">
            {visibleQuestions.map((q) => (
              <article key={q.id} className={`rounded-2xl border p-4 ${!q.isActive?"bg-slate-50 opacity-70":""}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="pill">{q.section.name}</span>
                      <span className="pill">{q.applyToAllProducts?"All Category Models":"Specific Model"}</span>
                      {q.audiences.map((x)=><span key={x.audience.id} className="pill">{x.audience.code}</span>)}
                    </div>
                    <h3 className="mt-2 font-bold">{q.name}</h3>
                    <p className="text-sm text-slate-600">{q.questionText}</p>
                    <p className="mt-1 text-xs text-slate-400">{q.options.length} main answer(s) configured</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>edit(q)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Edit</button>
                    <button onClick={async()=>{await json(`${API}/questionnaire/branch/questions/${q.id}/status`,{method:"PATCH",body:JSON.stringify({isActive:!q.isActive})});await loadQuestions();}} className="rounded-xl border px-4 py-2.5 text-sm font-bold">{q.isActive?"Disable":"Enable"}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .input{width:100%;border:1px solid #cbd5e1;border-radius:.75rem;padding:.75rem .875rem;background:white;color:#0f172a;outline:none}
        .input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgb(99 102 241 / .12)}
        .input:disabled{background:#f1f5f9;color:#94a3b8}
        .cardChoice{border:1px solid #cbd5e1;border-radius:1rem;padding:1rem;text-align:left;background:white}
        .cardChoice span{display:block;margin-top:.25rem;font-size:.75rem;color:#64748b}
        .cardChoiceOn{border-color:#6366f1;background:#eef2ff}
        .pill{border-radius:9999px;background:#f1f5f9;padding:.3rem .65rem;color:#475569}
      `}</style>
    </div>
  );
}
