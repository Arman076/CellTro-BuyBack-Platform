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
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

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


type IssueVisualKind =
  | "SCREEN_SCRATCH"
  | "SCREEN_CRACK"
  | "SCREEN_FAULT"
  | "SCREEN_UNUSABLE"
  | "CHARGER"
  | "CABLE"
  | "BOX"
  | "INVOICE"
  | "STYLUS"
  | "EARPHONES"
  | "BATTERY"
  | "CAMERA"
  | "MIC"
  | "SPEAKER"
  | "WIRELESS"
  | "FACE"
  | "FINGERPRINT"
  | "KEYBOARD"
  | "TRACKPAD"
  | "HINGE"
  | "BODY"
  | "PORT"
  | "BUTTON"
  | "GENERIC";

function getIssueVisualKind(
  label: string,
  issueCode?: string | null,
  groupName?: string | null,
): IssueVisualKind {
  const text = `${issueCode || ""} ${label} ${groupName || ""}`.toUpperCase();

  if (text.includes("SCRATCH") && text.includes("SCREEN")) return "SCREEN_SCRATCH";
  if (text.includes("CRACK") && text.includes("SCREEN")) return "SCREEN_CRACK";

  if (
    text.includes("FAULTY SCREEN") ||
    text.includes("GREEN LINE") ||
    text.includes("DISPLAY LINE") ||
    text.includes("DEAD PIXEL") ||
    text.includes("PIXEL") ||
    text.includes("SPOT")
  ) {
    return "SCREEN_FAULT";
  }

  if (
    text.includes("SCREEN NOT USABLE") ||
    text.includes("BLACK SCREEN") ||
    text.includes("DISPLAY DEAD") ||
    text.includes("SCREEN DEAD")
  ) {
    return "SCREEN_UNUSABLE";
  }

  if (
    text.includes("CHARGER") ||
    text.includes("ADAPTER") ||
    text.includes("POWER BRICK")
  ) {
    return "CHARGER";
  }

  if (
    text.includes("CABLE") ||
    text.includes("LIGHTNING") ||
    text.includes("TYPE C") ||
    text.includes("TYPE-C")
  ) {
    return "CABLE";
  }

  if (text.includes("BOX") || text.includes("PACKAGING")) return "BOX";

  if (
    text.includes("BILL") ||
    text.includes("INVOICE") ||
    text.includes("RECEIPT")
  ) {
    return "INVOICE";
  }

  if (
    text.includes("S PEN") ||
    text.includes("SPEN") ||
    text.includes("STYLUS") ||
    text.includes("APPLE PENCIL")
  ) {
    return "STYLUS";
  }

  if (
    text.includes("EARPHONE") ||
    text.includes("HEADPHONE") ||
    text.includes("EARBUD")
  ) {
    return "EARPHONES";
  }

  if (text.includes("BATTERY")) return "BATTERY";
  if (text.includes("CAMERA") || text.includes("WEBCAM")) return "CAMERA";
  if (text.includes("MIC") || text.includes("MICROPHONE")) return "MIC";

  if (
    text.includes("SPEAKER") ||
    text.includes("AUDIO") ||
    text.includes("SOUND")
  ) {
    return "SPEAKER";
  }

  if (
    text.includes("WIFI") ||
    text.includes("WI-FI") ||
    text.includes("BLUETOOTH") ||
    text.includes("NETWORK")
  ) {
    return "WIRELESS";
  }

  if (
    text.includes("FACE ID") ||
    text.includes("FACEID") ||
    text.includes("FACE UNLOCK")
  ) {
    return "FACE";
  }

  if (
    text.includes("FINGERPRINT") ||
    text.includes("TOUCH ID") ||
    text.includes("TOUCHID")
  ) {
    return "FINGERPRINT";
  }

  if (text.includes("KEYBOARD")) return "KEYBOARD";

  if (
    text.includes("TRACKPAD") ||
    text.includes("TOUCHPAD")
  ) {
    return "TRACKPAD";
  }

  if (text.includes("HINGE")) return "HINGE";

  if (
    text.includes("BODY") ||
    text.includes("BACK PANEL") ||
    text.includes("DENT") ||
    text.includes("FRAME")
  ) {
    return "BODY";
  }

  if (
    text.includes("PORT") ||
    text.includes("USB") ||
    text.includes("CHARGING SOCKET")
  ) {
    return "PORT";
  }

  if (
    text.includes("BUTTON") ||
    text.includes("POWER KEY") ||
    text.includes("VOLUME KEY")
  ) {
    return "BUTTON";
  }

  return "GENERIC";
}

function IssueVisualIcon({ kind }: { kind: IssueVisualKind }) {
  const common = {
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (kind) {
    case "SCREEN_SCRATCH":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="19" y="7" width="26" height="50" rx="6" />
          <line x1="27" y1="25" x2="35" y2="17" />
          <line x1="29" y1="35" x2="39" y2="25" />
          <line x1="25" y1="42" x2="31" y2="36" />
        </svg>
      );

    case "SCREEN_CRACK":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="19" y="7" width="26" height="50" rx="6" />
          <path d="M34 15l-5 10 6 4-5 8 7 7" />
          <path d="M29 25l-5-3M35 29l6-4M30 37l-5 5" />
        </svg>
      );

    case "SCREEN_FAULT":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="19" y="7" width="26" height="50" rx="6" />
          <line x1="24" y1="11" x2="24" y2="53" />
          <circle cx="35" cy="33" r="2" fill="currentColor" stroke="none" />
        </svg>
      );

    case "SCREEN_UNUSABLE":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="19" y="7" width="26" height="50" rx="6" />
          <circle cx="32" cy="32" r="10" />
          <line x1="24" y1="24" x2="40" y2="40" />
        </svg>
      );

    case "CHARGER":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="20" y="18" width="24" height="25" rx="5" />
          <line x1="26" y1="13" x2="26" y2="18" />
          <line x1="38" y1="13" x2="38" y2="18" />
          <path d="M32 43v6c0 4 3 7 7 7h5" />
          <path d="M34 24l-5 8h5l-4 7" />
        </svg>
      );

    case "CABLE":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="11" y="17" width="10" height="10" rx="2" />
          <line x1="14" y1="14" x2="14" y2="17" />
          <line x1="18" y1="14" x2="18" y2="17" />
          <path d="M21 22c18 0 4 23 22 23" />
          <rect x="43" y="40" width="10" height="10" rx="2" />
          <line x1="46" y1="50" x2="46" y2="54" />
          <line x1="50" y1="50" x2="50" y2="54" />
        </svg>
      );

    case "BOX":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <path d="M12 22l20-10 20 10-20 10-20-10z" />
          <path d="M12 22v23l20 10 20-10V22" />
          <path d="M32 32v23" />
        </svg>
      );

    case "INVOICE":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <path d="M19 8h20l8 8v40H19z" />
          <path d="M39 8v10h8" />
          <line x1="25" y1="29" x2="41" y2="29" />
          <line x1="25" y1="36" x2="41" y2="36" />
          <line x1="25" y1="43" x2="36" y2="43" />
        </svg>
      );

    case "STYLUS":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <path d="M17 47l4-13L43 12l9 9-22 22-13 4z" />
          <path d="M21 34l9 9M39 16l9 9" />
          <path d="M17 47l9-4-5-5-4 9z" />
        </svg>
      );

    case "EARPHONES":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <path d="M14 34v-6a18 18 0 0136 0v6" />
          <rect x="10" y="31" width="10" height="16" rx="4" />
          <rect x="44" y="31" width="10" height="16" rx="4" />
          <path d="M49 47c0 6-5 9-11 9h-4" />
        </svg>
      );

    case "BATTERY":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="11" y="21" width="39" height="24" rx="4" />
          <path d="M50 28h4v10h-4" />
          <path d="M32 25l-6 9h6l-4 7 10-11h-6z" />
        </svg>
      );

    case "CAMERA":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <path d="M14 22h10l4-6h9l4 6h9v28H14z" />
          <circle cx="32" cy="36" r="9" />
          <circle cx="47" cy="27" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );

    case "MIC":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="25" y="10" width="14" height="28" rx="7" />
          <path d="M18 31a14 14 0 0028 0" />
          <line x1="32" y1="45" x2="32" y2="55" />
          <line x1="24" y1="55" x2="40" y2="55" />
        </svg>
      );

    case "SPEAKER":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="18" y="8" width="28" height="48" rx="5" />
          <circle cx="32" cy="24" r="6" />
          <circle cx="32" cy="42" r="9" />
        </svg>
      );

    case "WIRELESS":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <path d="M12 25a29 29 0 0140 0" />
          <path d="M19 33a19 19 0 0126 0" />
          <path d="M26 41a9 9 0 0112 0" />
          <circle cx="32" cy="49" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );

    case "FACE":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <path d="M15 24v-8h8M41 16h8v8M49 40v8h-8M23 48h-8v-8" />
          <circle cx="27" cy="31" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="37" cy="31" r="1.5" fill="currentColor" stroke="none" />
          <path d="M26 39c4 3 8 3 12 0" />
        </svg>
      );

    case "FINGERPRINT":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <path d="M20 42c0-16 4-25 12-25 8 0 12 9 12 25" />
          <path d="M25 45c0-13 2-21 7-21s7 8 7 21" />
          <path d="M30 47c0-9 0-15 2-15s2 6 2 15" />
          <path d="M17 32c1-14 6-22 15-22 10 0 15 9 16 24" />
        </svg>
      );

    case "KEYBOARD":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="9" y="18" width="46" height="29" rx="4" />
          <path d="M15 25h4M23 25h4M31 25h4M39 25h4M47 25h2" />
          <path d="M15 32h4M23 32h4M31 32h4M39 32h4M47 32h2" />
          <path d="M17 39h30" />
        </svg>
      );

    case "TRACKPAD":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="11" y="14" width="42" height="36" rx="5" />
          <rect x="20" y="23" width="24" height="18" rx="3" />
          <line x1="20" y1="44" x2="44" y2="44" />
        </svg>
      );

    case "HINGE":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <path d="M12 19h38v23H12z" />
          <path d="M8 47h48" />
          <circle cx="32" cy="45" r="3" />
          <path d="M32 42v-6" />
        </svg>
      );

    case "BODY":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="20" y="7" width="24" height="50" rx="6" />
          <path d="M39 21c-5 2-7 5-5 10 2 4 0 8-4 11" />
          <circle cx="38" cy="16" r="2" />
        </svg>
      );

    case "PORT":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="12" y="14" width="40" height="36" rx="6" />
          <rect x="23" y="27" width="18" height="10" rx="3" />
          <line x1="28" y1="32" x2="36" y2="32" />
        </svg>
      );

    case "BUTTON":
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <rect x="20" y="7" width="24" height="50" rx="6" />
          <line x1="44" y1="19" x2="48" y2="19" />
          <line x1="44" y1="27" x2="48" y2="27" />
          <line x1="16" y1="22" x2="20" y2="22" />
        </svg>
      );

    default:
      return (
        <svg {...common} className={styles["issue-visual-svg"]}>
          <circle cx="32" cy="32" r="20" />
          <path d="M25 39l14-14M27 23l4 4M37 37l4 4" />
          <circle cx="24" cy="40" r="3" />
          <circle cx="40" cy="24" r="3" />
        </svg>
      );
  }
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
  const router = useRouter();
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
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const sourceAnchorRef = useRef<HTMLSpanElement | null>(null);

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

  }, [open, productId, variantId]);

  useEffect(() => {
    if (!open) {
      setPortalTarget(null);
      return;
    }

    const host = document.createElement("div");
    host.className = styles["questionnaire-page-host"];
    host.setAttribute("data-celltro-questionnaire-host", "true");

    const footer =
      document.querySelector(".customer-footer") ??
      document.querySelector("footer");

    if (footer?.parentNode) {
      footer.parentNode.insertBefore(host, footer);
    } else {
      document.body.appendChild(host);
    }

    const sourceMain =
      (sourceAnchorRef.current?.closest("main") as HTMLElement | null) ?? null;

    if (sourceMain) {
      sourceMain.classList.add(styles["questionnaire-source-hidden"]);
    }

    setPortalTarget(host);
    window.scrollTo({ top: 0, behavior: "smooth" });

    return () => {
      if (sourceMain) {
        sourceMain.classList.remove(styles["questionnaire-source-hidden"]);
      }
      host.remove();
      setPortalTarget(null);
    };
  }, [open]);

  useEffect(() => {
    if (!open || step !== "QUESTIONS" || !currentQuestion) return;

    const timer = window.setTimeout(() => {
      document
        .getElementById(`question-${currentQuestion.id}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 170);

    return () => window.clearTimeout(timer);
  }, [open, step, questionIndex, currentQuestion]);

  function closeModal() {
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

    // IMPORTANT:
    // This is the same trigger that worked in the original questionnaire.
    // If admin configured child issues under this answer, open ISSUES step.
    const hasDetails =
      option.showChildOptions &&
      ((option.issueGroups?.some(
        (group) => group.childOptions.length > 0,
      ) ?? false) ||
        option.childOptions.length > 0);

    if (hasDetails) {
      setStep("ISSUES");
      return;
    }

    // No dependent child options -> activate next main question automatically.
    window.setTimeout(() => {
      if (questionIndex < questions.length - 1) {
        setQuestionIndex((current) => current + 1);
        setStep("QUESTIONS");
        return;
      }

      setStep("SUMMARY");
    }, 130);
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
      setError("");
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

  function continueToPickup() {
    if (!quote) {
      setError("Unable to continue. Please calculate the final value again.");
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, "");

    // Keep the already verified customer + quote available for the pickup flow.
    // No second OTP is required on the address page.
    sessionStorage.setItem("verifiedCustomerPhone", normalizedPhone);
    sessionStorage.setItem(
      "sellQuote",
      JSON.stringify({
        productId,
        productName,
        productImage,
        variantId,
        variantLabel,
        basePrice: quote.basePrice,
        totalDeduction: quote.totalDeduction,
        finalPrice: quote.finalPrice,
      }),
    );

    router.push("/sell/pickup");
  }

  if (!open) return null;

  const questionnairePage = (
    <section className={styles["questionnaire-page-shell"]}>
      <div className={styles["questionnaire-device-bar"]}>
        <div className={styles["questionnaire-device-inner"]}>
          <button
            type="button"
            className={styles["questionnaire-back"]}
            onClick={closeModal}
            aria-label="Back to device details"
          >
            <ArrowLeft size={19} />
          </button>

          <div className={styles["questionnaire-device"]}>
            {productImage ? (
              <img src={productImage} alt={productName} />
            ) : (
              <div className={styles["questionnaire-image-fallback"]}>DEVICE</div>
            )}

            <div>
              <span>Evaluating</span>
              <strong>{productName}</strong>
              <small>{variantLabel}</small>
            </div>
          </div>

          <button
            type="button"
            className={styles["questionnaire-close"]}
            onClick={closeModal}
            aria-label="Close questionnaire"
          >
            <X size={19} />
          </button>
        </div>
      </div>

      <div className={styles["questionnaire-content"]}>
        {loading && !questionnaire && (
          <div className={styles["questionnaire-loading"]}>
            <Loader2 className={styles.spin} size={28} />
            <span>Loading device questions...</span>
          </div>
        )}

        {error && <div className={styles["exact-error"]}>{error}</div>}

        {questionnaire && (step === "QUESTIONS" || step === "ISSUES" || step === "SUMMARY") && (
          <>
            <header className={styles["questionnaire-heading"]}>
              <span>DEVICE CONDITION</span>
              <h1>Tell us about your device</h1>
              <p>
                Answer the questions below to calculate the best available value.
              </p>

              <div className={styles["questionnaire-progress-meta"]}>
                <strong>
                  {Math.min(questionIndex + 1, questions.length)} of {questions.length}
                </strong>
                <span>{progress}% complete</span>
              </div>

              <div className={styles["exact-progress-track"]}>
                <span style={{ width: `${progress}%` }} />
              </div>
            </header>

            <div className={styles["question-list"]}>
              {questions.map((question, index) => {
                const answer = answers[question.id];
                const questionnaireComplete = step === "SUMMARY";
                const isCurrent =
                  !questionnaireComplete && index === questionIndex;
                const isPast =
                  questionnaireComplete || index < questionIndex;
                const isFuture =
                  !questionnaireComplete && index > questionIndex;

                const selectedIds = new Set<number>(
                  answer?.optionIds ??
                    (answer?.optionId ? [answer.optionId] : []),
                );

                const helperText =
                  question.name &&
                  question.name.trim().toLowerCase() !==
                    question.questionText.trim().toLowerCase()
                    ? question.name
                    : question.section.name;

                return (
                  <article
                    id={`question-${question.id}`}
                    key={question.id}
                    className={`${styles["question-card"]} ${
                      isCurrent ? styles["question-card-active"] : ""
                    } ${isPast ? styles["question-card-complete"] : ""} ${
                      isFuture ? styles["question-card-future"] : ""
                    }`}
                  >
                    <div className={styles["question-title-row"]}>
                      <span
                        className={`${styles["question-number"]} ${
                          isPast ? styles["question-number-done"] : ""
                        }`}
                      >
                        {isPast ? "✓" : index + 1}
                      </span>

                      <div className={styles["question-copy"]}>
                        <span className={styles["question-section"]}>
                          {question.section.name}
                        </span>
                        <h2>{question.questionText}</h2>
                        {helperText && <p>{helperText}</p>}
                      </div>

                      {isPast && (
                        <span className={styles["question-complete-label"]}>
                          Done
                        </span>
                      )}
                    </div>

                    <div className={styles["question-options"]}>
                      {question.options.map((option) => {
                        const selected = selectedIds.has(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={!isCurrent}
                            className={`${styles["question-option"]} ${
                              selected ? styles.active : ""
                            }`}
                            onClick={() => selectMainOption(option)}
                          >
                            {selected && (
                              <CheckCircle2
                                size={18}
                                className={styles["question-selected-icon"]}
                              />
                            )}
                            <strong>{option.label}</strong>
                          </button>
                        );
                      })}
                    </div>

                    {isCurrent &&
                      question.answerType === "MULTI_SELECT" &&
                      answer && (
                        <button
                          type="button"
                          className={styles["question-continue"]}
                          onClick={advanceQuestion}
                        >
                          Continue
                        </button>
                      )}
                  </article>
                );
              })}
            </div>

            {step === "SUMMARY" && (
              <div className={styles["best-price-simple"]}>
                <button
                  type="button"
                  className={styles["best-price-button"]}
                  onClick={() => {
                    setError("");
                    setStep("PHONE");
                  }}
                >
                  Get Best Price
                </button>
              </div>
            )}
          </>
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

            <button
              type="button"
              className={styles["exact-primary"]}
              onClick={continueToPickup}
            >
              Continue to Pickup
            </button>
          </div>
        )}
      </div>

      {questionnaire && step === "PHONE" && (
        <div className={styles["auth-stage"]}>
          <div
            className={styles["auth-dialog"]}
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlock-best-price"
          >
            <button
              type="button"
              className={styles["auth-close"]}
              onClick={() => {
                setError("");
                setStep("SUMMARY");
              }}
              aria-label="Close mobile verification"
            >
              <X size={20} />
            </button>

            <div className={styles["auth-product-card"]}>
              <div className={styles["auth-product-image"]}>
                {productImage ? (
                  <img src={productImage} alt={productName} />
                ) : (
                  <span>DEVICE</span>
                )}
              </div>

              <div>
                <strong>{productName}</strong>
                <span>{variantLabel}</span>
                <b>₹XX,XXX</b>
              </div>
            </div>

            <div className={styles["auth-title"]}>
              <LockKeyhole size={19} />
              <h2 id="unlock-best-price">Login to unlock best price</h2>
            </div>

            <p className={styles["auth-intro"]}>
              Enter your 10-digit mobile number
            </p>

            <label className={styles["exact-label"]}>Phone Number</label>

            <div className={styles["exact-phone-field"]}>
              <span>+91</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                placeholder="Enter mobile number"
              />
            </div>

            <p className={styles["auth-help"]}>
              We&apos;ll send you an OTP to confirm it&apos;s you.
            </p>

            <div className={styles["auth-consent"]}>
              <ShieldCheck size={17} />
              <span>
                By continuing, you agree to Celltro&apos;s Terms &amp;
                Conditions and Privacy Policy and consent to transaction
                updates related to your sell request.
              </span>
            </div>

            <button
              type="button"
              className={styles["exact-primary"]}
              onClick={sendOtp}
              disabled={loading || phone.length !== 10}
            >
              {loading ? "Sending OTP..." : "Continue"}
            </button>

            <div className={styles["auth-secure"]}>
              <LockKeyhole size={14} />
              Your data is secure with us
            </div>
          </div>
        </div>
      )}

      {questionnaire && step === "OTP" && (
        <div className={styles["auth-stage"]}>
          <div
            className={styles["auth-dialog"]}
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-otp-title"
          >
            <button
              type="button"
              className={styles["auth-close"]}
              onClick={() => {
                setError("");
                setOtp("");
                setStep("PHONE");
              }}
              aria-label="Close OTP verification"
            >
              <X size={20} />
            </button>

            <div className={styles["auth-product-card"]}>
              <div className={styles["auth-product-image"]}>
                {productImage ? (
                  <img src={productImage} alt={productName} />
                ) : (
                  <span>DEVICE</span>
                )}
              </div>

              <div>
                <strong>{productName}</strong>
                <span>{variantLabel}</span>
                <b>₹XX,XXX</b>
              </div>
            </div>

            <div className={styles["auth-title"]}>
              <LockKeyhole size={19} />
              <h2 id="verify-otp-title">Verify OTP</h2>
            </div>

            <p className={styles["auth-intro"]}>
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
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              className={styles["auth-back-link"]}
              onClick={() => {
                setStep("PHONE");
                setOtp("");
              }}
            >
              Change mobile number
            </button>

            <div className={styles["auth-secure"]}>
              <LockKeyhole size={14} />
              Your data is secure with us
            </div>
          </div>
        </div>
      )}

      {questionnaire &&
        step === "ISSUES" &&
        currentQuestion &&
        selectedOption && (
          <div
            className={styles["issue-dialog-backdrop"]}
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setError("");
                setStep("QUESTIONS");
              }
            }}
          >
            <div
              className={styles["issue-dialog"]}
              role="dialog"
              aria-modal="true"
              aria-labelledby="issue-dialog-title"
            >
              <button
                type="button"
                className={styles["issue-dialog-close"]}
                onClick={() => {
                  setError("");
                  setStep("QUESTIONS");
                }}
                aria-label="Close issue selection"
              >
                <X size={20} />
              </button>

              <div className={styles["issue-dialog-header"]}>
                <h2 id="issue-dialog-title">
                  {selectedOption.childPrompt ||
                    `${currentQuestion.section.name} Issues`}
                </h2>

                <p>
                  {selectedOption.childSelectionMode === "SINGLE"
                    ? `Choose one option that best describes your ${currentQuestion.section.name.toLowerCase()} condition.`
                    : `Choose all options that apply to your ${currentQuestion.section.name.toLowerCase()} condition.`}
                </p>
              </div>

              {error && (
                <div className={styles["issue-dialog-error"]}>
                  {error}
                </div>
              )}

              <div className={styles["issue-dialog-scroll"]}>
                {selectedOption.issueGroups.map((group) => (
                  <section
                    key={group.id}
                    className={styles["issue-dialog-group"]}
                  >
                    {selectedOption.issueGroups.length > 1 && (
                      <h3>{group.name}</h3>
                    )}

                    <div className={styles["issue-dialog-grid"]}>
                      {group.childOptions.map((child) => {
                        const checked =
                          currentAnswer?.childOptionIds.includes(child.id) ??
                          false;

                        const visualKind = getIssueVisualKind(
                          child.label,
                          child.issueCode,
                          group.name,
                        );

                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={`${styles["issue-dialog-card"]} ${
                              checked
                                ? styles["issue-dialog-card-active"]
                                : ""
                            }`}
                            onClick={() => toggleChild(child.id)}
                          >
                            <span
                              className={styles["issue-dialog-card-check"]}
                            >
                              {checked ? "✓" : ""}
                            </span>

                            <span
                              className={styles["issue-dialog-card-visual"]}
                              aria-hidden="true"
                            >
                              <IssueVisualIcon kind={visualKind} />
                            </span>

                            <strong>{child.label}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}

                {selectedOption.childOptions.length > 0 &&
                  selectedOption.issueGroups.length === 0 && (
                    <section className={styles["issue-dialog-group"]}>
                      <div className={styles["issue-dialog-grid"]}>
                        {selectedOption.childOptions.map((child) => {
                          const checked =
                            currentAnswer?.childOptionIds.includes(child.id) ??
                            false;

                          const visualKind = getIssueVisualKind(
                            child.label,
                            child.issueCode,
                            currentQuestion.section.name,
                          );

                          return (
                            <button
                              key={child.id}
                              type="button"
                              className={`${styles["issue-dialog-card"]} ${
                                checked
                                  ? styles["issue-dialog-card-active"]
                                  : ""
                              }`}
                              onClick={() => toggleChild(child.id)}
                            >
                              <span
                                className={styles["issue-dialog-card-check"]}
                              >
                                {checked ? "✓" : ""}
                              </span>

                              <span
                                className={styles["issue-dialog-card-visual"]}
                                aria-hidden="true"
                              >
                                <IssueVisualIcon kind={visualKind} />
                              </span>

                              <strong>{child.label}</strong>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}
              </div>

              <div className={styles["issue-dialog-footer"]}>
                <button
                  type="button"
                  className={styles["issue-dialog-continue"]}
                  onClick={proceedIssues}
                  disabled={!childSelectionValid}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

    </section>
  );

  return (
    <>
      <span
        ref={sourceAnchorRef}
        className={styles["questionnaire-anchor"]}
        aria-hidden="true"
      />

      {portalTarget ? createPortal(questionnairePage, portalTarget) : null}
    </>
  );
}
