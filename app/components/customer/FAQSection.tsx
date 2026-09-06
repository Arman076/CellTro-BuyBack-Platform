"use client";

import {
  ChevronDown,
  HelpCircle,
} from "lucide-react";

import {
  useState,
} from "react";

const faqs = [
  {
    question:
      "How does selling a device on CELLTRO work?",
    answer:
      "Select your device, choose the correct variant, answer the condition questions and get an estimated value. After confirming your details, you can schedule a pickup.",
  },
  {
    question:
      "How is my device value calculated?",
    answer:
      "The estimated value depends on your selected model, variant and device condition. Applicable deductions are calculated during the assessment process.",
  },
  {
    question:
      "Is pickup available at my location?",
    answer:
      "Pickup availability depends on your serviceable pincode. Enter your location or pincode to check service availability in your area.",
  },
  {
    question:
      "What happens during device inspection?",
    answer:
      "The pickup agent verifies the model, variant and actual physical and functional condition of your device before confirming the final value.",
  },
  {
    question:
      "Can the final price change after inspection?",
    answer:
      "Yes. If the actual condition differs from the information provided during the online assessment, a revised value may be shown before the transaction is completed.",
  },
  {
    question:
      "Should I remove my personal data before selling?",
    answer:
      "Yes. Back up important data, sign out from personal accounts and remove sensitive information before handing over your device.",
  },
  {
    question:
      "Can I cancel my pickup?",
    answer:
      "A pickup can be cancelled before completion of the transaction, subject to the current order status.",
  },
];

export default function FAQSection() {
  const [
    openIndex,
    setOpenIndex,
  ] = useState<number | null>(0);

  return (
    <section
      className="home-content-section"
      id="faq"
      aria-labelledby="faq-heading"
    >
      <div className="home-content-container">

        <div className="home-bordered-section celltro-faq-wrapper">

          <div className="home-section-heading centered">

            <div className="faq-heading-icon">
              <HelpCircle size={18} />
            </div>

            <span>
              NEED HELP?
            </span>

            <h2 id="faq-heading">
              Frequently Asked Questions
            </h2>

            <p>
              Everything you need to
              know about pricing,
              inspection, pickup and
              selling your device.
            </p>

          </div>


          <div className="faq-list">

            {faqs.map(
              (faq, index) => {
                const isOpen =
                  openIndex === index;

                return (
                  <article
                    key={faq.question}
                    className={`faq-item ${
                      isOpen
                        ? "active"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="faq-question"
                      aria-expanded={
                        isOpen
                      }
                      onClick={() =>
                        setOpenIndex(
                          isOpen
                            ? null
                            : index,
                        )
                      }
                    >
                      <span>
                        {faq.question}
                      </span>

                      <ChevronDown
                        size={19}
                      />
                    </button>


                    <div
                      className={`faq-answer-wrapper ${
                        isOpen
                          ? "open"
                          : ""
                      }`}
                    >
                      <div className="faq-answer">
                        <p>
                          {faq.answer}
                        </p>
                      </div>
                    </div>

                  </article>
                );
              },
            )}

          </div>

        </div>

      </div>
    </section>
  );
}