// import CustomerHeader from '@/components/customer/CustomerHeader';
import HeroSection from '@/components/customer/HeroSection';
import CategoryGrid from '@/components/customer/CategoryGrid';

import { getCategories } from '@/lib/customer-api';

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <>
      {/* <CustomerHeader /> */}

      <main>
        <HeroSection />

        <CategoryGrid categories={categories} />

        <section
          id="how-it-works"
          className="how-it-works-section"
        >
          <div className="section-container">

            <div className="section-heading">
              <span>HOW IT WORKS</span>

              <h2>Sell your device in simple steps</h2>

              <p>
                From selecting your device to completing the
                pickup, the process is designed to stay simple.
              </p>
            </div>

            <div className="steps-grid">

              <article className="step-card">
                <span>01</span>
                <h3>Select Your Device</h3>
                <p>
                  Choose the category, brand, model and exact
                  variant of your device.
                </p>
              </article>

              <article className="step-card">
                <span>02</span>
                <h3>Get Your Quote</h3>
                <p>
                  Answer a few condition questions to receive
                  your final estimated value.
                </p>
              </article>

              <article className="step-card">
                <span>03</span>
                <h3>Schedule Pickup</h3>
                <p>
                  Provide your details and choose a convenient
                  pickup location.
                </p>
              </article>

              <article className="step-card">
                <span>04</span>
                <h3>Complete The Sale</h3>
                <p>
                  Your device is inspected and the final
                  transaction is completed securely.
                </p>
              </article>

            </div>

          </div>
        </section>
      </main>
    </>
  );
}