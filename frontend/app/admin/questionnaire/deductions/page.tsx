"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(Array.isArray(d?.message) ? d.message.join(", ") : d?.message || `Request failed (${r.status})`);
  return d;
}

type IdName={id:number;name:string};
type FlatOption={
  id:number;
  label:string;
  path:string;
  deductionType:"PERCENTAGE"|"FIXED";
  deductionValue:number;
};
type Question={
  id:number;
  name:string;
  questionText:string;
  categoryId?:number|null;
  applyToAllProducts:boolean;
  section:{name:string;displayOrder:number};
  productMappings:Array<{productId:number}>;
  options:any[];
};
type Rule={
  id:number;
  optionId:number;
  scope:string;
  productId?:number|null;
  deductionType:"PERCENTAGE"|"FIXED";
  deductionValue:number|string;
  isActive:boolean;
};

export default function DeductionPage(){
  const[categories,setCategories]=useState<IdName[]>([]);
  const[brands,setBrands]=useState<IdName[]>([]);
  const[products,setProducts]=useState<IdName[]>([]);
  const[questions,setQuestions]=useState<Question[]>([]);
  const[rules,setRules]=useState<Rule[]>([]);
  const[categoryId,setCategoryId]=useState("");
  const[brandId,setBrandId]=useState("");
  const[productId,setProductId]=useState("");
  const[editing,setEditing]=useState<number|null>(null);
  const[type,setType]=useState<"PERCENTAGE"|"FIXED">("PERCENTAGE");
  const[value,setValue]=useState(0);
  const[search,setSearch]=useState("");
  const[message,setMessage]=useState("");
  const[error,setError]=useState("");

  useEffect(()=>{Promise.all([json(`${API}/categories`),json(`${API}/questionnaire/branch/questions`)]).then(([c,q])=>{setCategories(c);setQuestions(q)}).catch(e=>setError(e.message))},[]);
  useEffect(()=>{setBrandId("");setProductId("");setRules([]);if(!categoryId)return setBrands([]);json(`${API}/brands?categoryId=${categoryId}`).then(setBrands).catch(e=>setError(e.message))},[categoryId]);
  useEffect(()=>{setProductId("");setRules([]);if(!brandId)return setProducts([]);json(`${API}/products?categoryId=${categoryId}&brandId=${brandId}`).then(setProducts).catch(e=>setError(e.message))},[brandId]);

  const applicable=useMemo(()=>questions.filter(q=>{
    if(!productId||!categoryId)return false;
    const cat=!q.categoryId||q.categoryId===Number(categoryId);
    const product=q.applyToAllProducts||q.productMappings.some(m=>m.productId===Number(productId));
    const s=search.toLowerCase().trim();
    const matches=!s||q.name.toLowerCase().includes(s)||q.questionText.toLowerCase().includes(s)||q.options.some(o=>o.label.toLowerCase().includes(s)||(o.childOptions||[]).some((c:any)=>c.label.toLowerCase().includes(s)));
    return cat&&product&&matches;
  }).sort((a,b)=>a.section.displayOrder-b.section.displayOrder),[questions,categoryId,productId,search]);

  const flatten=(q:Question):FlatOption[]=>{
    const result:FlatOption[]=[];
    q.options.forEach(o=>{
      result.push({id:o.id,label:o.label,path:o.label,deductionType:o.deductionType||"PERCENTAGE",deductionValue:Number(o.deductionValue??o.deductionPercent??0)});
      (o.childOptions||[]).forEach((c:any)=>result.push({id:c.id,label:c.label,path:`${o.label} → ${c.label}`,deductionType:c.deductionType||"PERCENTAGE",deductionValue:Number(c.deductionValue??c.deductionPercent??0)}));
    });
    return result;
  };

  useEffect(()=>{
    if(!productId)return setRules([]);
    const ids=applicable.flatMap(q=>flatten(q).map(o=>o.id));
    Promise.all(ids.map(id=>json(`${API}/questionnaire/deduction-rules?optionId=${id}`))).then(x=>setRules(x.flat())).catch(e=>setError(e.message));
  },[productId,questions]);

  const override=(id:number)=>rules.find(r=>r.optionId===id&&r.scope==="PRODUCT"&&r.productId===Number(productId)&&r.isActive);
  const fmt=(t:string,v:number)=>t==="FIXED"?`₹${v}`:`${v}%`;

  async function save(o:FlatOption){
    try{
      setError("");setMessage("");
      if(value<0||(type==="PERCENTAGE"&&value>100))throw new Error("Invalid deduction value");
      await json(`${API}/questionnaire/deduction-rules/scoped`,{method:"POST",body:JSON.stringify({optionId:o.id,scope:"PRODUCT",targetId:Number(productId),deductionType:type,deductionValue:Number(value),priority:100})});
      const d=await json(`${API}/questionnaire/deduction-rules?optionId=${o.id}`);
      setRules(c=>[...c.filter(r=>r.optionId!==o.id),...d]);
      setEditing(null);setMessage("Model-specific deduction saved. Other models are unchanged.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to save")}
  }

  return <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-slate-950 p-6 text-white">
        <h1 className="text-3xl font-bold">Model Deduction Manager</h1>
        <p className="mt-2 text-sm text-slate-300">Category → Brand → Model. Global questions and sub-options appear automatically. Override only what differs.</p>
        <a href="/admin/questionnaire/questions" className="mt-4 inline-block rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900">← Questionnaire Builder</a>
      </header>

      {message&&<div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}
      {error&&<div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="input" value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Category</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select className="input" value={brandId} onChange={e=>setBrandId(e.target.value)} disabled={!categoryId}><option value="">Brand</option>{brands.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select className="input" value={productId} onChange={e=>setProductId(e.target.value)} disabled={!brandId}><option value="">Model</option>{products.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
        </div>
      </section>

      {productId&&<section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">Applicable Questions & Sub-options</h2><p className="text-sm text-slate-500">Default remains global/category level. Override is saved only for this model.</p></div>
          <input className="input max-w-xs" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search issue..." />
        </div>

        <div className="mt-5 space-y-5">
          {applicable.map(q=><article key={q.id} className="overflow-hidden rounded-2xl border">
            <div className="border-b bg-slate-50 px-4 py-3"><div className="text-xs font-bold uppercase text-indigo-600">{q.section.name}</div><div className="font-bold">{q.questionText}</div></div>
            <div className="divide-y">
              {flatten(q).map(o=>{
                const r=override(o.id), active=editing===o.id;
                return <div key={o.id} className="grid gap-3 p-4 lg:grid-cols-[1.5fr_.7fr_.9fr_auto] lg:items-center">
                  <div><div className="font-semibold">{o.path}</div><div className="text-xs text-slate-500">Default: <b>{fmt(o.deductionType,o.deductionValue)}</b></div></div>
                  <div><div className="text-xs uppercase text-slate-400">This model</div><div className="font-bold">{r?fmt(r.deductionType,Number(r.deductionValue)):"Uses default"}</div></div>
                  {active?<div className="flex gap-2"><select className="input" value={type} onChange={e=>setType(e.target.value as any)}><option value="PERCENTAGE">%</option><option value="FIXED">₹</option></select><input className="input" type="number" min={0} value={value} onChange={e=>setValue(Number(e.target.value))}/></div>:<div className="text-xs text-slate-500">{r?"Model override active":"No override"}</div>}
                  <div>{active?<div className="flex gap-2"><button onClick={()=>save(o)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Save</button><button onClick={()=>setEditing(null)} className="rounded-xl border px-4 py-2 text-sm font-bold">Cancel</button></div>:<button onClick={()=>{const r=override(o.id);setEditing(o.id);setType(r?.deductionType||o.deductionType);setValue(Number(r?.deductionValue??o.deductionValue))}} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">{r?"Update":"Set Override"}</button>}</div>
                </div>
              })}
            </div>
          </article>)}
        </div>
      </section>}
    </div>
    <style jsx global>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:.75rem;padding:.75rem .875rem;background:white;outline:none}.input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgb(99 102 241 / .12)}.input:disabled{background:#f1f5f9;color:#94a3b8}`}</style>
  </div>
}
