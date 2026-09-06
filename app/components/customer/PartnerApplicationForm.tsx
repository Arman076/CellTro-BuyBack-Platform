"use client";

import {
  FormEvent,
  ReactNode,
  useState,
} from "react";

import {
  Building2,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

type FormData = {
  fullName: string;
  businessName: string;
  mobile: string;
  email: string;
  partnerType: string;
  city: string;
  pincode: string;
  gstNumber: string;
  businessAddress: string;
  message: string;
};

const initialForm: FormData = {
  fullName: "",
  businessName: "",
  mobile: "",
  email: "",
  partnerType: "BUYBACK_VENDOR",
  city: "",
  pincode: "",
  gstNumber: "",
  businessAddress: "",
  message: "",
};

const inputClass =
  "block w-full min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-gray-900 focus:ring-4 focus:ring-gray-100";

export default function PartnerApplicationForm() {
  const [form, setForm] =
    useState<FormData>(initialForm);

  const [submitting, setSubmitting] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  function update(
    field: keyof FormData,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/partner-leads`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fullName: form.fullName.trim(),

            businessName:
              form.businessName.trim() ||
              undefined,

            mobile: form.mobile.trim(),

            email:
              form.email.trim() ||
              undefined,

            partnerType:
              form.partnerType,

            city: form.city.trim(),

            pincode: form.pincode.trim(),

            gstNumber:
              form.gstNumber.trim() ||
              undefined,

            businessAddress:
              form.businessAddress.trim() ||
              undefined,

            message:
              form.message.trim() ||
              undefined,
          }),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        const message = Array.isArray(
          result?.message,
        )
          ? result.message.join(", ")
          : result?.message;

        throw new Error(
          message ||
            "Unable to submit application.",
        );
      }

      setForm(initialForm);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit application.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="w-full min-w-0 rounded-2xl border border-emerald-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={27} />
        </div>

        <h2 className="mt-5 text-xl font-bold text-gray-950 sm:text-2xl">
          Application Submitted
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">
          Thank you for your interest in partnering
          with CELLTRO. Our team will review your
          application and contact you regarding the
          next steps.
        </p>

        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-6 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Submit Another Application
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      {/* HEADER */}

      <div className="border-b border-gray-100 px-5 py-6 sm:px-7 lg:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
            <Building2 size={20} />
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-950 sm:text-2xl">
              Partner Application
            </h2>

            <p className="mt-1.5 text-sm leading-6 text-gray-500">
              Fill in your details and our team
              will review your partnership request.
            </p>
          </div>
        </div>
      </div>

      {/* BODY */}

      <div className="px-5 py-6 sm:px-7 lg:px-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-5 lg:grid-cols-2">
          <Field
            label="Full Name"
            required
          >
            <input
              required
              maxLength={120}
              value={form.fullName}
              onChange={(event) =>
                update(
                  "fullName",
                  event.target.value,
                )
              }
              className={inputClass}
              placeholder="Your full name"
            />
          </Field>

          <Field label="Business Name">
            <input
              maxLength={150}
              value={form.businessName}
              onChange={(event) =>
                update(
                  "businessName",
                  event.target.value,
                )
              }
              className={inputClass}
              placeholder="Business name"
            />
          </Field>

          <Field
            label="Mobile Number"
            required
          >
            <div className="flex min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-gray-900 focus-within:ring-4 focus-within:ring-gray-100">
              <span className="flex shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-600">
                +91
              </span>

              <input
                required
                type="tel"
                inputMode="numeric"
                minLength={10}
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                value={form.mobile}
                onChange={(event) =>
                  update(
                    "mobile",
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10),
                  )
                }
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                placeholder="9876543210"
              />
            </div>
          </Field>

          <Field label="Email">
            <input
              type="email"
              maxLength={150}
              value={form.email}
              onChange={(event) =>
                update(
                  "email",
                  event.target.value,
                )
              }
              className={inputClass}
              placeholder="name@example.com"
            />
          </Field>

          <Field
            label="Partner Type"
            required
          >
            <select
              required
              value={form.partnerType}
              onChange={(event) =>
                update(
                  "partnerType",
                  event.target.value,
                )
              }
              className={inputClass}
            >
              <option value="BUYBACK_VENDOR">
                Buyback Vendor
              </option>

              <option value="PICKUP_PARTNER">
                Pickup Partner
              </option>

              <option value="BUSINESS_PARTNER">
                Business / Corporate Partner
              </option>
            </select>
          </Field>

          <Field
            label="City"
            required
          >
            <input
              required
              maxLength={100}
              value={form.city}
              onChange={(event) =>
                update(
                  "city",
                  event.target.value,
                )
              }
              className={inputClass}
              placeholder="Mumbai"
            />
          </Field>

          <Field
            label="Pincode"
            required
          >
            <input
              required
              inputMode="numeric"
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
              value={form.pincode}
              onChange={(event) =>
                update(
                  "pincode",
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6),
                )
              }
              className={inputClass}
              placeholder="400001"
            />
          </Field>

          <Field label="GST Number">
            <input
              maxLength={20}
              value={form.gstNumber}
              onChange={(event) =>
                update(
                  "gstNumber",
                  event.target.value
                    .toUpperCase()
                    .replace(/\s/g, ""),
                )
              }
              className={inputClass}
              placeholder="Optional"
            />
          </Field>

          <div className="min-w-0 lg:col-span-2">
            <Field label="Business Address">
              <textarea
                rows={3}
                maxLength={500}
                value={
                  form.businessAddress
                }
                onChange={(event) =>
                  update(
                    "businessAddress",
                    event.target.value,
                  )
                }
                className={`${inputClass} resize-y`}
                placeholder="Enter complete business address"
              />
            </Field>
          </div>

          <div className="min-w-0 lg:col-span-2">
            <Field label="Tell us about your business">
              <textarea
                rows={5}
                maxLength={2000}
                value={form.message}
                onChange={(event) =>
                  update(
                    "message",
                    event.target.value,
                  )
                }
                className={`${inputClass} resize-y`}
                placeholder="Operating areas, current business, expected partnership, etc."
              />

              <p className="mt-1.5 text-right text-xs text-gray-400">
                {form.message.length}/2000
              </p>
            </Field>
          </div>
        </div>
      </div>

      {/* FOOTER */}

      <div className="flex flex-col gap-4 border-t border-gray-100 bg-gray-50 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p className="max-w-xl text-xs leading-5 text-gray-500">
          By submitting this form, you confirm that
          the information provided is accurate and
          may be used by CELLTRO to contact you
          regarding this partnership.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
        >
          {submitting ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <Send size={18} />
          )}

          {submitting
            ? "Submitting..."
            : "Submit Application"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-semibold text-gray-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}