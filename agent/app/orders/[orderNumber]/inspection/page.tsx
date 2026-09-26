"use client";

import { use, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import AgentSidebar from "@/components/agent-sidebar";
import {
  ApiError,
  completeAgentInspection,
  getAgentInspection,
  type AgentInspectionAnswer,
  type AgentInspectionQuestion,
  type AgentInspectionResponse,
} from "@/lib/agent-api";
import "./inspection.css";

type PageProps = { params: Promise<{ orderNumber: string }> };
type AnswerMap = Record<number, number[]>;
type ChildModal = { questionId: number; parentOptionId: number } | null;

function buildAnswerMap(answers: AgentInspectionAnswer[]): AnswerMap {
  return Object.fromEntries(
    answers.map((answer) => [answer.questionId, [...answer.optionIds]]),
  );
}
function selectedIds(answers: AnswerMap) {
  return new Set(Object.values(answers).flat());
}
function visible(question: AgentInspectionQuestion, selected: Set<number>) {
  return (
    question.dependsOnOptionIds.length === 0 ||
    question.dependsOnOptionIds.some((id) => selected.has(id))
  );
}
function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || error instanceof Error)
    return error.message || fallback;
  return fallback;
}
function cleanHiddenAnswers(
  source: AnswerMap,
  questionnaire: AgentInspectionQuestion[],
): AnswerMap {
  let result = { ...source };
  for (let pass = 0; pass < questionnaire.length; pass += 1) {
    const selected = selectedIds(result);
    let changed = false;
    for (const question of questionnaire) {
      if (!visible(question, selected) && result[question.id]) {
        delete result[question.id];
        changed = true;
      }
    }
    if (!changed) break;
    result = { ...result };
  }
  return result;
}

export default function AgentInspectionPage({ params }: PageProps) {
  const { orderNumber } = use(params);
  const router = useRouter();
  const [inspection, setInspection] = useState<AgentInspectionResponse | null>(
    null,
  );
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [childModal, setChildModal] = useState<ChildModal>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAgentInspection(orderNumber)
      .then((response) => {
        if (cancelled) return;
        if (
          response.inspection.status === "COMPLETED" &&
          response.inspection.quote
        ) {
          router.replace(`/orders/${encodeURIComponent(orderNumber)}/quote`);
          return;
        }
        setInspection(response);
        setAnswers(buildAnswerMap(response.inspection.answers));
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(errorMessage(err, "Unable to load inspection."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderNumber, router]);

  const selected = useMemo(() => selectedIds(answers), [answers]);
  const visibleQuestions = useMemo(
    () => (inspection?.questionnaire ?? []).filter((q) => visible(q, selected)),
    [inspection, selected],
  );
  const questionNumber = useMemo(
    () => new Map(visibleQuestions.map((q, index) => [q.id, index + 1])),
    [visibleQuestions],
  );
  const sections = useMemo(() => {
    const map = new Map<
      number,
      {
        id: number;
        name: string;
        displayOrder: number;
        questions: AgentInspectionQuestion[];
      }
    >();
    for (const question of visibleQuestions) {
      const found = map.get(question.section.id);
      if (found) found.questions.push(question);
      else
        map.set(question.section.id, {
          id: question.section.id,
          name: question.section.name,
          displayOrder: question.section.displayOrder,
          questions: [question],
        });
    }
    return [...map.values()].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [visibleQuestions]);

  const answered = visibleQuestions.filter((q) =>
    (answers[q.id] ?? []).some((id) => q.options.some((o) => o.id === id)),
  ).length;
  const progress = visibleQuestions.length
    ? Math.round((answered / visibleQuestions.length) * 100)
    : 0;

  const modalQuestion = childModal
    ? (inspection?.questionnaire.find((q) => q.id === childModal.questionId) ??
      null)
    : null;
  const modalParent =
    childModal && modalQuestion
      ? (modalQuestion.options.find(
          (o) => o.id === childModal.parentOptionId,
        ) ?? null)
      : null;

  function openChildDetails(
    question: AgentInspectionQuestion,
    optionId: number,
  ) {
    const option = question.options.find((item) => item.id === optionId);
    if (!option || option.childOptions.length === 0) return;
    setError("");
    setChildModal({ questionId: question.id, parentOptionId: optionId });
  }

  function chooseRoot(question: AgentInspectionQuestion, optionId: number) {
    setError("");
    setSaveMessage("");
    const option = question.options.find((item) => item.id === optionId);
    setAnswers((current) => {
      const existing = current[question.id] ?? [];
      let next: number[];
      if (question.answerType !== "MULTI_SELECT") {
        const allChildIds = new Set(
          question.options.flatMap((item) =>
            item.childOptions.map((child) => child.id),
          ),
        );
        next = [
          optionId,
          ...existing.filter((id) => !allChildIds.has(id) && id === optionId),
        ];
      } else if (existing.includes(optionId)) {
        const children = new Set(
          option?.childOptions.map((child) => child.id) ?? [],
        );
        next = existing.filter((id) => id !== optionId && !children.has(id));
      } else {
        next = [...existing, optionId];
      }
      return cleanHiddenAnswers(
        { ...current, [question.id]: [...new Set(next)] },
        inspection?.questionnaire ?? [],
      );
    });
    if (option && option.childOptions.length > 0) {
      setChildModal({ questionId: question.id, parentOptionId: option.id });
    } else {
      setChildModal(null);
    }
  }

  function toggleChild(childId: number) {
    if (!modalQuestion || !modalParent) return;
    setSaveMessage("");
    setAnswers((current) => {
      const existing = current[modalQuestion.id] ?? [];
      const siblingIds = new Set(
        modalParent.childOptions.map((child) => child.id),
      );
      let next = existing.includes(modalParent.id)
        ? [...existing]
        : [...existing, modalParent.id];
      if (modalParent.childSelectionMode === "SINGLE") {
        next = next.filter((id) => !siblingIds.has(id));
        next.push(childId);
      } else if (next.includes(childId)) {
        next = next.filter((id) => id !== childId);
      } else {
        next.push(childId);
      }
      return { ...current, [modalQuestion.id]: [...new Set(next)] };
    });
  }

  function closeChildModal() {
    if (!modalQuestion || !modalParent) {
      setChildModal(null);
      return;
    }
    const count = modalParent.childOptions.filter((child) =>
      (answers[modalQuestion.id] ?? []).includes(child.id),
    ).length;
    const min = modalParent.requireChildSelection
      ? Math.max(1, modalParent.minChildSelections)
      : modalParent.minChildSelections;

    if (count < min) {
      setError(
        `Select at least ${min} issue detail${min === 1 ? "" : "s"} for “${modalParent.label}”.`,
      );
      return;
    }
    if (
      modalParent.maxChildSelections !== null &&
      count > modalParent.maxChildSelections
    ) {
      setError(
        `Select maximum ${modalParent.maxChildSelections} issue details for “${modalParent.label}”.`,
      );
      return;
    }
    setError("");
    setChildModal(null);
  }

  function payload(): AgentInspectionAnswer[] {
    return visibleQuestions
      .map((question) => ({
        questionId: question.id,
        optionIds: answers[question.id] ?? [],
      }))
      .filter((answer) => answer.optionIds.length > 0);
  }

  function validateBeforeComplete() {
    for (const question of visibleQuestions) {
      const chosen = answers[question.id] ?? [];
      const rootIds = new Set(question.options.map((option) => option.id));
      const chosenRoots = chosen.filter((id) => rootIds.has(id));

      if (question.isRequired && chosenRoots.length === 0) {
        return `Please answer “${question.questionText}”.`;
      }

      for (const option of question.options) {
        if (!chosen.includes(option.id) || option.childOptions.length === 0)
          continue;
        const childCount = option.childOptions.filter((child) =>
          chosen.includes(child.id),
        ).length;
        const min = option.requireChildSelection
          ? Math.max(1, option.minChildSelections)
          : option.minChildSelections;

        if (childCount < min) {
          return `Select at least ${min} issue detail${min === 1 ? "" : "s"} for “${option.label}”.`;
        }
        if (
          option.maxChildSelections !== null &&
          childCount > option.maxChildSelections
        ) {
          return `Select maximum ${option.maxChildSelections} issue details for “${option.label}”.`;
        }
      }
    }
    return null;
  }

  async function completeInspection() {
    if (!inspection || completing) return;

    const validationError = validateBeforeComplete();
    if (validationError) {
      setError(validationError);
      setSaveMessage("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setCompleting(true);
    setError("");
    setSaveMessage("");

    try {
      await completeAgentInspection(orderNumber, payload());
      router.push(`/orders/${encodeURIComponent(orderNumber)}/quote`);
    } catch (err) {
      setError(errorMessage(err, "Unable to complete inspection."));
      window.scrollTo({ top: 0, behavior: "smooth" });
      setCompleting(false);
    }
  }

  if (loading)
    return (
      <div className="inspection-state-page">
        <div className="inspection-state-card">
          <div className="inspection-loader" />
          <strong>Loading inspection</strong>
          <span>Preparing device checks...</span>
        </div>
      </div>
    );
  if (error && !inspection)
    return (
      <div className="inspection-state-page">
        <div className="inspection-state-card">
          <div className="inspection-state-icon">!</div>
          <strong>Unable to open inspection</strong>
          <span>{error}</span>
          <button
            type="button"
            onClick={() =>
              router.replace(`/orders/${encodeURIComponent(orderNumber)}`)
            }
          >
            Back to Order
          </button>
        </div>
      </div>
    );
  if (!inspection) return null;

  return (
    <div className="inspection-shell">
      <AgentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="inspection-main">
        <header className="inspection-mobile-topbar">
          <button
            type="button"
            className="inspection-menu"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div>
            <strong>Device Inspection</strong>
            <span>{inspection.orderNumber}</span>
          </div>
        </header>
        <div className="inspection-container">
          <header className="inspection-header">
            <button
              type="button"
              className="inspection-back"
              onClick={() =>
                router.push(`/orders/${encodeURIComponent(orderNumber)}`)
              }
              aria-label="Back to order"
            >
              ←
            </button>
            <div className="inspection-heading">
              <span className="inspection-eyebrow">Device inspection</span>
              <h1>{inspection.product.name}</h1>
              <p>{inspection.product.variant}</p>
            </div>
            <div className="inspection-order-number">
              {inspection.orderNumber}
            </div>
          </header>

          <section className="inspection-progress-card">
            <div className="inspection-progress-copy">
              <div>
                <strong>Inspection progress</strong>
                <span>
                  {answered} of {visibleQuestions.length} checks answered
                </span>
              </div>
              <b>{progress}%</b>
            </div>
            <div
              className="inspection-progress-track"
              aria-label={`Inspection ${progress}% complete`}
            >
              <div
                className="inspection-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>

          {error ? (
            <div
              className="inspection-alert inspection-alert-error"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          {saveMessage ? (
            <div
              className="inspection-alert inspection-alert-success"
              role="status"
            >
              {saveMessage}
            </div>
          ) : null}

          <div className="inspection-sections">
            {sections.map((section) => (
              <section key={section.id} className="inspection-section">
                <div className="inspection-section-heading">
                  <span>Inspection section</span>
                  <h2>{section.name}</h2>
                </div>
                <div className="inspection-question-list">
                  {section.questions.map((question) => {
                    const chosen = answers[question.id] ?? [];
                    return (
                      <article
                        key={question.id}
                        className="inspection-question"
                      >
                        <div className="inspection-question-title">
                          <span className="inspection-question-number">
                            {questionNumber.get(question.id)}
                          </span>
                          <div>
                            <h3>
                              {question.questionText}
                              {question.isRequired ? <em>*</em> : null}
                            </h3>
                          </div>
                        </div>
                        <div className="inspection-options">
                          {question.options.map((option) => {
                            const active = chosen.includes(option.id);
                            const childCount = option.childOptions.filter(
                              (child) => chosen.includes(child.id),
                            ).length;
                            return (
                              <div
                                key={option.id}
                                className={
                                  active
                                    ? "inspection-option-group inspection-option-group-active"
                                    : "inspection-option-group"
                                }
                              >
                                <button
                                  type="button"
                                  className={
                                    active
                                      ? "inspection-option inspection-option-selected"
                                      : "inspection-option"
                                  }
                                  onClick={() =>
                                    chooseRoot(question, option.id)
                                  }
                                  aria-pressed={active}
                                >
                                  <span className="inspection-option-control">
                                    <span />
                                  </span>
                                  <span className="inspection-option-label">
                                    {option.label}
                                  </span>
                                </button>
                                {active && option.childOptions.length > 0 ? (
                                  <button
                                    type="button"
                                    className="inspection-details-button"
                                    onClick={() =>
                                      openChildDetails(question, option.id)
                                    }
                                  >
                                    {childCount
                                      ? `${childCount} selected`
                                      : "Add details"}{" "}
                                    <span aria-hidden="true">›</span>
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="inspection-bottom-space" />
        </div>
        <footer className="inspection-action-bar">
          <div className="inspection-action-inner">
            <div className="inspection-save-state">
              {completing
                ? "Calculating secure final quote..."
                : "Your answers will be verified before the final quote is generated."}
            </div>
            <button
              type="button"
              className="inspection-save-button"
              disabled={completing || sections.length === 0}
              onClick={() => void completeInspection()}
            >
              {completing ? "Generating Quote..." : "Save & Continue"}
            </button>
          </div>
        </footer>
      </main>

      {childModal &&
      modalQuestion &&
      modalParent &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              className="inspection-modal-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeChildModal();
              }}
            >
              <section
                className="inspection-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="inspection-modal-title"
              >
                <div className="inspection-modal-head">
                  <div>
                    <span>Question {questionNumber.get(modalQuestion.id)}</span>
                    <h2 id="inspection-modal-title">
                      {modalParent.childPrompt || `${modalParent.label} issue`}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeChildModal}
                    aria-label="Close details"
                  >
                    ×
                  </button>
                </div>
                <p className="inspection-modal-help">
                  Choose all options that apply to the device condition.
                </p>
                <div className="inspection-modal-options">
                  {modalParent.childOptions.map((child) => {
                    const active = (answers[modalQuestion.id] ?? []).includes(
                      child.id,
                    );
                    return (
                      <button
                        key={child.id}
                        type="button"
                        className={
                          active
                            ? "inspection-modal-option inspection-modal-option-selected"
                            : "inspection-modal-option"
                        }
                        onClick={() => toggleChild(child.id)}
                        aria-pressed={active}
                      >
                        <span className="inspection-modal-check">✓</span>
                        <span className="inspection-modal-option-label">
                          {child.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="inspection-modal-footer">
                  <span>
                    {modalParent.childSelectionMode === "SINGLE"
                      ? "Choose one option"
                      : "Choose all that apply"}
                  </span>
                  <button type="button" onClick={closeChildModal}>
                    Continue
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
