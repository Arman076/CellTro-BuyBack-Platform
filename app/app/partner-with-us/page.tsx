import type { Metadata } from "next";

import {
  BarChart3,
  CheckCircle2,
  Handshake,
  Headphones,
  ShieldCheck,
} from "lucide-react";

import PartnerApplicationForm from "@/components/customer/PartnerApplicationForm";

export const metadata: Metadata = {
  title: "Partner With CELLTRO | Business Partnership",
  description:
    "Partner with CELLTRO as a buyback vendor, pickup partner or business partner.",
  alternates: {
    canonical: "/partner-with-us",
  },
};

const benefits = [
  {
    icon: Handshake,
    title: "Trusted Partnership",
    description:
      "Work with a reliable and growing device buyback platform.",
  },
  {
    icon: BarChart3,
    title: "Business Opportunities",
    description:
      "Access new buyback and device collection opportunities.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description:
      "Our team will support you throughout the partnership process.",
  },
];

export default function PartnerWithUsPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}

      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 sm:text-sm">
              Partner With CELLTRO
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
              Grow your business with CELLTRO
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
              Whether you are a buyback vendor, pickup partner
              or business looking to collaborate, we would love
              to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* APPLICATION */}

      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-10">
            {/* LEFT SIDE */}

            <aside className="min-w-0">
              <div className="xl:sticky xl:top-28">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
                    Partner Application
                  </div>

                  <h2 className="mt-3 text-2xl font-bold leading-tight text-gray-950 sm:text-3xl">
                    Interested in working with CELLTRO?
                  </h2>

                  <p className="mt-4 text-sm leading-7 text-gray-600">
                    Complete the application form and provide
                    your business details. Our team will review
                    your request and contact you regarding the
                    next steps.
                  </p>

                  <div className="mt-7 space-y-6">
                    {benefits.map((benefit) => {
                      const Icon = benefit.icon;

                      return (
                        <div
                          key={benefit.title}
                          className="flex items-start gap-3"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Icon size={19} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {benefit.title}
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-gray-500">
                              {benefit.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-7 border-t border-gray-100 pt-6">
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck
                          size={20}
                          className="mt-0.5 shrink-0 text-emerald-700"
                        />

                        <div>
                          <p className="text-sm font-semibold text-emerald-900">
                            Secure & Confidential
                          </p>

                          <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                            Your information will only be used
                            for partnership-related communication
                            and review.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* FORM */}

            <div className="min-w-0">
              <PartnerApplicationForm />
            </div>
          </div>
        </div>
      </section>

      {/* TYPES */}

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
              Partnership Options
            </p>

            <h2 className="mt-3 text-2xl font-bold text-gray-950 sm:text-3xl">
              Who can partner with us?
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <PartnerTypeCard
              title="Buyback Vendors"
              text="Businesses involved in buying, selling or refurbishing smartphones and electronic devices."
            />

            <PartnerTypeCard
              title="Pickup Partners"
              text="Local pickup and logistics partners interested in supporting device collection operations."
            />

            <PartnerTypeCard
              title="Business Partners"
              text="Corporate and business partners looking to collaborate with CELLTRO for device buyback services."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function PartnerTypeCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
        <CheckCircle2 size={19} />
      </div>

      <h3 className="text-lg font-semibold text-gray-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        {text}
      </p>
    </article>
  );
}