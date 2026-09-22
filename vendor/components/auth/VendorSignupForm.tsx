"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
} from "react";

import { vendorApi } from "@/lib/vendor-api";

import styles from "./VendorSignupForm.module.css";

interface SendOtpResponse {
  challengeId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

interface FormState {
  businessName: string;
  contactName: string;
  mobile: string;
  email: string;
  pan: string;
  aadhaar: string;
}

const initialState: FormState = {
  businessName: "",
  contactName: "",
  mobile: "",
  email: "",
  pan: "",
  aadhaar: "",
};

export default function VendorSignupForm() {
  const router = useRouter();

  const [form, setForm] =
    useState<FormState>(initialState);

  const [showAadhaar, setShowAadhaar] =
    useState(false);

  const [accepted, setAccepted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  function update(
    field: keyof FormState,
    value: string,
  ) {
    setError("");

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validate(): string | null {
    if (
      form.businessName.trim().length < 2
    ) {
      return "Enter a valid business name.";
    }

    if (
      form.contactName.trim().length < 2
    ) {
      return "Enter the contact person's name.";
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      return "Enter a valid 10 digit mobile number.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email,
      )
    ) {
      return "Enter a valid email address.";
    }

    if (
      form.pan &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
        form.pan,
      )
    ) {
      return "Enter a valid PAN number.";
    }

    if (
      !/^\d{12}$/.test(form.aadhaar)
    ) {
      return "Aadhaar number must contain exactly 12 digits.";
    }

    if (!accepted) {
      return "Please accept the Terms & Conditions and Privacy Policy.";
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await vendorApi<SendOtpResponse>(
          "/vendor-applications/send-email-otp",
          {
            method: "POST",
            body: JSON.stringify({
              email: form.email,
            }),
          },
        );

      sessionStorage.setItem(
        "vendorSignup",
        JSON.stringify({
          ...form,
          email:
            form.email.trim().toLowerCase(),
          pan: form.pan.toUpperCase(),
          challengeId:
            response.challengeId,
          resendAfterSeconds:
            response.resendAfterSeconds,
        }),
      );

      router.push(
        "/vendor/verify-email",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send verification code.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.steps}>
        <div className={styles.activeStep}>
          <span>1</span>
          <small>Details</small>
        </div>

        <div className={styles.line} />

        <div>
          <span>2</span>
          <small>Verify Email</small>
        </div>

        <div className={styles.line} />

        <div>
          <span>3</span>
          <small>Submitted</small>
        </div>
      </div>

      <header className={styles.header}>
        <h2>Create your vendor account</h2>
        <p>
          Enter your business and contact
          details to begin registration.
        </p>
      </header>

      <form
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
      >
        <label>
          <span>
            Business Name <b>*</b>
          </span>

          <input
            value={form.businessName}
            onChange={(event) =>
              update(
                "businessName",
                event.target.value,
              )
            }
            maxLength={120}
            autoComplete="organization"
            placeholder="Enter business name"
          />
        </label>

        <label>
          <span>
            Contact Person <b>*</b>
          </span>

          <input
            value={form.contactName}
            onChange={(event) =>
              update(
                "contactName",
                event.target.value,
              )
            }
            maxLength={100}
            autoComplete="name"
            placeholder="Enter contact person name"
          />
        </label>

        <div className={styles.twoColumns}>
          <label>
            <span>
              Mobile Number <b>*</b>
            </span>

            <div className={styles.phone}>
              <div>+91</div>

              <input
                value={form.mobile}
                onChange={(event) =>
                  update(
                    "mobile",
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10),
                  )
                }
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10 digit number"
              />
            </div>
          </label>

          <label>
            <span>
              Email Address <b>*</b>
            </span>

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                update(
                  "email",
                  event.target.value,
                )
              }
              maxLength={254}
              autoComplete="email"
              placeholder="name@example.com"
            />
          </label>
        </div>

        <div className={styles.twoColumns}>
          <label>
            <span>PAN Number</span>

            <input
              value={form.pan}
              onChange={(event) =>
                update(
                  "pan",
                  event.target.value
                    .toUpperCase()
                    .replace(
                      /[^A-Z0-9]/g,
                      "",
                    )
                    .slice(0, 10),
                )
              }
              maxLength={10}
              autoCapitalize="characters"
              placeholder="ABCDE1234F"
            />
          </label>

          <label>
            <span>
              Aadhaar Number <b>*</b>
            </span>

            <div className={styles.secretField}>
              <input
                type={
                  showAadhaar
                    ? "text"
                    : "password"
                }
                value={form.aadhaar}
                onChange={(event) =>
                  update(
                    "aadhaar",
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 12),
                  )
                }
                inputMode="numeric"
                autoComplete="off"
                placeholder="12 digit Aadhaar"
              />

              <button
                type="button"
                aria-label={
                  showAadhaar
                    ? "Hide Aadhaar"
                    : "Show Aadhaar"
                }
                onClick={() =>
                  setShowAadhaar(
                    (current) =>
                      !current,
                  )
                }
              >
                {showAadhaar ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>
          </label>
        </div>

        <div className={styles.securityNote}>
          <LockKeyhole size={17} />

          <span>
            Sensitive identity information
            is protected before storage.
          </span>
        </div>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) =>
              setAccepted(
                event.target.checked,
              )
            }
          />

          <span>
            I agree to the{" "}
            <Link href="/terms">
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy">
              Privacy Policy
            </Link>
          </span>
        </label>

        {error && (
          <div
            className={styles.error}
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          className={styles.submit}
          disabled={loading}
          type="submit"
        >
          {loading
            ? "Sending code..."
            : "Send Email OTP"}

          {!loading && (
            <ArrowRight size={18} />
          )}
        </button>

        <p className={styles.login}>
          Already have an account?{" "}
          <Link href="/vendor/login">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}