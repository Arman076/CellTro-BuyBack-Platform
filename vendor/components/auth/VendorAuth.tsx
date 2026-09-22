"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { vendorApi } from "@/lib/vendor-api";
import styles from "./VendorAuth.module.css";

type Mode =
  | "login"
  | "forgot"
  | "otp"
  | "reset"
  | "change";

interface Props {
  mode: Mode;
}

interface LoginResponse {
  authenticated: boolean;
  mustChangePassword: boolean;

  vendor: {
    vendorCode: string;
    businessName: string;
  };

  user: {
    email: string;
    role: string;
  };
}

interface ForgotResponse {
  success?: boolean;
  message: string;
  challengeId: string;
  expiresInSeconds?: number;
  resendAfterSeconds?: number;
}

interface VerifyResponse {
  verified: boolean;
  resetToken: string;
}

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,72}$/;

const RESET_EMAIL_KEY =
  "vendorResetEmail";

const RESET_CHALLENGE_KEY =
  "vendorResetChallenge";

const RESET_TOKEN_KEY =
  "vendorResetToken";

function safeReturnTo(
  value: string | null,
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }

  return value;
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function clearResetSession() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  sessionStorage.removeItem(
    RESET_EMAIL_KEY,
  );

  sessionStorage.removeItem(
    RESET_CHALLENGE_KEY,
  );

  sessionStorage.removeItem(
    RESET_TOKEN_KEY,
  );
}

export default function VendorAuth({
  mode,
}: Props) {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  /*
   * Login identifier can be:
   * - registered email
   * - Vendor ID
   *
   * Do not use type="email" for this
   * field because Vendor ID must also
   * be accepted.
   */
  const [
    loginIdentifier,
    setLoginIdentifier,
  ] = useState("");

  const [email, setEmail] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [otp, setOtp] =
    useState("");

  const [
    challengeId,
    setChallengeId,
  ] = useState("");

  const [
    resetToken,
    setResetToken,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [seconds, setSeconds] =
    useState(0);

  /*
   * OTP resend countdown.
   */
  useEffect(() => {
    if (seconds <= 0) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setSeconds((value) =>
          Math.max(
            0,
            value - 1,
          ),
        );
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [seconds]);

  /*
   * Restore password-reset flow
   * after route navigation.
   */
  useEffect(() => {
    if (
      mode !== "otp" &&
      mode !== "reset"
    ) {
      return;
    }

    const storedEmail =
      sessionStorage.getItem(
        RESET_EMAIL_KEY,
      ) ?? "";

    const storedChallenge =
      sessionStorage.getItem(
        RESET_CHALLENGE_KEY,
      ) ?? "";

    const storedToken =
      sessionStorage.getItem(
        RESET_TOKEN_KEY,
      ) ?? "";

    setEmail(storedEmail);

    setChallengeId(
      storedChallenge,
    );

    setResetToken(
      storedToken,
    );

    /*
     * Someone directly opened OTP page
     * without starting forgot-password.
     */
    if (
      mode === "otp" &&
      (!storedEmail ||
        !storedChallenge)
    ) {
      setError(
        "Your password reset session is missing. Please request a new OTP.",
      );
    }

    /*
     * Someone directly opened reset page
     * without OTP verification.
     */
    if (
      mode === "reset" &&
      (!storedChallenge ||
        !storedToken)
    ) {
      setError(
        "Your password reset session has expired. Please request a new OTP.",
      );
    }
  }, [mode]);

  async function login(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const identifier = loginIdentifier.trim();

    if (!identifier) {
      setError(
        "Please enter your registered email address or Vendor ID.",
      );
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const result = await vendorApi<LoginResponse>(
        "/vendor-auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            identifier,
            password,
          }),
        },
      );

      // Confirm that the HttpOnly session cookie was accepted
      // before leaving the login screen.
      const session = await vendorApi<LoginResponse>(
        "/vendor-auth/me",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!session.authenticated) {
        throw new Error(
          "Unable to establish vendor session. Please sign in again.",
        );
      }

      if (
        result.mustChangePassword ||
        session.mustChangePassword
      ) {
        router.replace(
          "/vendor/change-password",
        );
        return;
      }

      router.replace(
        safeReturnTo(
          searchParams.get("returnTo"),
        ),
      );
      router.refresh();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to sign in. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const normalizedMobile =
      mobile.replace(
        /\D/g,
        "",
      );

    if (!normalizedEmail) {
      setError(
        "Kindly enter your registered email address.",
      );

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      setError(
        "Kindly enter a valid email address.",
      );

      return;
    }

    if (!normalizedMobile) {
      setError(
        "Kindly enter your registered mobile number.",
      );

      return;
    }

    if (
      !/^\d{10}$/.test(
        normalizedMobile,
      )
    ) {
      setError(
        "Kindly enter a valid 10-digit mobile number.",
      );

      return;
    }

    setLoading(true);

    try {
      /*
       * Remove any previous reset flow
       * before creating a new one.
       */
      clearResetSession();

      const result =
        await vendorApi<ForgotResponse>(
          "/vendor-auth/forgot-password",
          {
            method: "POST",

            body: JSON.stringify({
              email:
                normalizedEmail,

              mobile:
                normalizedMobile,
            }),
          },
        );

      if (
        !result.challengeId
      ) {
        throw new Error(
          result.message ||
            "Unable to start password reset.",
        );
      }

      sessionStorage.setItem(
        RESET_EMAIL_KEY,
        normalizedEmail,
      );

      sessionStorage.setItem(
        RESET_CHALLENGE_KEY,
        result.challengeId,
      );

      setChallengeId(
        result.challengeId,
      );

      setSeconds(
        result.resendAfterSeconds ??
          60,
      );

      setMessage(
        result.message ||
          "OTP has been sent to your registered email address.",
      );

      router.push(
        "/vendor/reset-password?step=otp",
      );
    } catch (err) {
      /*
       * Backend messages such as:
       *
       * "Kindly enter your registered
       * email address."
       *
       * "Kindly enter the correct
       * registered mobile number."
       *
       * are shown directly here.
       */
      setError(
        getErrorMessage(
          err,
          "Unable to verify your account details.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedOtp =
      otp
        .replace(/\D/g, "")
        .slice(0, 6);

    if (!email) {
      setError(
        "Password reset session is missing. Please request a new OTP.",
      );

      return;
    }

    if (!challengeId) {
      setError(
        "Password reset session is missing. Please request a new OTP.",
      );

      return;
    }

    if (
      !/^\d{6}$/.test(
        normalizedOtp,
      )
    ) {
      setError(
        "Please enter the complete 6-digit OTP.",
      );

      return;
    }

    setLoading(true);

    try {
      const result =
        await vendorApi<VerifyResponse>(
          "/vendor-auth/verify-reset-otp",
          {
            method: "POST",

            body: JSON.stringify({
              challengeId,
              email:
                email
                  .trim()
                  .toLowerCase(),
              otp:
                normalizedOtp,
            }),
          },
        );

      if (
        !result.verified ||
        !result.resetToken
      ) {
        throw new Error(
          "OTP verification failed. Please try again.",
        );
      }

      setResetToken(
        result.resetToken,
      );

      sessionStorage.setItem(
        RESET_TOKEN_KEY,
        result.resetToken,
      );

      setMessage(
        "Email verified successfully.",
      );

      router.replace(
        "/vendor/reset-password?step=new",
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to verify OTP.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !challengeId ||
      !resetToken
    ) {
      setError(
        "Your password reset session has expired. Please request a new OTP.",
      );

      return;
    }

    if (
      !PASSWORD_REGEX.test(
        newPassword,
      )
    ) {
      setError(
        "Password must be 10-72 characters and include uppercase, lowercase, number and special character.",
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "New password and confirm password do not match.",
      );

      return;
    }

    setLoading(true);

    try {
      await vendorApi<{
        success?: boolean;
        message?: string;
      }>(
        "/vendor-auth/reset-password",
        {
          method: "POST",

          body: JSON.stringify({
            challengeId,
            resetToken,
            newPassword,
            confirmPassword,
          }),
        },
      );

      clearResetSession();

      setChallengeId("");
      setResetToken("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");

      router.replace(
        "/vendor/login?reset=success",
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to reset password. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!currentPassword) {
      setError(
        "Please enter your current or temporary password.",
      );

      return;
    }

    if (
      !PASSWORD_REGEX.test(
        newPassword,
      )
    ) {
      setError(
        "Password must be 10-72 characters and include uppercase, lowercase, number and special character.",
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "New password and confirm password do not match.",
      );

      return;
    }

    if (
      currentPassword ===
      newPassword
    ) {
      setError(
        "New password must be different from your current password.",
      );

      return;
    }

    setLoading(true);

    try {
      await vendorApi(
        "/vendor-auth/change-password",
        {
          method: "POST",

          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        },
      );

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to change password.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function backToLogin() {
    clearResetSession();

    setError("");
    setMessage("");

    router.push(
      "/vendor/login",
    );
  }

  const title =
    mode === "login"
      ? "Welcome back"
      : mode === "forgot"
        ? "Recover your account"
        : mode === "otp"
          ? "Verify your email"
          : mode === "change"
            ? "Create your new password"
            : "Reset your password";

  const description =
    mode === "login"
      ? "Sign in securely using your registered email address or Vendor ID."
      : mode === "forgot"
        ? "Enter your registered email address and mobile number to verify your account."
        : mode === "otp"
          ? "Enter the 6-digit OTP sent to your registered email address."
          : mode === "change"
            ? "For security, replace your temporary password before continuing."
            : "Choose a strong password for your vendor account.";

  return (
    <div className={styles.page}>
      <section
        className={
          styles.brandPanel
        }
      >
        <div
          className={styles.brand}
        >
          CELLTRO
        </div>

        <div
          className={
            styles.brandContent
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            Vendor Operations
          </span>

          <h1>
            Your business.
            <br />
            One secure workspace.
          </h1>

          <p>
            Manage pickups, orders,
            agents and operations
            from one fast and secure
            portal.
          </p>

          <div
            className={
              styles.features
            }
          >
            <div>
              <ShieldCheck
                size={20}
              />
              Secure vendor access
            </div>

            <div>
              <CheckCircle2
                size={20}
              />
              Real-time operations
            </div>

            <div>
              <KeyRound
                size={20}
              />
              Protected account
              recovery
            </div>
          </div>
        </div>

        <div
          className={
            styles.brandFooter
          }
        >
          © Celltro Vendor Portal
        </div>
      </section>

      <section
        className={
          styles.formSide
        }
      >
        <div
          className={
            styles.mobileBrand
          }
        >
          CELLTRO
        </div>

        <div
          className={styles.card}
        >
          {mode !== "login" &&
            mode !== "change" && (
              <button
                type="button"
                className={
                  styles.back
                }
                onClick={
                  backToLogin
                }
              >
                <ArrowLeft
                  size={17}
                />
                Back to login
              </button>
            )}

          <div
            className={
              styles.iconBox
            }
          >
            {mode === "login" ? (
              <LockKeyhole
                size={25}
              />
            ) : mode ===
              "forgot" ? (
              <Mail size={25} />
            ) : (
              <KeyRound
                size={25}
              />
            )}
          </div>

          <h2>{title}</h2>

          <p
            className={
              styles.description
            }
          >
            {description}
          </p>

          {searchParams.get(
            "reset",
          ) === "success" &&
            mode === "login" && (
              <div
                className={
                  styles.success
                }
              >
                <CheckCircle2
                  size={18}
                />
                Password reset
                successfully. You can
                now sign in with your
                new password.
              </div>
            )}

          {error && (
            <div
              className={
                styles.error
              }
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              className={
                styles.info
              }
              role="status"
              aria-live="polite"
            >
              {message}
            </div>
          )}

          {mode === "login" && (
            <form
              onSubmit={login}
              className={
                styles.form
              }
            >
              <label>
                Email address or
                Vendor ID

                <div
                  className={
                    styles.inputWrap
                  }
                >
                  <UserRound
                    size={18}
                  />

                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={
                      loginIdentifier
                    }
                    onChange={(e) => {
                      setLoginIdentifier(
                        e.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="Email or Vendor ID"
                  />
                </div>
              </label>

              <label>
                Password

                <div
                  className={
                    styles.inputWrap
                  }
                >
                  <LockKeyhole
                    size={18}
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(
                        e.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="Enter password"
                  />

                  <button
                    type="button"
                    className={
                      styles.eye
                    }
                    onClick={() =>
                      setShowPassword(
                        (value) =>
                          !value,
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye
                        size={18}
                      />
                    )}
                  </button>
                </div>
              </label>

              <div
                className={
                  styles.formOptions
                }
              >
                <span>
                  Secure vendor access
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setError("");

                    router.push(
                      "/vendor/forgot-password",
                    );
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <SubmitButton
                loading={loading}
                text="Secure Login"
              />

              <div
                className={
                  styles.applyBox
                }
              >
                New to Celltro?

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/vendor/signup",
                    )
                  }
                >
                  Apply as a vendor
                </button>
              </div>
            </form>
          )}

          {mode === "forgot" && (
            <form
              onSubmit={
                forgotPassword
              }
              className={
                styles.form
              }
            >
              <label>
                Registered email

                <div
                  className={
                    styles.inputWrap
                  }
                >
                  <Mail size={18} />

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(
                        e.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="you@business.com"
                  />
                </div>
              </label>

              <label>
                Registered mobile

                <div
                  className={
                    styles.inputWrap
                  }
                >
                  <Phone
                    size={18}
                  />

                  <span
                    className={
                      styles.prefix
                    }
                  >
                    +91
                  </span>

                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => {
                      setMobile(
                        e.target.value
                          .replace(
                            /\D/g,
                            "",
                          )
                          .slice(
                            0,
                            10,
                          ),
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="9876543210"
                  />
                </div>
              </label>

              <SubmitButton
                loading={loading}
                text="Send verification code"
              />
            </form>
          )}

          {mode === "otp" && (
            <form
              onSubmit={verifyOtp}
              className={
                styles.form
              }
            >
              <div
                className={
                  styles.emailBadge
                }
              >
                <Mail size={17} />

                {email ||
                  "Registered email"}
              </div>

              <label>
                Verification code

                <input
                  className={
                    styles.otpInput
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => {
                    setOtp(
                      e.target.value
                        .replace(
                          /\D/g,
                          "",
                        )
                        .slice(
                          0,
                          6,
                        ),
                    );

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="000000"
                />
              </label>

              <p
                className={
                  styles.helper
                }
              >
                The code expires in
                10 minutes. Never
                share it with anyone.
              </p>

              {seconds > 0 && (
                <p
                  className={
                    styles.helper
                  }
                >
                  You can request a
                  new code in{" "}
                  {seconds} seconds.
                </p>
              )}

              <SubmitButton
                loading={loading}
                text="Verify OTP"
              />
            </form>
          )}

          {mode === "reset" && (
            <PasswordForm
              currentPassword={
                null
              }
              newPassword={
                newPassword
              }
              confirmPassword={
                confirmPassword
              }
              showNewPassword={
                showNewPassword
              }
              setNewPassword={
                setNewPassword
              }
              setConfirmPassword={
                setConfirmPassword
              }
              setShowNewPassword={
                setShowNewPassword
              }
              loading={loading}
              onSubmit={
                resetPassword
              }
              buttonText="Reset password"
            />
          )}

          {mode === "change" && (
            <PasswordForm
              currentPassword={
                currentPassword
              }
              newPassword={
                newPassword
              }
              confirmPassword={
                confirmPassword
              }
              showNewPassword={
                showNewPassword
              }
              setCurrentPassword={
                setCurrentPassword
              }
              setNewPassword={
                setNewPassword
              }
              setConfirmPassword={
                setConfirmPassword
              }
              setShowNewPassword={
                setShowNewPassword
              }
              loading={loading}
              onSubmit={
                changePassword
              }
              buttonText="Change password"
            />
          )}
        </div>
      </section>
    </div>
  );
}

function SubmitButton({
  loading,
  text,
}: {
  loading: boolean;
  text: string;
}) {
  return (
    <button
      className={
        styles.submit
      }
      disabled={loading}
      type="submit"
    >
      {loading ? (
        <>
          <LoaderCircle
            size={19}
            className={
              styles.spin
            }
          />

          Please wait...
        </>
      ) : (
        <>
          {text}
          <span>→</span>
        </>
      )}
    </button>
  );
}

interface PasswordFormProps {
  currentPassword:
    | string
    | null;

  newPassword: string;

  confirmPassword: string;

  showNewPassword: boolean;

  setCurrentPassword?: (
    value: string,
  ) => void;

  setNewPassword: (
    value: string,
  ) => void;

  setConfirmPassword: (
    value: string,
  ) => void;

  setShowNewPassword: (
    value: boolean,
  ) => void;

  loading: boolean;

  onSubmit: (
    event: FormEvent,
  ) => void;

  buttonText: string;
}

function PasswordForm({
  currentPassword,
  newPassword,
  confirmPassword,
  showNewPassword,
  setCurrentPassword,
  setNewPassword,
  setConfirmPassword,
  setShowNewPassword,
  loading,
  onSubmit,
  buttonText,
}: PasswordFormProps) {
  return (
    <form
      className={styles.form}
      onSubmit={onSubmit}
    >
      {currentPassword !== null &&
        setCurrentPassword && (
          <label>
            Current / temporary
            password

            <div
              className={
                styles.inputWrap
              }
            >
              <LockKeyhole
                size={18}
              />

              <input
                type="password"
                autoComplete="current-password"
                required
                value={
                  currentPassword
                }
                onChange={(e) =>
                  setCurrentPassword(
                    e.target.value,
                  )
                }
                placeholder="Current password"
              />
            </div>
          </label>
        )}

      <label>
        New password

        <div
          className={
            styles.inputWrap
          }
        >
          <KeyRound
            size={18}
          />

          <input
            type={
              showNewPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={72}
            value={newPassword}
            onChange={(e) =>
              setNewPassword(
                e.target.value,
              )
            }
            placeholder="Create strong password"
          />

          <button
            type="button"
            className={
              styles.eye
            }
            onClick={() =>
              setShowNewPassword(
                !showNewPassword,
              )
            }
            aria-label={
              showNewPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showNewPassword ? (
              <EyeOff
                size={18}
              />
            ) : (
              <Eye
                size={18}
              />
            )}
          </button>
        </div>
      </label>

      <label>
        Confirm new password

        <div
          className={
            styles.inputWrap
          }
        >
          <ShieldCheck
            size={18}
          />

          <input
            type={
              showNewPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={72}
            value={
              confirmPassword
            }
            onChange={(e) =>
              setConfirmPassword(
                e.target.value,
              )
            }
            placeholder="Repeat new password"
          />
        </div>
      </label>

      <div
        className={
          styles.rules
        }
      >
        <strong>
          Password requirements
        </strong>

        <span>
          10+ characters ·
          Uppercase · Lowercase ·
          Number · Special character
        </span>
      </div>

      <SubmitButton
        loading={loading}
        text={buttonText}
      />
    </form>
  );
}