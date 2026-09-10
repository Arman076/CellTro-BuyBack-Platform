"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import styles from "./ExactValueModal.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ChildOption = {
  id: number;
  label: string;
  value: string;
  issueCode?: string | null;
};

type MainOption = {
  id: number;
  label: string;
  value: string;
  issueCode?: string | null;
  showChildOptions: boolean;
  childPrompt?: string | null;
  requireChildSelection: boolean;
  minChildSelections: number;
  maxChildSelections?: number | null;
  childSelectionMode: "SINGLE" | "MULTI";
  childOptions: ChildOption[];
};

type EffectiveQuestion = {
  id: number;
  code: string;
  name: string;
  questionText: string;
  answerType: "YES_NO" | "SINGLE_SELECT" | "MULTI_SELECT";
  isRequired: boolean;
  displayOrder: number;
  section: { id: number; code: string; name: string };
  options: MainOption[];
};

type EffectiveResponse = {
  product: { id: number; name: string };
  audience: string;
  questions: EffectiveQuestion[];
};

type Answer = {
  itemId: number;
  optionId: number;
  childOptionIds: number[];
};

type QuoteResult = {
  basePrice: number;
  totalDeduction: number;
  finalPrice: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  productImage: string | null;
  variantId: number;
  variantLabel: string;
  basePrice: number;
};

async function apiJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ExactValueModal({
  open,
  onClose,
  productId,
  productName,
  productImage,
  variantId,
  variantLabel,
  basePrice,
}: Props) {
  const [questionnaire, setQuestionnaire] = useState<EffectiveResponse | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [step, setStep] = useState<"QUESTIONS" | "PHONE" | "OTP" | "RESULT">("QUESTIONS");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const questions = questionnaire?.questions ?? [];
  const currentQuestion = questions[questionIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  const selectedOption =
    currentQuestion && currentAnswer
      ? currentQuestion.options.find((option) => option.id === currentAnswer.optionId) ?? null
      : null;

  const progress = questions.length
    ? Math.round(((questionIndex + 1) / questions.length) * 100)
    : 0;

  const canContinue = useMemo(() => {
    if (!currentQuestion || !currentAnswer) return false;
    if (!selectedOption?.showChildOptions) return true;

    const count = currentAnswer.childOptionIds.length;
    const minimum = selectedOption.requireChildSelection
      ? Math.max(1, selectedOption.minChildSelections || 1)
      : selectedOption.minChildSelections || 0;

    if (count < minimum) return false;
    if (selectedOption.maxChildSelections && count > selectedOption.maxChildSelections) return false;

    return true;
  }, [currentQuestion, currentAnswer, selectedOption]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    setError("");
    setLoading(true);

    apiJson(`${API}/questionnaire/effective?productId=${productId}&audience=CUSTOMER`)
      .then((data: EffectiveResponse) => {
        setQuestionnaire(data);
        setQuestionIndex(0);
        setAnswers({});
        setStep("QUESTIONS");
        setPhone("");
        setOtp("");
        setSessionId(null);
        setQuote(null);
        setDevOtp(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load questionnaire"),
      )
      .finally(() => setLoading(false));

    return () => {
      document.body.style.overflow = "";
    };
  }, [open, productId, variantId]);

  function closeModal() {
    document.body.style.overflow = "";
    onClose();
  }

  function selectMainOption(option: MainOption) {
    if (!currentQuestion) return;
    setError("");

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: {
        itemId: currentQuestion.id,
        optionId: option.id,
        childOptionIds: [],
      },
    }));
  }

  function toggleChild(childId: number) {
    if (!currentQuestion || !currentAnswer || !selectedOption) return;

    const currentIds = currentAnswer.childOptionIds;
    const nextIds =
      selectedOption.childSelectionMode === "SINGLE"
        ? currentIds.includes(childId)
          ? []
          : [childId]
        : currentIds.includes(childId)
          ? currentIds.filter((id) => id !== childId)
          : [...currentIds, childId];

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: {
        ...currentAnswer,
        childOptionIds: nextIds,
      },
    }));
  }

  function continueQuestion() {
    setError("");

    if (!canContinue) {
      setError("Please complete this question before continuing.");
      return;
    }

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }

    setStep("PHONE");
  }

  function goBack() {
    setError("");

    if (step === "QUESTIONS") {
      if (questionIndex > 0) setQuestionIndex((current) => current - 1);
      return;
    }

    if (step === "PHONE") {
      setStep("QUESTIONS");
      setQuestionIndex(Math.max(0, questions.length - 1));
      return;
    }

    if (step === "OTP") {
      setStep("PHONE");
      setOtp("");
    }
  }

  async function sendOtp() {
    setError("");
    const normalized = phone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(normalized)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiJson(`${API}/questionnaire/quote/send-otp`, {
        method: "POST",
        body: JSON.stringify({
          productId,
          variantId,
          phone: normalized,
          answers: Object.values(answers),
        }),
      });

      setSessionId(response.sessionId);
      setDevOtp(response.devOtp ?? null);
      setStep("OTP");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError("");

    if (!sessionId || !/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiJson(`${API}/questionnaire/quote/verify-otp`, {
        method: "POST",
        body: JSON.stringify({ sessionId, otp }),
      });

      setQuote({
        basePrice: Number(response.basePrice),
        totalDeduction: Number(response.totalDeduction),
        finalPrice: Number(response.finalPrice),
      });

      setStep("RESULT");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className={styles["exact-modal-backdrop"]}
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div className={styles["exact-modal"]}>
        <div className={styles["exact-modal-top"]}>
          <button
            type="button"
            className={styles["exact-icon-btn"]}
            onClick={goBack}
            disabled={step === "QUESTIONS" && questionIndex === 0}
          >
            <ArrowLeft size={19} />
          </button>

          <div className={styles["exact-device-mini"]}>
            {productImage ? (
              <img src={productImage} alt={productName} />
            ) : (
              <div className={styles["exact-image-fallback"]}>DEVICE</div>
            )}

            <div>
              <strong>{productName}</strong>
              <span>{variantLabel}</span>
            </div>
          </div>

          <button type="button" className={styles["exact-icon-btn"]} onClick={closeModal}>
            <X size={20} />
          </button>
        </div>

        {loading && !questionnaire && (
          <div className={styles["exact-loading"]}>
            <Loader2 className={styles["spin"]} size={28} />
            <span>Loading your device questions...</span>
          </div>
        )}

        {error && <div className={styles["exact-error"]}>{error}</div>}

        {questionnaire && step === "QUESTIONS" && (
          <>
            <div className={styles["exact-progress-wrap"]}>
              <div className={styles["exact-progress-meta"]}>
                <span>Device Condition</span>
                <strong>{questionIndex + 1} / {questions.length}</strong>
              </div>

              <div className={styles["exact-progress-track"]}>
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>

            {currentQuestion ? (
              <div className={styles["exact-question-body"]}>
                <span className={styles["exact-section-name"]}>
                  {currentQuestion.section.name}
                </span>

                <h2>{currentQuestion.questionText}</h2>

                <div className={styles["exact-main-options"]}>
                  {currentQuestion.options.map((option) => {
                    const selected = currentAnswer?.optionId === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`${styles["exact-main-option"]} ${selected ? styles.active : ""}`}
                        onClick={() => selectMainOption(option)}
                      >
                        {selected ? <CheckCircle2 size={20} /> : <span className={styles["exact-radio"]} />}
                        <strong>{option.label}</strong>
                      </button>
                    );
                  })}
                </div>

                {selectedOption?.showChildOptions &&
                  selectedOption.childOptions.length > 0 && (
                    <div className={styles["exact-child-panel"]}>
                      <h3>{selectedOption.childPrompt || "Please select"}</h3>

                      {selectedOption.requireChildSelection && (
                        <p>
                          Select at least{" "}
                          {Math.max(1, selectedOption.minChildSelections || 1)}
                        </p>
                      )}

                      <div className={styles["exact-child-grid"]}>
                        {selectedOption.childOptions.map((child) => {
                          const checked =
                            currentAnswer?.childOptionIds.includes(child.id) ?? false;

                          return (
                            <button
                              key={child.id}
                              type="button"
                              className={`${styles["exact-child-option"]} ${checked ? styles.active : ""}`}
                              onClick={() => toggleChild(child.id)}
                            >
                              <span className={styles["exact-checkbox"]}>
                                {checked ? "✓" : ""}
                              </span>
                              <span>{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                <button
                  type="button"
                  className={styles["exact-primary"]}
                  onClick={continueQuestion}
                  disabled={!canContinue}
                >
                  {questionIndex === questions.length - 1
                    ? "Continue"
                    : "Next Question"}
                </button>
              </div>
            ) : (
              <div className={styles["exact-loading"]}>
                No active customer questions configured.
              </div>
            )}
          </>
        )}

        {questionnaire && step === "PHONE" && (
          <div className={styles["exact-auth-body"]}>
            <div className={styles["exact-lock-circle"]}>
              <LockKeyhole size={24} />
            </div>

            <h2>Unlock your exact price</h2>
            <p>
              Verify your mobile number to view the final device value.
            </p>

            <label className={styles["exact-label"]}>Mobile Number *</label>

            <div className={styles["exact-phone-field"]}>
              <span>+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                placeholder="Enter 10-digit mobile number"
              />
            </div>

            <button
              type="button"
              className={styles["exact-primary"]}
              onClick={sendOtp}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className={styles["spin"]} />
                  Sending...
                </>
              ) : (
                "Send OTP"
              )}
            </button>

            <div className={styles["exact-secure-note"]}>
              <ShieldCheck size={17} />
              Your number is used only for verification and your sell request.
            </div>
          </div>
        )}

        {questionnaire && step === "OTP" && (
          <div className={styles["exact-auth-body"]}>
            <div className={styles["exact-lock-circle"]}>
              <LockKeyhole size={24} />
            </div>

            <h2>Verify OTP</h2>
            <p>
              Enter the 6-digit OTP sent to +91 {phone.slice(0, 2)}
              ******{phone.slice(-2)}
            </p>

            <input
              className={styles["exact-otp-input"]}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••••"
            />

            {devOtp && (
              <div className={styles["exact-dev-otp"]}>
                Local development OTP: <strong>{devOtp}</strong>
              </div>
            )}

            <button
              type="button"
              className={styles["exact-primary"]}
              onClick={verifyOtp}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              className={styles["exact-secondary-link"]}
              onClick={sendOtp}
              disabled={loading}
            >
              Resend OTP
            </button>
          </div>
        )}

        {questionnaire && step === "RESULT" && quote && (
          <div className={styles["exact-result-body"]}>
            <div className={styles["exact-success-icon"]}>
              <CheckCircle2 size={32} />
            </div>

            <span className={styles["exact-result-label"]}>Your Exact Value</span>
            <strong className={styles["exact-final-price"]}>
              {formatPrice(quote.finalPrice)}
            </strong>

            <div className={styles["exact-result-breakdown"]}>
              <div>
                <span>Base Value</span>
                <strong>{formatPrice(quote.basePrice)}</strong>
              </div>

              <div>
                <span>Condition Adjustment</span>
                <strong>-{formatPrice(quote.totalDeduction)}</strong>
              </div>

              <div className={styles["final"]}>
                <span>Final Value</span>
                <strong>{formatPrice(quote.finalPrice)}</strong>
              </div>
            </div>

            <button type="button" className={styles["exact-primary"]}>
              Continue to Pickup
            </button>

            <p className={styles["exact-result-note"]}>
              Final pickup value may be revalidated during physical inspection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
