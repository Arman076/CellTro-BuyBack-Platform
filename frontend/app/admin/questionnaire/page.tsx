"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      Array.isArray(d?.message)
        ? d.message.join(", ")
        : d?.message || `Request failed (${r.status})`,
    );
  }
  return d;
}

function deductionText(o: any) {
  const value = Number(o.deductionValue ?? o.deductionPercent ?? 0);
  return o.deductionType === "FIXED" ? `₹${value}` : `${value}%`;
}

export default function QuestionnaireOverviewPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<any | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [q, s] = await Promise.all([
        json(`${API}/questionnaire/branch/questions`),
        json(`${API}/questionnaire/sections`),
      ]);
      setQuestions(q);
      setSections(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter(
      (q) =>
        !s ||
        q.questionText.toLowerCase().includes(s) ||
        q.name.toLowerCase().includes(s) ||
        q.section?.name?.toLowerCase().includes(s),
    );
  }, [questions, search]);

  const optionCount = questions.reduce(
    (sum, q) =>
      sum +
      (q.options || []).reduce(
        (inner: number, o: any) =>
          inner +
          1 +
          (o.issueGroups || []).reduce(
            (gSum: number, g: any) => gSum + (g.childOptions || []).length,
            0,
          ),
        0,
      ),
    0,
  );

  async function toggleStatus(q: any) {
    try {
      await json(`${API}/questionnaire/branch/questions/${q.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !q.isActive }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update");
    }
  }

  async function remove(q: any) {
    if (!window.confirm(`Delete "${q.questionText}"?`)) return;
    try {
      await json(`${API}/questionnaire/branch/questions/${q.id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete");
    }
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
              <h1 className="text-3xl font-bold">Questionnaire Management</h1>
              <p className="mt-2 text-sm text-slate-300">
                View questions, grouped issues and deductions from one page.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/admin/questionnaire/questions"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900"
              >
                + Manage Questions
              </a>
              <a
                href="/admin/questionnaire/deduction"
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold"
              >
                Model Overrides
              </a>
              <a
                href="/admin/questionnaire/capabilities"
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold"
              >
                Capabilities
              </a>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5">
            <span className="text-sm text-slate-500">Sections</span>
            <strong className="mt-2 block text-3xl">{sections.length}</strong>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <span className="text-sm text-slate-500">Questions</span>
            <strong className="mt-2 block text-3xl">{questions.length}</strong>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <span className="text-sm text-slate-500">Answers / Issues</span>
            <strong className="mt-2 block text-3xl">{optionCount}</strong>
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold">All Configured Questions</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 md:w-72"
              placeholder="Search question or section"
            />
          </div>

          <div className="mt-5 space-y-4">
            {filtered.map((q) => (
              <article key={q.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">
                        {q.section?.name}
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
                    <h3 className="mt-3 font-bold">{q.questionText}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {q.applyToAllProducts ? "Category level" : "Model specific"}
                    </p>
                  </div>

                  <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4 lg:min-w-[390px]">
                    <button
                      type="button"
                      onClick={() => setView(q)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      View
                    </button>

                    <a
                      href={`/admin/questionnaire/questions?edit=${q.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    >
                      Edit
                    </a>

                    <button
                      type="button"
                      onClick={() => toggleStatus(q)}
                      className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 ${
                        q.isActive
                          ? "border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:bg-orange-100 focus:ring-orange-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 focus:ring-emerald-200"
                      }`}
                    >
                      {q.isActive ? "Disable" : "Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => remove(q)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {(q.options || []).map((o: any) => (
                    <div key={o.id} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex justify-between gap-3">
                        <b>{o.label}</b>
                        <b>{deductionText(o)}</b>
                      </div>

                      {(o.issueGroups || []).map((g: any) => (
                        <div key={g.id} className="mt-4">
                          <p className="text-sm font-bold text-slate-800">{g.name}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(g.childOptions || []).map((c: any) => (
                              <span
                                key={c.id}
                                className="rounded-lg border bg-white px-3 py-2 text-xs"
                              >
                                {c.label} · <b>{deductionText(c)}</b>
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
          </div>
        </section>
      </div>

      {view && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setView(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-700">
                  {view.section?.name}
                </span>
                <h2 className="mt-2 text-2xl font-bold">{view.questionText}</h2>
              </div>
              <button
                type="button"
                onClick={() => setView(null)}
                className="rounded-full border px-3 py-1.5 font-bold"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {(view.options || []).map((o: any) => (
                <div key={o.id} className="rounded-2xl border p-4">
                  <div className="flex justify-between">
                    <b>{o.label}</b>
                    <b>{deductionText(o)}</b>
                  </div>
                  {(o.issueGroups || []).map((g: any) => (
                    <div key={g.id} className="mt-4 rounded-xl bg-slate-50 p-4">
                      <b className="text-sm">{g.name}</b>
                      <div className="mt-2 space-y-2">
                        {(g.childOptions || []).map((c: any) => (
                          <div
                            key={c.id}
                            className="flex justify-between rounded-lg bg-white px-3 py-2 text-sm"
                          >
                            <span>{c.label}</span>
                            <b>{deductionText(c)}</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
