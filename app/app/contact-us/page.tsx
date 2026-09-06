import type { Metadata } from "next";

import {
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";

import ContactForm from "@/components/customer/ContactForm";

export const metadata: Metadata = {
  title: "Contact CELLTRO | Customer Support",
  description:
    "Contact CELLTRO for device selling, pickup, order and partnership-related support.",
  alternates: {
    canonical: "/contact-us",
  },
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

type SiteSettings = {
  supportPhone: string | null;
  whatsappNumber: string | null;
  supportEmail: string | null;
  businessEmail: string | null;
  officeAddress: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  businessHours: string | null;
};

async function getSettings(): Promise<SiteSettings> {
  try {
    const response = await fetch(
      `${API_URL}/site-settings/public`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error();
    }

    return await response.json();
  } catch {
    return {
      supportPhone: null,
      whatsappNumber: null,
      supportEmail: null,
      businessEmail: null,
      officeAddress: null,
      city: null,
      state: null,
      pincode: null,
      businessHours: null,
    };
  }
}

export default async function ContactUsPage() {
  const settings =
    await getSettings();

  const email =
    settings.supportEmail ||
    settings.businessEmail;

  const address = [
    settings.officeAddress,
    settings.city,
    settings.state,
    settings.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Contact CELLTRO
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
            We&apos;re here to help
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
            Have a question about selling your
            device, pickup, order or partnership?
            Contact our team and we&apos;ll help
            you with the next steps.
          </p>
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-10">
            <aside className="min-w-0">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-950">
                  Contact Information
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Choose the most convenient way
                  to reach the CELLTRO team.
                </p>

                <div className="mt-7 space-y-5">
                  {settings.supportPhone && (
                    <InfoItem
                      icon={<Phone size={19} />}
                      title="Customer Support"
                      value={settings.supportPhone}
                      href={`tel:${settings.supportPhone.replace(
                        /[^\d+]/g,
                        "",
                      )}`}
                    />
                  )}

                  {email && (
                    <InfoItem
                      icon={<Mail size={19} />}
                      title="Email"
                      value={email}
                      href={`mailto:${email}`}
                    />
                  )}

                  {settings.whatsappNumber && (
                    <InfoItem
                      icon={
                        <MessageCircle
                          size={19}
                        />
                      }
                      title="WhatsApp"
                      value={
                        settings.whatsappNumber
                      }
                      href={`https://wa.me/${settings.whatsappNumber.replace(
                        /\D/g,
                        "",
                      )}`}
                      external
                    />
                  )}

                  {address && (
                    <InfoItem
                      icon={
                        <MapPin size={19} />
                      }
                      title="Office"
                      value={address}
                    />
                  )}

                  {settings.businessHours && (
                    <InfoItem
                      icon={
                        <Clock3 size={19} />
                      }
                      title="Business Hours"
                      value={
                        settings.businessHours
                      }
                    />
                  )}
                </div>

                <div className="mt-7 rounded-xl bg-emerald-50 p-4">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={20}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />

                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Your information is secure
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                        Contact information submitted
                        through this page is used
                        only to respond to your
                        enquiry.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoItem({
  icon,
  title,
  value,
  href,
  external = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {title}
        </p>

        {href ? (
          <a
            href={href}
            target={
              external
                ? "_blank"
                : undefined
            }
            rel={
              external
                ? "noopener noreferrer"
                : undefined
            }
            className="mt-1 block break-words text-sm font-semibold text-gray-800 hover:text-emerald-700"
          >
            {value}
          </a>
        ) : (
          <p className="mt-1 break-words text-sm font-semibold leading-6 text-gray-800">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}