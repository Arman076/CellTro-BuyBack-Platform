import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  HandCoins,
  HeartHandshake,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About CELLTRO | Sell Smart. Sell Easy.",
  description:
    "Learn about CELLTRO and our approach to making device selling simple, transparent, secure and convenient.",
  alternates: {
    canonical: "/about",
  },
};

const values = [
  {
    icon: SearchCheck,
    title: "Transparent Valuation",
    description:
      "Our process is designed to clearly explain how your device condition and configuration affect its estimated value.",
  },
  {
    icon: Truck,
    title: "Convenient Experience",
    description:
      "From device selection to pickup, every step is designed to stay simple and easy to understand.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Process",
    description:
      "Customer information, inspection and transaction workflows are designed with security and accountability in mind.",
  },
  {
    icon: HeartHandshake,
    title: "Customer First",
    description:
      "We focus on clear communication and a straightforward selling experience without unnecessary complexity.",
  },
];

const steps = [
  {
    number: "01",
    title: "Select Your Device",
    description:
      "Choose the category, brand, model and exact variant of the device you want to sell.",
  },
  {
    number: "02",
    title: "Get Your Value",
    description:
      "Answer device condition questions to receive an estimated value based on your selection.",
  },
  {
    number: "03",
    title: "Schedule Pickup",
    description:
      "Provide your details and choose a convenient location for the device inspection and pickup.",
  },
  {
    number: "04",
    title: "Complete The Sale",
    description:
      "After inspection and confirmation, complete the transaction through a secure process.",
  },
];

export default function AboutPage() {
  return (
    <main className="customer-page-bg info-page">
      <section className="info-hero">
        <div className="info-hero-glow info-hero-glow-left" />
        <div className="info-hero-glow info-hero-glow-right" />

        <div className="section-container info-hero-inner">
          <div className="info-eyebrow">
            <Sparkles size={16} />
            ABOUT CELLTRO
          </div>

          <h1>
            A Smarter Way To
            <span> Sell Your Old Device</span>
          </h1>

          <p>
            CELLTRO is being built to make device selling simpler,
            more transparent and more convenient—from checking your
            estimated value to completing the pickup.
          </p>

          <div className="info-hero-actions">
            <Link href="/sell" className="info-primary-button">
              Sell Your Device
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/partner-with-us"
              className="info-secondary-button"
            >
              Partner With Us
            </Link>
          </div>

          <div className="info-trust-row">
            <span>
              <BadgeCheck size={17} />
              Transparent Process
            </span>

            <span>
              <ShieldCheck size={17} />
              Secure Experience
            </span>

            <span>
              <HandCoins size={17} />
              Clear Device Value
            </span>
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="section-container info-story-grid">
          <div>
            <span className="info-section-label">WHO WE ARE</span>

            <h2>
              Device selling should feel simple, not confusing.
            </h2>

            <p>
              CELLTRO is a technology-driven device buyback platform
              focused on creating a straightforward experience for
              people who want to sell their used smartphones and other
              supported devices.
            </p>

            <p>
              Our goal is to connect product selection, device
              condition, valuation, pickup and transaction workflows
              into one easy-to-use platform.
            </p>
          </div>

          <div className="customer-premium-card info-mission-card">
            <span>OUR MISSION</span>

            <h3>
              Make every device sale clear, convenient and trusted.
            </h3>

            <p>
              We are building CELLTRO around transparent valuation,
              structured device inspection and a simple digital journey
              for customers and partners.
            </p>

            <div className="info-mission-points">
              <span>
                <CheckCircle2 size={17} />
                Simple customer journey
              </span>

              <span>
                <CheckCircle2 size={17} />
                Transparent device assessment
              </span>

              <span>
                <CheckCircle2 size={17} />
                Organized pickup workflow
              </span>

              <span>
                <CheckCircle2 size={17} />
                Scalable partner network
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="info-section info-soft-section">
        <div className="section-container">
          <div className="info-section-heading">
            <span>WHY CELLTRO</span>

            <h2>Built around a better selling experience</h2>

            <p>
              Every part of the platform is designed to keep the
              customer journey clear and easy to follow.
            </p>
          </div>

          <div className="info-value-grid">
            {values.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="customer-premium-card info-value-card"
                >
                  <div className="info-icon-box">
                    <Icon size={25} />
                  </div>

                  <h3>{item.title}</h3>

                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="section-container">
          <div className="info-section-heading">
            <span>HOW IT WORKS</span>

            <h2>From device selection to completed sale</h2>
          </div>

          <div className="info-step-grid">
            {steps.map((step) => (
              <article
                key={step.number}
                className="customer-premium-card info-step-card"
              >
                <span className="info-step-number">
                  {step.number}
                </span>

                <h3>{step.title}</h3>

                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="info-section info-cta-section">
        <div className="section-container">
          <div className="info-cta-card">
            <div>
              <span>READY TO GET STARTED?</span>

              <h2>Find the value of your device today.</h2>

              <p>
                Select your device and continue through CELLTRO&apos;s
                simple selling process.
              </p>
            </div>

            <Link href="/sell" className="info-cta-button">
              Sell Your Device
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}