"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
} from "react";

import styles from "./VendorForm.module.css";

export default function VendorForm() {
  const router = useRouter();

  const [businessName, setBusinessName] =
    useState("");

  const [contactName, setContactName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    const normalizedPhone =
      phone.replace(/\D/g, "");

    if (!businessName.trim()) {
      setError(
        "Business name is required.",
      );
      return;
    }

    if (!contactName.trim()) {
      setError(
        "Contact person is required.",
      );
      return;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        normalizedPhone,
      )
    ) {
      setError(
        "Enter a valid 10-digit Indian mobile number.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/super-admin/vendors",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            businessName:
              businessName.trim(),
            contactName:
              contactName.trim(),
            phone:
              normalizedPhone,
            email:
              email.trim() || null,
          }),
        },
      );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(payload?.message)
            ? payload.message.join(", ")
            : payload?.message ??
                "Unable to create vendor.",
        );
      }

      if (
        !payload ||
        typeof payload.id !==
          "number"
      ) {
        throw new Error(
          "Vendor was created but the response was invalid.",
        );
      }

      router.push(
        `/vendors/${payload.id}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create vendor.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/vendors">
          Vendors
        </Link>
        <span>/</span>
        <strong>Add Vendor</strong>
      </div>

      <div className={styles.heading}>
        <h1>Add Vendor</h1>
        <p>
          Create the vendor first. Service areas
          and agents can be configured after
          creation.
        </p>
      </div>

      <form
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
      >
        <section className={styles.card}>
          <div className={styles.cardHeading}>
            <h2>Business Information</h2>
            <p>
              Primary vendor information used
              across operations.
            </p>
          </div>

          <div className={styles.formGrid}>
            <label
              className={styles.field}
            >
              <span>
                Business Name
                <b>*</b>
              </span>

              <input
                value={businessName}
                onChange={(event) =>
                  setBusinessName(
                    event.target.value,
                  )
                }
                maxLength={150}
                autoComplete="organization"
                placeholder="Enter business name"
                required
              />
            </label>

            <label
              className={styles.field}
            >
              <span>
                Contact Person
                <b>*</b>
              </span>

              <input
                value={contactName}
                onChange={(event) =>
                  setContactName(
                    event.target.value,
                  )
                }
                maxLength={120}
                autoComplete="name"
                placeholder="Enter contact person"
                required
              />
            </label>

            <label
              className={styles.field}
            >
              <span>
                Mobile Number
                <b>*</b>
              </span>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10),
                  )
                }
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="10-digit mobile number"
                required
              />
            </label>

            <label
              className={styles.field}
            >
              <span>Email</span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                maxLength={254}
                autoComplete="email"
                placeholder="Optional"
              />
            </label>
          </div>

          <div className={styles.info}>
            Vendor code will be generated
            automatically after creation.
          </div>
        </section>

        {error ? (
          <div
            className={styles.error}
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className={styles.actions}>
          <Link
            href="/vendors"
            className={styles.cancel}
          >
            Cancel
          </Link>

          <button
            type="submit"
            className={styles.submit}
            disabled={submitting}
          >
            {submitting
              ? "Creating…"
              : "Create Vendor"}
          </button>
        </div>
      </form>
    </main>
  );
}