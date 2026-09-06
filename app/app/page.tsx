import {
  BadgeCheck,
  Clock3,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  Truck,
  WalletCards,
} from "lucide-react";

import HeroSection from "@/components/customer/HeroSection";
import CategoryGrid from "@/components/customer/CategoryGrid";
import TrustSection from "@/components/customer/TrustSection";
import FAQSection from "@/components/customer/FAQSection";

import {
  getCategories,
} from "@/lib/customer-api";

export default async function HomePage() {
  const categories =
    await getCategories();

  return (
    <main className="customer-page-bg">

      {/* ======================
          HERO
      ====================== */}

      <HeroSection />


      {/* ======================
          SELL YOUR DEVICE
      ====================== */}

      <CategoryGrid
        categories={categories}
      />


      {/* ======================
          WHY PEOPLE CHOOSE US
      ====================== */}

      <section
        className="home-content-section"
        id="why-celltro"
      >
        <div className="home-content-container">

          <div className="home-bordered-section">

            <div className="home-section-heading">
              <span>
                WHY CELLTRO
              </span>

              <h2>
                Why People Choose Us
              </h2>

              <p>
                A simple and transparent
                way to sell your device.
              </p>
            </div>


            <div className="why-celltro-grid">

              <article className="home-feature-card">
                <div className="home-feature-icon">
                  <Sparkles
                    size={21}
                  />
                </div>

                <h3>
                  Transparent Pricing
                </h3>

                <p>
                  Device value is based
                  on the selected variant
                  and actual condition.
                </p>
              </article>


              <article className="home-feature-card">
                <div className="home-feature-icon">
                  <Clock3
                    size={21}
                  />
                </div>

                <h3>
                  Convenient Pickup
                </h3>

                <p>
                  Schedule pickup at a
                  supported location and
                  convenient time.
                </p>
              </article>


              <article className="home-feature-card">
                <div className="home-feature-icon">
                  <ShieldCheck
                    size={21}
                  />
                </div>

                <h3>
                  Secure Process
                </h3>

                <p>
                  Customer and device
                  verification helps keep
                  every transaction
                  secure.
                </p>
              </article>


              <article className="home-feature-card">
                <div className="home-feature-icon">
                  <FileCheck2
                    size={21}
                  />
                </div>

                <h3>
                  Clear Requote
                </h3>

                <p>
                  Any value change after
                  inspection is shown
                  before completing the
                  transaction.
                </p>
              </article>

            </div>

          </div>

        </div>
      </section>


      {/* ======================
          HOW IT WORKS
      ====================== */}

      <section
        id="how-it-works"
        className="home-content-section"
      >
        <div className="home-content-container">

          <div className="home-bordered-section">

            <div className="home-section-heading centered">
              <span>
                SIMPLE PROCESS
              </span>

              <h2>
                Selling Made Simple
              </h2>

              <p>
                Sell your old device in
                four straightforward
                steps.
              </p>
            </div>


            <div className="home-process-grid">

              <article>
                <span className="process-number">
                  01
                </span>

                <BadgeCheck
                  size={25}
                />

                <h3>
                  Select Device
                </h3>

                <p>
                  Choose category, brand,
                  model and variant.
                </p>
              </article>


              <article>
                <span className="process-number">
                  02
                </span>

                <Sparkles
                  size={25}
                />

                <h3>
                  Get Your Value
                </h3>

                <p>
                  Complete the condition
                  questionnaire.
                </p>
              </article>


              <article>
                <span className="process-number">
                  03
                </span>

                <Truck
                  size={25}
                />

                <h3>
                  Schedule Pickup
                </h3>

                <p>
                  Provide your address
                  and pickup details.
                </p>
              </article>


              <article>
                <span className="process-number">
                  04
                </span>

                <WalletCards
                  size={25}
                />

                <h3>
                  Complete Sale
                </h3>

                <p>
                  Verify the device and
                  complete the
                  transaction.
                </p>
              </article>

            </div>

          </div>

        </div>
      </section>


      {/* ======================
          TRUST SECTION
      ====================== */}

      <section
        className="home-content-section"
        id="trust"
      >
        <div className="home-content-container">

          <div className="home-bordered-section home-trust-box">

            <div className="home-section-heading centered">
              <span>
                BUILT FOR TRUST
              </span>

              <h2>
                A Safer Way To Sell
                Your Device
              </h2>

              <p>
                Clear pricing, verified
                pickup and transaction
                records throughout the
                selling journey.
              </p>
            </div>


            <div className="home-trust-grid">

              <div>
                <ShieldCheck
                  size={25}
                />

                <strong>
                  Secure
                </strong>

                <span>
                  Verification process
                </span>
              </div>


              <div>
                <Truck
                  size={25}
                />

                <strong>
                  Convenient
                </strong>

                <span>
                  Doorstep pickup
                </span>
              </div>


              <div>
                <FileCheck2
                  size={25}
                />

                <strong>
                  Transparent
                </strong>

                <span>
                  Clear transaction
                  details
                </span>
              </div>


              <div>
                <BadgeCheck
                  size={25}
                />

                <strong>
                  Verified
                </strong>

                <span>
                  Device inspection
                </span>
              </div>

            </div>

          </div>

        </div>
      </section>


      {/* ======================
          FAQ
      ====================== */}
      <TrustSection />

      <FAQSection />

    </main>
  );
}