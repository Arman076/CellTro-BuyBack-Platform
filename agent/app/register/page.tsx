'use client';

import Link from 'next/link';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ApiError,
  registerAgent,
  sendAgentOtp,
  verifyAgentOtp,
} from '@/lib/agent-api';

type Step = 1 | 2 | 3;

type FormState = {
  fullName: string;
  mobile: string;
  vendorCode: string;

  email: string;
  otp: string;

  aadhaarNumber: string;
  address: string;

  password: string;
  confirmPassword: string;
};

const initialForm: FormState = {
  fullName: '',
  mobile: '',
  vendorCode: '',

  email: '',
  otp: '',

  aadhaarNumber: '',
  address: '',

  password: '',
  confirmPassword: '',
};

function AuthHero() {
  return (
    <aside className="auth-hero">
      <div className="brand">
        Celltro
        <span className="brand-dot">
          .
        </span>
      </div>

      <div className="hero-content">
        <div className="hero-eyebrow">
          Field Agent Portal
        </div>

        <h1 className="hero-title">
          Pickups made simple.
        </h1>

        <p className="hero-copy">
          Manage assigned pickups,
          inspect devices and complete
          customer transactions securely
          from one place.
        </p>

        <div className="hero-points">
          <div className="hero-point">
            <span className="hero-check">
              ✓
            </span>
            Secure vendor-approved accounts
          </div>

          <div className="hero-point">
            <span className="hero-check">
              ✓
            </span>
            Guided device inspection
          </div>

          <div className="hero-point">
            <span className="hero-check">
              ✓
            </span>
            Verified customer handover
          </div>
        </div>
      </div>

      <div className="hero-footer">
        © Celltro Agent Operations
      </div>
    </aside>
  );
}

export default function RegisterPage() {
  const [step, setStep] =
    useState<Step>(1);

  const [form, setForm] =
    useState<FormState>(
      initialForm,
    );

  const [
    challengeId,
    setChallengeId,
  ] = useState('');

  const [
    verificationToken,
    setVerificationToken,
  ] = useState('');

  const [
    emailVerified,
    setEmailVerified,
  ] = useState(false);

  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(0);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    registrationResult,
    setRegistrationResult,
  ] = useState<{
    agentCode: string;
    vendorName: string;
    email: string;
  } | null>(null);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setResendSeconds(
          (current) =>
            Math.max(
              0,
              current - 1,
            ),
        );
      }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [resendSeconds]);

  const passwordRules =
    useMemo(
      () => ({
        length:
          form.password.length >= 10,

        upper:
          /[A-Z]/.test(
            form.password,
          ),

        lower:
          /[a-z]/.test(
            form.password,
          ),

        number:
          /\d/.test(
            form.password,
          ),

        special:
          /[^A-Za-z0-9]/.test(
            form.password,
          ),
      }),
      [form.password],
    );

  function update(
    key: keyof FormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setError('');
  }

  function errorMessage(
    err: unknown,
  ): string {
    if (err instanceof ApiError) {
      return err.message;
    }

    return (
      'Something went wrong. ' +
      'Please try again.'
    );
  }

  function validateStepOne(): boolean {
    const name =
      form.fullName.trim();

    const mobile =
      form.mobile.replace(
        /\D/g,
        '',
      );

    const vendor =
      form.vendorCode.trim();

    if (name.length < 2) {
      setError(
        'Please enter your full name.',
      );

      return false;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        mobile,
      )
    ) {
      setError(
        'Please enter a valid 10-digit mobile number.',
      );

      return false;
    }

    if (!vendor) {
      setError(
        'Please enter the Vendor ID provided by your vendor.',
      );

      return false;
    }

    return true;
  }

  function goToEmailStep() {
    if (!validateStepOne()) {
      return;
    }

    setStep(2);
    setError('');
  }

  async function sendOtp() {
    const email =
      form.email
        .trim()
        .toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      setError(
        'Please enter a valid email address.',
      );

      return;
    }

    try {
      setLoading(true);
      setError('');

      const response =
        await sendAgentOtp(email);

      setChallengeId(
        response.challengeId,
      );

      setVerificationToken('');
      setEmailVerified(false);

      setResendSeconds(
        response.resendAfterSeconds,
      );
    } catch (err) {
      setError(
        errorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!challengeId) {
      setError(
        'Please request a verification code first.',
      );

      return;
    }

    if (
      !/^\d{6}$/.test(
        form.otp,
      )
    ) {
      setError(
        'Please enter the 6-digit verification code.',
      );

      return;
    }

    try {
      setLoading(true);
      setError('');

      const response =
        await verifyAgentOtp(
          challengeId,
          form.email
            .trim()
            .toLowerCase(),
          form.otp,
        );

      setVerificationToken(
        response.verificationToken,
      );

      setEmailVerified(true);
    } catch (err) {
      setError(
        errorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  }

  function continueFromEmail() {
    if (!emailVerified) {
      setError(
        'Please verify your email before continuing.',
      );

      return;
    }

    setStep(3);
    setError('');
  }

  async function submitRegistration(
    event: FormEvent,
  ) {
    event.preventDefault();

    const aadhaar =
      form.aadhaarNumber.replace(
        /\D/g,
        '',
      );

    if (
      !/^\d{12}$/.test(
        aadhaar,
      )
    ) {
      setError(
        'Please enter a valid 12-digit Aadhaar number.',
      );

      return;
    }

    if (
      form.address.trim().length <
      10
    ) {
      setError(
        'Please enter your complete address.',
      );

      return;
    }

    const validPassword =
      Object.values(
        passwordRules,
      ).every(Boolean);

    if (!validPassword) {
      setError(
        'Please create a stronger password using all the requirements shown below.',
      );

      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        'Password and confirm password do not match.',
      );

      return;
    }

    if (
      !verificationToken
    ) {
      setError(
        'Email verification expired. Please verify your email again.',
      );

      setStep(2);

      return;
    }

    try {
      setLoading(true);
      setError('');

      const response =
        await registerAgent({
          fullName:
            form.fullName.trim(),

          email:
            form.email
              .trim()
              .toLowerCase(),

          mobile:
            form.mobile.replace(
              /\D/g,
              '',
            ),

          aadhaarNumber:
            aadhaar,

          address:
            form.address.trim(),

          vendorCode:
            form.vendorCode.trim(),

          password:
            form.password,

          verificationToken,
        });

      setRegistrationResult({
        agentCode:
          response.agent.agentCode,

        vendorName:
          response.vendor
            .businessName,

        email:
          response.agent.email,
      });
    } catch (err) {
      setError(
        errorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  }

  if (registrationResult) {
    return (
      <main className="auth-page">
        <AuthHero />

        <section className="auth-main">
          <div
            className="
              auth-card
              pending-card
            "
          >
            <div className="mobile-brand">
              Celltro.
            </div>

            <div className="status-icon">
              ✓
            </div>

            <h1 className="card-title">
              Registration submitted
            </h1>

            <p className="card-subtitle">
              Your email is verified.
              Your account now needs
              approval from your vendor
              before you can sign in.
            </p>

            <div className="status-details">
              <div className="status-row">
                <span className="status-key">
                  Agent ID
                </span>

                <span className="status-value">
                  {
                    registrationResult
                      .agentCode
                  }
                </span>
              </div>

              <div className="status-row">
                <span className="status-key">
                  Vendor
                </span>

                <span className="status-value">
                  {
                    registrationResult
                      .vendorName
                  }
                </span>
              </div>

              <div className="status-row">
                <span className="status-key">
                  Status
                </span>

                <span className="status-value">
                  Awaiting approval
                </span>
              </div>
            </div>

            <Link
              href="/login"
              className="auth-switch"
            >
              Go to sign in
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <AuthHero />

      <section className="auth-main">
        <div className="auth-card">
          <div className="mobile-brand">
            Celltro.
          </div>

          <header className="card-header">
            <h1 className="card-title">
              Create agent account
            </h1>

            <p className="card-subtitle">
              Register with the Vendor ID
              provided by your vendor.
            </p>
          </header>

          <div
            className="progress"
            aria-label={`Registration step ${step} of 3`}
          >
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className={
                    'progress-item ' +
                    (item <= step
                      ? 'active'
                      : '')
                  }
                />
              ),
            )}
          </div>

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

          {step === 1 && (
            <>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="fullName">
                    Full name
                  </label>

                  <input
                    id="fullName"
                    className="input"
                    autoComplete="name"
                    maxLength={100}
                    placeholder="Enter your full name"
                    value={
                      form.fullName
                    }
                    onChange={(e) =>
                      update(
                        'fullName',
                        e.target.value,
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="mobile">
                    Mobile number
                  </label>

                  <input
                    id="mobile"
                    className="input"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={form.mobile}
                    onChange={(e) =>
                      update(
                        'mobile',
                        e.target.value
                          .replace(
                            /\D/g,
                            '',
                          )
                          .slice(0, 10),
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="vendor">
                    Vendor ID
                  </label>

                  <input
                    id="vendor"
                    className="input"
                    maxLength={50}
                    placeholder="e.g. VEN-000003"
                    value={
                      form.vendorCode
                    }
                    onChange={(e) =>
                      update(
                        'vendorCode',
                        e.target.value
                          .toUpperCase(),
                      )
                    }
                  />

                  <p className="helper">
                    Enter the Vendor ID
                    shared by your vendor.
                  </p>
                </div>
              </div>

              <div className="form-actions">
                <span />

                <button
                  type="button"
                  className="
                    btn
                    btn-primary
                  "
                  onClick={
                    goToEmailStep
                  }
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-grid">
                <div className="field full">
                  <div className="label-row">
                    <label htmlFor="email">
                      Email address
                    </label>

                    {emailVerified && (
                      <span className="verified-badge">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <input
                    id="email"
                    className="input"
                    type="email"
                    autoComplete="email"
                    maxLength={150}
                    disabled={
                      emailVerified
                    }
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(e) => {
                      update(
                        'email',
                        e.target.value,
                      );

                      setChallengeId('');
                      setVerificationToken('');
                      setEmailVerified(false);
                    }}
                  />
                </div>

                {!emailVerified && (
                  <>
                    <div className="field full">
                      <button
                        type="button"
                        className="
                          btn
                          btn-secondary
                          btn-full
                        "
                        disabled={
                          loading ||
                          resendSeconds > 0
                        }
                        onClick={sendOtp}
                      >
                        {loading
                          ? 'Please wait...'
                          : resendSeconds > 0
                            ? `Resend code in ${resendSeconds}s`
                            : challengeId
                              ? 'Resend verification code'
                              : 'Send verification code'}
                      </button>
                    </div>

                    {challengeId && (
                      <div className="field full">
                        <label htmlFor="otp">
                          Verification code
                        </label>

                        <div className="otp-row">
                          <input
                            id="otp"
                            className="input"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="6-digit OTP"
                            value={
                              form.otp
                            }
                            onChange={(e) =>
                              update(
                                'otp',
                                e.target.value
                                  .replace(
                                    /\D/g,
                                    '',
                                  )
                                  .slice(
                                    0,
                                    6,
                                  ),
                              )
                            }
                          />

                          <button
                            type="button"
                            className="
                              btn
                              btn-primary
                            "
                            disabled={
                              loading ||
                              form.otp
                                .length !==
                                6
                            }
                            onClick={
                              verifyOtp
                            }
                          >
                            Verify
                          </button>
                        </div>

                        <p className="helper">
                          We sent a
                          6-digit code to
                          your email. The
                          code expires in
                          10 minutes.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="
                    btn
                    btn-secondary
                  "
                  disabled={loading}
                  onClick={() => {
                    setStep(1);
                    setError('');
                  }}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="
                    btn
                    btn-primary
                  "
                  disabled={
                    !emailVerified ||
                    loading
                  }
                  onClick={
                    continueFromEmail
                  }
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <form
              onSubmit={
                submitRegistration
              }
            >
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="aadhaar">
                    Aadhaar number
                  </label>

                  <input
                    id="aadhaar"
                    className="input"
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="12-digit Aadhaar number"
                    value={
                      form.aadhaarNumber
                    }
                    onChange={(e) =>
                      update(
                        'aadhaarNumber',
                        e.target.value
                          .replace(
                            /\D/g,
                            '',
                          )
                          .slice(0, 12),
                      )
                    }
                  />

                  <p className="helper">
                    Used for agent identity
                    records and account
                    safety.
                  </p>
                </div>

                <div className="field full">
                  <label htmlFor="address">
                    Complete address
                  </label>

                  <textarea
                    id="address"
                    className="textarea"
                    maxLength={500}
                    autoComplete="street-address"
                    placeholder="House / building, street, area, city, state and pincode"
                    value={
                      form.address
                    }
                    onChange={(e) =>
                      update(
                        'address',
                        e.target.value,
                      )
                    }
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
                      autoComplete="new-password"
                      maxLength={72}
                      value={
                        form.password
                      }
                      onChange={(e) =>
                        update(
                          'password',
                          e.target.value,
                        )
                      }
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

                <div className="field">
                  <label htmlFor="confirmPassword">
                    Confirm password
                  </label>

                  <input
                    id="confirmPassword"
                    className="input"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="new-password"
                    maxLength={72}
                    value={
                      form.confirmPassword
                    }
                    onChange={(e) =>
                      update(
                        'confirmPassword',
                        e.target.value,
                      )
                    }
                  />
                </div>

                <div className="field full">
                  <div className="password-rules">
                    <span
                      className={
                        'rule ' +
                        (passwordRules.length
                          ? 'ok'
                          : '')
                      }
                    >
                      ✓ 10+ characters
                    </span>

                    <span
                      className={
                        'rule ' +
                        (passwordRules.upper
                          ? 'ok'
                          : '')
                      }
                    >
                      ✓ Uppercase letter
                    </span>

                    <span
                      className={
                        'rule ' +
                        (passwordRules.lower
                          ? 'ok'
                          : '')
                      }
                    >
                      ✓ Lowercase letter
                    </span>

                    <span
                      className={
                        'rule ' +
                        (passwordRules.number
                          ? 'ok'
                          : '')
                      }
                    >
                      ✓ Number
                    </span>

                    <span
                      className={
                        'rule ' +
                        (passwordRules.special
                          ? 'ok'
                          : '')
                      }
                    >
                      ✓ Special character
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="
                    btn
                    btn-secondary
                  "
                  disabled={loading}
                  onClick={() => {
                    setStep(2);
                    setError('');
                  }}
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="
                    btn
                    btn-primary
                  "
                  disabled={loading}
                >
                  {loading
                    ? 'Creating account...'
                    : 'Create account'}
                </button>
              </div>
            </form>
          )}

          <p className="auth-switch">
            Already registered?{' '}
            <Link href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}