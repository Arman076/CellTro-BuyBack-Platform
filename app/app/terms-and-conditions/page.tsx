import type { Metadata } from 'next';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms & Conditions | CELLTRO',
  description:
    'Read the Terms & Conditions for using CELLTRO device buyback services.',
  alternates: {
    canonical: '/terms-and-conditions',
  },
};

type TermsSection = {
  id: number;
  title: string;
  content: string;
  displayOrder: number;
  isActive: boolean;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';

async function getTerms(): Promise<
  TermsSection[]
> {
  try {
    const response = await fetch(
      `${API_URL}/terms-sections/public`,
      {
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return Array.isArray(data)
      ? data
      : [];
  } catch {
    return [];
  }
}

export default async function TermsAndConditionsPage() {
  const sections = await getTerms();

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <FileText size={26} />
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-700">
              CELLTRO Legal
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Terms & Conditions
            </h1>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
              Please read these terms carefully
              before using CELLTRO&apos;s device
              buyback and related services.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {sections.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="font-medium text-gray-700">
              Terms & Conditions are currently
              being updated.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {sections.map(
              (section, index) => (
                <article
                  key={section.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-700">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
                        {section.title}
                      </h2>

                      <div className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600 sm:text-[15px]">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-500">
          By using CELLTRO services, customers
          are expected to review and understand
          the applicable Terms & Conditions.
        </div>
      </section>
    </main>
  );
}