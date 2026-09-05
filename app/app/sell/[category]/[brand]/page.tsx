import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

import ModelGrid from "@/components/customer/ModelGrid";

import {
  getBrandBySlugAndCategory,
  getCategoryBySlug,
  getProductsByCategoryAndBrand,
} from "@/lib/customer-api";

type BrandPageProps = {
  params: Promise<{
    category: string;
    brand: string;
  }>;
};


/* =========================
   SEO
========================= */

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const {
    category: categorySlug,
    brand: brandSlug,
  } = await params;

  const category =
    await getCategoryBySlug(
      categorySlug,
    );

  if (!category) {
    return {
      title:
        "Device Category Not Found",
    };
  }

  const brand =
    await getBrandBySlugAndCategory(
      category.id,
      brandSlug,
    );

  if (!brand) {
    return {
      title:
        "Device Brand Not Found",
    };
  }

  return {
    title: `Sell ${brand.name} ${category.name} Online`,
    description: `Select your ${brand.name} ${category.name} model and get an estimated resale value with CELLTRO.`,

    alternates: {
      canonical:
        `/sell/${category.slug}/${brand.slug}`,
    },

    openGraph: {
      title: `Sell ${brand.name} ${category.name} | CELLTRO`,
      description: `Choose your ${brand.name} model and get an estimated device value.`,
      type: "website",
    },
  };
}


/* =========================
   PAGE
========================= */

export default async function BrandPage({
  params,
}: BrandPageProps) {
  const {
    category: categorySlug,
    brand: brandSlug,
  } = await params;

  const category =
    await getCategoryBySlug(
      categorySlug,
    );

  if (!category) {
    notFound();
  }

  const brand =
    await getBrandBySlugAndCategory(
      category.id,
      brandSlug,
    );

  if (!brand) {
    notFound();
  }

  const products =
    await getProductsByCategoryAndBrand(
      category.id,
      brand.id,
    );

  return (
    <main className="models-page">
      <div className="models-page-container">

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

          <Link
            href={`/sell/${category.slug}`}
          >
            {category.name}
          </Link>

          <ChevronRight
            size={14}
          />

          <span>
            {brand.name}
          </span>
        </nav>


        {/* Back */}

        <Link
          href={`/sell/${category.slug}`}
          className="model-back-link"
        >
          <ArrowLeft size={17} />

          Back to Brands
        </Link>


        {/* Header */}

        <section className="models-page-header">
          <span>
            CHOOSE YOUR MODEL
          </span>

          <h1>
            Sell Your{" "}
            {brand.name}{" "}
            {category.name}
          </h1>

          <p>
            Select your exact{" "}
            {brand.name} model to
            continue with variant and
            price selection.
          </p>
        </section>


        {/* Models */}

        <section
          className="models-selection-panel"
          aria-labelledby="models-heading"
        >
          <div className="models-section-heading">
            <div>
              <span>
                {brand.name.toUpperCase()}
              </span>

              <h2 id="models-heading">
                Select Your Model
              </h2>
            </div>

            {products.length > 0 && (
              <p>
                {products.length}{" "}
                {products.length === 1
                  ? "model"
                  : "models"}{" "}
                available
              </p>
            )}
          </div>

          {products.length ===
          0 ? (
            <div className="models-no-products">
              <h3>
                No models available
              </h3>

              <p>
                There are currently no
                active {brand.name}{" "}
                models under{" "}
                {category.name}.
              </p>

              <Link
                href={`/sell/${category.slug}`}
              >
                Choose Another Brand
              </Link>
            </div>
          ) : (
            <ModelGrid
              products={
                products
              }
              categorySlug={
                category.slug
              }
              brandSlug={
                brand.slug
              }
              brandName={
                brand.name
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}