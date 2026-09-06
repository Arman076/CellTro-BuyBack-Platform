"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

type ContactFormData = {
  fullName: string;
  mobile: string;
  email: string;
  subject: string;
  message: string;
};

const initialForm: ContactFormData = {
  fullName: "",
  mobile: "",
  email: "",
  subject: "",
  message: "",
};

const inputClass =
  "block w-full min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-gray-900 focus:ring-4 focus:ring-gray-100";

export default function ContactForm() {
  const [form, setForm] =
    useState<ContactFormData>(
      initialForm,
    );

  const [submitting, setSubmitting] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  function update(
    field: keyof ContactFormData,
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
        `${API_URL}/contact-leads`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            fullName:
              form.fullName.trim(),

            mobile:
              form.mobile.trim(),

            email:
              form.email.trim() ||
              undefined,

            subject:
              form.subject.trim() ||
              undefined,

            message:
              form.message.trim(),
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
            "Unable to send your enquiry.",
        );
      }

      setForm(initialForm);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send your enquiry.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={28} />
        </div>

        <h2 className="mt-5 text-2xl font-bold text-gray-950">
          Message Sent
        </h2>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-gray-600">
          Thank you for contacting CELLTRO.
          Our team will review your enquiry
          and get back to you.
        </p>

        <button
          type="button"
          onClick={() =>
            setSuccess(false)
          }
          className="mt-6 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
          Send us a message
        </p>

        <h2 className="mt-2 text-2xl font-bold text-gray-950">
          How can we help?
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Fill in the form below and our
          support team will get back to you.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-7 grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
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

        <Field
          label="Mobile Number"
          required
        >
          <div className="flex min-w-0 overflow-hidden rounded-xl border border-gray-200 focus-within:border-gray-900 focus-within:ring-4 focus-within:ring-gray-100">
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
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"
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

        <Field label="Subject">
          <input
            maxLength={200}
            value={form.subject}
            onChange={(event) =>
              update(
                "subject",
                event.target.value,
              )
            }
            className={inputClass}
            placeholder="What is your enquiry about?"
          />
        </Field>

        <div className="md:col-span-2">
          <Field
            label="Message"
            required
          >
            <textarea
              required
              rows={6}
              maxLength={3000}
              value={form.message}
              onChange={(event) =>
                update(
                  "message",
                  event.target.value,
                )
              }
              className={`${inputClass} resize-y`}
              placeholder="Tell us how we can help..."
            />

            <p className="mt-1.5 text-right text-xs text-gray-400">
              {form.message.length}/3000
            </p>
          </Field>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60 sm:w-auto"
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
          ? "Sending..."
          : "Send Message"}
      </button>
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
  children: React.ReactNode;
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