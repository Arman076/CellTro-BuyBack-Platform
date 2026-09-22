"use client";

import {
  ArrowLeft,
  ArrowRight,
  MailCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { vendorApi } from "@/lib/vendor-api";

import styles from "./VerifyEmailForm.module.css";

interface SignupData {
  businessName: string;
  contactName: string;
  mobile: string;
  email: string;
  pan: string;
  aadhaar: string;
  challengeId: string;
  resendAfterSeconds: number;
}

interface VerifyResponse {
  verified: boolean;
  verificationToken: string;
}

interface ApplicationResponse {
  applicationId: string;
  businessName: string;
  status: string;
}

export default function VerifyEmailForm() {
  const router = useRouter();

  const [signup, setSignup] =
    useState<SignupData | null>(null);

  const [digits, setDigits] =
    useState(["", "", "", "", "", ""]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [seconds, setSeconds] =
    useState(60);

  const inputs =
    useRef<Array<HTMLInputElement | null>>(
      [],
    );

  useEffect(() => {
    const raw =
      sessionStorage.getItem(
        "vendorSignup",
      );

    if (!raw) {
      router.replace("/vendor/signup");
      return;
    }

    try {
      const parsed =
        JSON.parse(raw) as SignupData;

      setSignup(parsed);
      setSeconds(
        parsed.resendAfterSeconds ?? 60,
      );
    } catch {
      router.replace("/vendor/signup");
    }
  }, [router]);

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }

    const timer = window.setInterval(
      () => {
        setSeconds((current) =>
          Math.max(0, current - 1),
        );
      },
      1000,
    );

    return () =>
      window.clearInterval(timer);
  }, [seconds]);

  function changeDigit(
    index: number,
    value: string,
  ) {
    const clean =
      value.replace(/\D/g, "").slice(-1);

    setDigits((current) => {
      const next = [...current];
      next[index] = clean;
      return next;
    });

    if (clean && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!signup) {
      return;
    }

    const otp = digits.join("");

    if (otp.length !== 6) {
      setError(
        "Enter the complete 6 digit verification code.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const verification =
        await vendorApi<VerifyResponse>(
          "/vendor-applications/verify-email-otp",
          {
            method: "POST",
            body: JSON.stringify({
              challengeId:
                signup.challengeId,
              email: signup.email,
              otp,
            }),
          },
        );

      const application =
        await vendorApi<ApplicationResponse>(
          "/vendor-applications",
          {
            method: "POST",
            body: JSON.stringify({
              businessName:
                signup.businessName,
              contactName:
                signup.contactName,
              mobile: signup.mobile,
              email: signup.email,
              pan:
                signup.pan || undefined,
              aadhaar:
                signup.aadhaar,
              challengeId:
                signup.challengeId,
              verificationToken:
                verification.verificationToken,
            }),
          },
        );

      sessionStorage.removeItem(
        "vendorSignup",
      );

      sessionStorage.setItem(
        "vendorApplicationSubmitted",
        JSON.stringify({
          applicationId:
            application.applicationId,
          businessName:
            application.businessName,
        }),
      );

      router.replace(
        "/vendor/application-submitted",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Verification failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!signup || seconds > 0) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await vendorApi<{
        challengeId: string;
        resendAfterSeconds: number;
      }>(
        "/vendor-applications/send-email-otp",
        {
          method: "POST",
          body: JSON.stringify({
            email: signup.email,
          }),
        },
      );

      const next = {
        ...signup,
        challengeId:
          response.challengeId,
        resendAfterSeconds:
          response.resendAfterSeconds,
      };

      sessionStorage.setItem(
        "vendorSignup",
        JSON.stringify(next),
      );

      setSignup(next);
      setDigits(["", "", "", "", "", ""]);
      setSeconds(
        response.resendAfterSeconds,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to resend code.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!signup) {
    return (
      <div className={styles.loading}>
        Loading verification...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.steps}>
        <div className={styles.complete}>
          <span>✓</span>
          <small>Details</small>
        </div>

        <div className={styles.line} />

        <div className={styles.active}>
          <span>2</span>
          <small>Verify Email</small>
        </div>

        <div className={styles.line} />

        <div>
          <span>3</span>
          <small>Submitted</small>
        </div>
      </div>

      <div className={styles.icon}>
        <MailCheck size={27} />
      </div>

      <h2>Verify your email</h2>

      <p className={styles.description}>
        We&apos;ve sent a 6-digit code to
        <strong> {signup.email}</strong>
      </p>

      <form onSubmit={handleVerify}>
        <div className={styles.otp}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputs.current[index] =
                  element;
              }}
              value={digit}
              onChange={(event) =>
                changeDigit(
                  index,
                  event.target.value,
                )
              }
              onKeyDown={(event) =>
                handleKeyDown(
                  index,
                  event,
                )
              }
              inputMode="numeric"
              autoComplete={
                index === 0
                  ? "one-time-code"
                  : "off"
              }
              maxLength={1}
              aria-label={`OTP digit ${
                index + 1
              }`}
            />
          ))}
        </div>

        <div className={styles.resend}>
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            disabled={
              seconds > 0 || loading
            }
            onClick={resend}
          >
            {seconds > 0
              ? `Resend in 00:${String(
                  seconds,
                ).padStart(2, "0")}`
              : "Resend code"}
          </button>
        </div>

        {error && (
          <div
            className={styles.error}
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className={styles.verify}
          disabled={loading}
        >
          {loading
            ? "Verifying..."
            : "Verify & Submit"}

          {!loading && (
            <ArrowRight size={18} />
          )}
        </button>
      </form>

      <button
        className={styles.back}
        type="button"
        onClick={() =>
          router.push("/vendor/signup")
        }
      >
        <ArrowLeft size={16} />
        Back
      </button>
    </div>
  );
}