'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  FormEvent,
  useState,
} from 'react';

import {
  ApiError,
  loginAgent,
} from '@/lib/agent-api';

export default function LoginPage() {
  const router = useRouter();

  const [
    identifier,
    setIdentifier,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!identifier.trim()) {
      setError(
        'Please enter your email address or mobile number.',
      );

      return;
    }

    if (!password) {
      setError(
        'Please enter your password.',
      );

      return;
    }

    try {
      setLoading(true);
      setError('');

      await loginAgent(
        identifier.trim(),
        password,
      );

      router.replace(
        '/dashboard',
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (
          err.message
            .toLowerCase()
            .includes(
              'awaiting vendor approval',
            )
        ) {
          router.push(
            '/pending',
          );

          return;
        }

        setError(err.message);
      } else {
        setError(
          'Unable to sign in. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <aside className="auth-hero">
        <div className="brand">
          Celltro
          <span className="brand-dot">
            .
          </span>
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow">
            Agent Workspace
          </div>

          <h1 className="hero-title">
            Your pickups.
            <br />
            One workspace.
          </h1>

          <p className="hero-copy">
            View assigned orders,
            complete inspections and
            securely close customer
            pickups.
          </p>

          <div className="hero-points">
            <div className="hero-point">
              <span className="hero-check">
                ✓
              </span>
              Assigned pickup management
            </div>

            <div className="hero-point">
              <span className="hero-check">
                ✓
              </span>
              Secure customer verification
            </div>

            <div className="hero-point">
              <span className="hero-check">
                ✓
              </span>
              Guided device quotation
            </div>
          </div>
        </div>

        <div className="hero-footer">
          © Celltro Agent Operations
        </div>
      </aside>

      <section className="auth-main">
        <div
          className="
            auth-card
            login-card
          "
        >
          <div className="mobile-brand">
            Celltro.
          </div>

          <header className="card-header">
            <h1 className="card-title">
              Welcome back
            </h1>

            <p className="card-subtitle">
              Sign in to your approved
              Celltro Agent account.
            </p>
          </header>

          {error && (
            <div
              className="
                alert
                alert-error
              "
              role="alert"
            >
              {error}
            </div>
          )}

          <form
            className="login-fields"
            onSubmit={submit}
          >
            <div className="field">
              <label htmlFor="identifier">
                Email or mobile number
              </label>

              <input
                id="identifier"
                className="input"
                autoComplete="username"
                maxLength={150}
                placeholder="Email or 10-digit mobile"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(
                    e.target.value,
                  );

                  setError('');
                }}
              />
            </div>

            <div className="field">
              <label htmlFor="password">
                Password
              </label>

              <div className="input-wrap">
                <input
                  id="password"
                  className="
                    input
                    password-input
                  "
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  maxLength={72}
                  value={password}
                  onChange={(e) => {
                    setPassword(
                      e.target.value,
                    );

                    setError('');
                  }}
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                >
                  {showPassword
                    ? 'Hide'
                    : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="
                btn
                btn-primary
                btn-full
              "
              disabled={loading}
            >
              {loading
                ? 'Signing in...'
                : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            New agent?{' '}
            <Link href="/register">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}