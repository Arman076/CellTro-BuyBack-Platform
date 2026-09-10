"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Item = { id: number; name: string };
type Capability = Item & { code: string };

async function readJson(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message || "Request failed",
    );
  }

  return data;
}

export default function QuestionnaireCapabilitiesPage() {
  const [categories, setCategories] = useState<Item[]>([]);
  const [brands, setBrands] = useState<Item[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/categories`).then(readJson),
      fetch(`${API_BASE_URL}/questionnaire/capabilities`).then(readJson),
    ])
      .then(([categoryData, capabilityData]) => {
        setCategories(categoryData);
        setCapabilities(capabilityData);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setBrandId("");
    setProductId("");
    setBrands([]);
    setProducts([]);
    setSelectedIds([]);

    if (!categoryId) return;

    fetch(`${API_BASE_URL}/brands?categoryId=${categoryId}`)
      .then(readJson)
      .then(setBrands)
      .catch((e) => setError(e.message));
  }, [categoryId]);

  useEffect(() => {
    setProductId("");
    setProducts([]);
    setSelectedIds([]);

    if (!categoryId || !brandId) return;

    fetch(
      `${API_BASE_URL}/products?categoryId=${categoryId}&brandId=${brandId}`,
    )
      .then(readJson)
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, [categoryId, brandId]);

  useEffect(() => {
    setSelectedIds([]);

    if (!productId) return;

    fetch(
      `${API_BASE_URL}/questionnaire/capabilities/products/${productId}`,
    )
      .then(readJson)
      .then((rows) =>
        setSelectedIds(rows.map((row: any) => row.capabilityId)),
      )
      .catch((e) => setError(e.message));
  }, [productId]);

  function toggle(id: number) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function save() {
    if (!productId) {
      setError("Select a model first");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await fetch(
        `${API_BASE_URL}/questionnaire/capabilities/products/${productId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ capabilityIds: selectedIds }),
        },
      ).then(readJson);

      setMessage("Model capabilities saved successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Device Capabilities
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Assign model features once. Questionnaire options such as S Pen,
            Face ID or Fingerprint can then appear automatically.
          </p>
        </div>

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-xl border px-3 py-3"
            >
              <option value="">Select category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              disabled={!categoryId}
              className="rounded-xl border px-3 py-3 disabled:bg-slate-100"
            >
              <option value="">Select brand</option>
              {brands.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={!brandId}
              className="rounded-xl border px-3 py-3 disabled:bg-slate-100"
            >
              <option value="">Select model</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Available Capabilities</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => {
              const active = selectedIds.includes(capability.id);

              return (
                <button
                  key={capability.id}
                  type="button"
                  disabled={!productId}
                  onClick={() => toggle(capability.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-indigo-600 bg-indigo-50"
                      : "bg-white"
                  } disabled:opacity-50`}
                >
                  <div className="font-semibold">{capability.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {capability.code}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!productId || saving}
            onClick={save}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Capabilities"}
          </button>
        </div>
      </div>
    </div>
  );
}
