import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

import {
  getBrandsByCategoryId,
  getCategoryBySlug,
} from "@/lib/customer-api";


type CategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};


/* ===============================
   SEO METADATA
================================ */

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } =
    await params;

  const category =
    await getCategoryBySlug(
      categorySlug,
    );

  if (!category) {
    return {
      title: "Device Category Not Found",
      description:
        "The requested device category could not be found.",
    };
  }

  return {
    title: `Sell ${category.name} Online | Get Best Value`,
    description: `Sell your ${category.name} online. Select your brand, model and device condition to get an estimated resale value.`,

    alternates: {
      canonical: `/sell/${category.slug}`,
    },

    openGraph: {
      title: `Sell ${category.name} Online`,
      description: `Choose your ${category.name} brand and get an estimated resale value.`,
      type: "website",
    },
  };
}


/* ===============================
   CATEGORY PAGE
================================ */

export default async function CategoryPage({
  params,
}: CategoryPageProps) {
  const { category: categorySlug } =
    await params;

  const category =
    await getCategoryBySlug(
      categorySlug,
    );

  if (!category) {
    notFound();
  }

  const brands =
    await getBrandsByCategoryId(
      category.id,
    );

  return (
    <main className="sell-category-page">

      <div className="sell-category-container">

        {/* Breadcrumb */}

        <nav
          className="customer-breadcrumb"
          aria-label="Breadcrumb"
        >
          <Link href="/">
            Home
          </Link>

          <ChevronRight
            size={14}
          />

          <Link href="/#sell-by-category">
            Sell Device
          </Link>

          <ChevronRight
            size={14}
          />

          <span>
            {category.name}
          </span>
        </nav>


        {/* Back */}

        <Link
          href="/#sell-by-category"
          className="category-back-link"
        >
          <ArrowLeft size={17} />

          All Categories
        </Link>


        {/* Header */}

        <section className="category-page-header">

          <span className="category-eyebrow">
            SELL YOUR DEVICE
          </span>

          <h1>
            Sell Your {category.name}
          </h1>

          <p>
            Choose your{" "}
            {category.name.toLowerCase()}{" "}
            brand to continue and get
            an estimated value for your
            device.
          </p>

        </section>


        {/* Brands */}

        <section
          className="customer-brands-section"
          aria-labelledby="brand-heading"
        >

          <div className="brand-section-heading">

            <div>
              <span>
                CHOOSE BRAND
              </span>

              <h2 id="brand-heading">
                Select Your Brand
              </h2>
            </div>

            {brands.length > 0 && (
              <p>
                {brands.length}{" "}
                {brands.length === 1
                  ? "brand"
                  : "brands"}{" "}
                available
              </p>
            )}

          </div>


          {brands.length === 0 ? (

            <div className="brand-empty-state">

              <h3>
                No brands available
              </h3>

              <p>
                There are currently no
                active brands available
                under {category.name}.
              </p>

              <Link
                href="/#sell-by-category"
              >
                Choose Another Category
              </Link>

            </div>

          ) : (

            <div className="customer-brand-grid">

              {brands.map(
                (brand) => {

                  const initials =
                    brand.name
                      .split(" ")
                      .map(
                        (word) =>
                          word[0],
                      )
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                  return (
                    <Link
                      key={brand.id}
                      href={`/sell/${category.slug}/${brand.slug}`}
                      className="customer-brand-card"
                      aria-label={`Sell ${brand.name} ${category.name}`}
                    >

                      <div className="brand-logo-box">

                        {brand.logoUrl ? (
                          <img
                            src={
                              brand.logoUrl
                            }
                            alt={`${brand.name} logo`}
                            loading="lazy"
                          />
                        ) : (
                          <span className="brand-initials">
                            {initials}
                          </span>
                        )}

                      </div>

                      <div className="brand-card-content">

                        <strong>
                          {brand.name}
                        </strong>

                        <span>
                          View Models
                        </span>

                      </div>

                      <ChevronRight
                        className="brand-card-arrow"
                        size={19}
                      />

                    </Link>
                  );
                },
              )}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}