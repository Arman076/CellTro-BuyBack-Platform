"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Wrench,
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

type IssueGroup = {
  id: number;
  name: string;
  displayOrder: number;
  childOptions: ChildOption[];
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
  issueGroups: IssueGroup[];
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
  optionId?: number;
  optionIds?: number[];
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
  const [questionnaire, setQuestionnaire] =
    useState<EffectiveResponse | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [step, setStep] =
    useState<"QUESTIONS" | "ISSUES" | "SUMMARY" | "PHONE" | "OTP" | "RESULT">(
      "QUESTIONS",
    );
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
    currentQuestion && currentAnswer?.optionId
      ? currentQuestion.options.find(
          (option) => option.id === currentAnswer.optionId,
        ) ?? null
      : null;

  const selectedMainOptionIds = new Set<number>(
    currentAnswer?.optionIds ??
      (currentAnswer?.optionId ? [currentAnswer.optionId] : []),
  );

  const groupedChildren =
    selectedOption?.issueGroups?.flatMap((group) => group.childOptions) ?? [];
  const flatChildren = selectedOption?.childOptions ?? [];
  const allChildren = [...groupedChildren, ...flatChildren];

  const progress = questions.length
    ? Math.round(((questionIndex + 1) / questions.length) * 100)
    : 0;

  const summaryRows = useMemo(() => {
    return questions
      .map((question) => {
        const answer = answers[question.id];
        if (!answer) return null;

        const selectedIds = new Set<number>(
          answer.optionIds ?? (answer.optionId ? [answer.optionId] : []),
        );
        const selectedOptions = question.options.filter((item) =>
          selectedIds.has(item.id),
        );
        if (!selectedOptions.length) return null;

        const childLabels: string[] = [];
        const selectedChildren = new Set(answer.childOptionIds || []);

        for (const option of selectedOptions) {
          for (const group of option.issueGroups || []) {
            for (const child of group.childOptions || []) {
              if (selectedChildren.has(child.id)) {
                childLabels.push(`${group.name}: ${child.label}`);
              }
            }
          }

          for (const child of option.childOptions || []) {
            if (selectedChildren.has(child.id)) {
              childLabels.push(child.label);
            }
          }
        }

        return {
          itemId: question.id,
          sectionName: question.section.name,
          questionName: question.name || question.questionText,
          answerLabel: selectedOptions.map((option) => option.label).join(", "),
          childLabels,
        };
      })
      .filter(Boolean) as Array<{
      itemId: number;
      sectionName: string;
      questionName: string;
      answerLabel: string;
      childLabels: string[];
    }>;
  }, [questions, answers]);

  const summaryBySection = useMemo(() => {
    const grouped = new Map<
      string,
      Array<(typeof summaryRows)[number]>
    >();

    for (const row of summaryRows) {
      const current = grouped.get(row.sectionName) || [];
      current.push(row);
      grouped.set(row.sectionName, current);
    }

    return [...grouped.entries()];
  }, [summaryRows]);

  const childSelectionValid = useMemo(() => {
    if (!selectedOption?.showChildOptions) return true;

    const count = currentAnswer?.childOptionIds.length ?? 0;
    const minimum = selectedOption.requireChildSelection
      ? Math.max(1, selectedOption.minChildSelections || 1)
      : selectedOption.minChildSelections || 0;

    if (count < minimum) return false;
    if (
      selectedOption.maxChildSelections &&
      count > selectedOption.maxChildSelections
    ) {
      return false;
    }
    return true;
  }, [selectedOption, currentAnswer]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    setError("");
    setLoading(true);

    apiJson(
      `${API}/questionnaire/effective?productId=${productId}&variantId=${variantId}&audience=CUSTOMER`,
    )
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
        setError(
          e instanceof Error ? e.message : "Unable to load questionnaire",
        ),
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

    if (currentQuestion.answerType === "MULTI_SELECT") {
      setAnswers((current) => {
        const existing = current[currentQuestion.id];
        const currentIds = new Set<number>(
          existing?.optionIds ?? (existing?.optionId ? [existing.optionId] : []),
        );

        if (currentIds.has(option.id)) {
          currentIds.delete(option.id);
        } else {
          currentIds.add(option.id);
        }

        return {
          ...current,
          [currentQuestion.id]: {
            itemId: currentQuestion.id,
            optionIds: [...currentIds],
            childOptionIds: [],
          },
        };
      });
      return;
    }

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: {
        itemId: currentQuestion.id,
        optionId: option.id,
        optionIds: [option.id],
        childOptionIds: [],
      },
    }));

    const hasDetails =
      option.showChildOptions &&
      ((option.issueGroups?.some((g) => g.childOptions.length > 0) ?? false) ||
        option.childOptions.length > 0);

    if (hasDetails) {
      setStep("ISSUES");
    }
  }

  function toggleChild(childId: number) {
    if (!currentQuestion || !currentAnswer || !selectedOption) return;

    const currentIds = currentAnswer.childOptionIds;
    let nextIds: number[];

    if (selectedOption.childSelectionMode === "SINGLE") {
      nextIds = currentIds.includes(childId) ? [] : [childId];
    } else {
      nextIds = currentIds.includes(childId)
        ? currentIds.filter((id) => id !== childId)
        : [...currentIds, childId];
    }

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: {
        ...currentAnswer,
        childOptionIds: nextIds,
      },
    }));
  }

  function advanceQuestion() {
    setError("");

    if (!currentAnswer) {
      setError("Please select an answer.");
      return;
    }

    if (
      currentQuestion?.answerType === "MULTI_SELECT" &&
      currentQuestion.isRequired &&
      (currentAnswer.optionIds?.length ?? 0) === 0
    ) {
      setError("Please select at least one answer.");
      return;
    }

    if (selectedOption?.showChildOptions && !childSelectionValid) {
      setStep("ISSUES");
      setError("Please select the required issue before proceeding.");
      return;
    }

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((current) => current + 1);
      setStep("QUESTIONS");
      return;
    }

    setStep("SUMMARY");
  }

  function proceedIssues() {
    if (!childSelectionValid) {
      setError("Please select at least one applicable issue.");
      return;
    }

    advanceQuestion();
  }

  function goBack() {
    setError("");

    if (step === "ISSUES") {
      setStep("QUESTIONS");
      return;
    }

    if (step === "QUESTIONS") {
      if (questionIndex > 0) {
        setQuestionIndex((current) => current - 1);
      }
      return;
    }

    if (step === "SUMMARY") {
      setStep("QUESTIONS");
      setQuestionIndex(Math.max(0, questions.length - 1));
      return;
    }

    if (step === "PHONE") {
      setStep("SUMMARY");
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

      const response = await apiJson(
        `${API}/questionnaire/quote/verify-otp`,
        {
          method: "POST",
          body: JSON.stringify({ sessionId, otp }),
        },
      );

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
      aria-label="Get exact device value"
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
            aria-label="Back"
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

          <button
            type="button"
            className={styles["exact-icon-btn"]}
            onClick={closeModal}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {loading && !questionnaire && (
          <div className={styles["exact-loading"]}>
            <Loader2 className={styles.spin} size={28} />
            <span>Loading device questions...</span>
          </div>
        )}

        {error && <div className={styles["exact-error"]}>{error}</div>}

        {questionnaire && step === "QUESTIONS" && currentQuestion && (
          <>
            <div className={styles["exact-progress-wrap"]}>
              <div className={styles["exact-progress-meta"]}>
                <span>{currentQuestion.section.name}</span>
                <strong>
                  {questionIndex + 1} / {questions.length}
                </strong>
              </div>

              <div className={styles["exact-progress-track"]}>
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className={styles["exact-question-body"]}>
              <span className={styles["exact-section-name"]}>
                {currentQuestion.section.name}
              </span>

              <h2>{currentQuestion.questionText}</h2>

              <div className={styles["exact-main-options"]}>
                {currentQuestion.options.map((option) => {
                  const selected = selectedMainOptionIds.has(option.id);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`${styles["exact-main-option"]} ${
                        selected ? styles.active : ""
                      }`}
                      onClick={() => selectMainOption(option)}
                    >
                      {selected ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <span
                          className={
                            currentQuestion.answerType === "MULTI_SELECT"
                              ? styles["exact-checkbox"]
                              : styles["exact-radio"]
                          }
                        />
                      )}
                      <strong>{option.label}</strong>
                    </button>
                  );
                })}
              </div>

              {currentAnswer &&
                (currentQuestion.answerType === "MULTI_SELECT" ||
                  !selectedOption?.showChildOptions ||
                  allChildren.length === 0) && (
                  <button
                    type="button"
                    className={styles["exact-primary"]}
                    onClick={advanceQuestion}
                  >
                    {questionIndex === questions.length - 1
                      ? "Continue"
                      : "Next Question"}
                  </button>
                )}
            </div>
          </>
        )}

        {questionnaire && step === "ISSUES" && currentQuestion && selectedOption && (
          <div className={styles["issue-screen"]}>
            <div className={styles["issue-heading"]}>
              <span className={styles["issue-kicker"]}>
                {currentQuestion.section.name}
              </span>
              <h2>{selectedOption.childPrompt || "Select Issues"}</h2>
              <p>Choose all issues that apply to your device.</p>
            </div>

            <div className={styles["issue-scroll"]}>
              {selectedOption.issueGroups.map((group) => (
                <section key={group.id} className={styles["issue-group"]}>
                  <h3>{group.name}</h3>

                  <div className={styles["issue-grid"]}>
                    {group.childOptions.map((child) => {
                      const checked =
                        currentAnswer?.childOptionIds.includes(child.id) ?? false;

                      return (
                        <button
                          key={child.id}
                          type="button"
                          className={`${styles["issue-card"]} ${
                            checked ? styles["issue-card-active"] : ""
                          }`}
                          onClick={() => toggleChild(child.id)}
                        >
                          <span className={styles["issue-check"]}>
                            {checked ? "✓" : ""}
                          </span>
                          <span className={styles["issue-icon"]}>
                            <Wrench size={30} strokeWidth={1.5} />
                          </span>
                          <strong>{child.label}</strong>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              {selectedOption.childOptions.length > 0 && (
                <section className={styles["issue-group"]}>
                  <h3>{selectedOption.childPrompt || "Issues"}</h3>
                  <div className={styles["issue-grid"]}>
                    {selectedOption.childOptions.map((child) => {
                      const checked =
                        currentAnswer?.childOptionIds.includes(child.id) ?? false;

                      return (
                        <button
                          key={child.id}
                          type="button"
                          className={`${styles["issue-card"]} ${
                            checked ? styles["issue-card-active"] : ""
                          }`}
                          onClick={() => toggleChild(child.id)}
                        >
                          <span className={styles["issue-check"]}>
                            {checked ? "✓" : ""}
                          </span>
                          <span className={styles["issue-icon"]}>
                            <Wrench size={30} strokeWidth={1.5} />
                          </span>
                          <strong>{child.label}</strong>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            <div className={styles["issue-footer"]}>
              <button
                type="button"
                className={styles["exact-primary"]}
                onClick={proceedIssues}
                disabled={!childSelectionValid}
              >
                Proceed
              </button>
            </div>
          </div>
        )}

        {questionnaire && step === "SUMMARY" && (
          <div className={styles["summary-body"]}>
            <div className={styles["summary-kicker"]}>DEVICE EVALUATION</div>
            <h2>Review your answers</h2>
            <p className={styles["summary-intro"]}>
              Please confirm the device condition before mobile verification.
            </p>

            <div className={styles["summary-card"]}>
              {summaryBySection.map(([sectionName, rows]) => (
                <section key={sectionName} className={styles["summary-section"]}>
                  <h3>{sectionName}</h3>
                  <div className={styles["summary-list"]}>
                    {rows.map((row) => (
                      <div key={row.itemId} className={styles["summary-row"]}>
                        <span className={styles["summary-dot"]}>•</span>
                        <div>
                          <strong>{row.questionName}:</strong>{" "}
                          <span>{row.answerLabel}</span>
                          {row.childLabels.length > 0 && (
                            <ul className={styles["summary-children"]}>
                              {row.childLabels.map((label) => (
                                <li key={label}>{label}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className={styles["summary-price"]}>
              <span>Selected Variant Base Price</span>
              <strong>{formatPrice(basePrice)}</strong>
            </div>

            <button
              type="button"
              className={styles["exact-primary"]}
              onClick={() => setStep("PHONE")}
            >
              Confirm & Continue
            </button>
          </div>
        )}

        {questionnaire && step === "PHONE" && (
          <div className={styles["exact-auth-body"]}>
            <div className={styles["exact-lock-circle"]}>
              <LockKeyhole size={24} />
            </div>
            <h2>Unlock your exact price</h2>
            <p>Verify your mobile number to view the final device value.</p>

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
              {loading ? "Sending..." : "Send OTP"}
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
              <div className={styles.final}>
                <span>Final Value</span>
                <strong>{formatPrice(quote.finalPrice)}</strong>
              </div>
            </div>

            <details className={styles["result-summary"]}>
              <summary>View condition summary</summary>
              <div className={styles["result-summary-content"]}>
                {summaryRows.map((row) => (
                  <div key={row.itemId}>
                    <strong>{row.questionName}</strong>
                    <span>{row.answerLabel}</span>
                    {row.childLabels.length > 0 && (
                      <small>{row.childLabels.join(", ")}</small>
                    )}
                  </div>
                ))}
              </div>
            </details>

            <button type="button" className={styles["exact-primary"]}>
              Continue to Pickup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
