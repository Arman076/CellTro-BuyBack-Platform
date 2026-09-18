"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
} from "lucide-react";

import styles from "./LoginForm.module.css";

export default function LoginForm() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError(
        "Email or username is required.",
      );

      return;
    }

    if (!password) {
      setError(
        "Password is required.",
      );

      return;
    }

    /*
      IMPORTANT:

      Backend authentication hum next step
      me connect karenge.

      Abhi fake login ya localStorage based
      authentication intentionally use nahi
      kar rahe because woh secure nahi hoga.
    */

    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      setError(
        "Authentication backend is not connected yet.",
      );
    }, 600);
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
    >
      {error && (
        <div
          className={styles.errorMessage}
          role="alert"
        >
          {error}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="email">
          Email or Username
        </label>

        <div className={styles.inputWrapper}>
          <Mail
            size={18}
            className={styles.inputIcon}
          />

          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            value={email}
            placeholder="Enter your email"
            onChange={(event) =>
              setEmail(event.target.value)
            }
          />
        </div>
      </div>

      <div className={styles.field}>
        <div
          className={styles.passwordHeader}
        >
          <label htmlFor="password">
            Password
          </label>

          <button
            type="button"
            className={styles.forgotButton}
          >
            Forgot password?
          </button>
        </div>

        <div className={styles.inputWrapper}>
          <KeyRound
            size={18}
            className={styles.inputIcon}
          />

          <input
            id="password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="current-password"
            value={password}
            placeholder="Enter your password"
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
          />

          <button
            type="button"
            className={
              styles.passwordToggle
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            onClick={() =>
              setShowPassword(
                (current) => !current,
              )
            }
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>
      </div>

      <div className={styles.loginOptions}>
        <label
          className={styles.checkboxLabel}
        >
          <input type="checkbox" />

          <span>Keep me signed in</span>
        </label>
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={loading}
      >
        {loading ? (
          <>
            <LoaderCircle
              size={18}
              className={styles.spinner}
            />

            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </button>

      <p className={styles.helpText}>
        Having trouble signing in?
        Contact your platform administrator.
      </p>
    </form>
  );
}