import Link from "next/link";
import Image from "next/image";

import {
  CheckCircle2,
  ChevronRight,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from "lucide-react";

import { notFound } from "next/navigation";

import VariantSelector from "@/components/customer/VariantSelector";

import {
  getBrandBySlugAndCategory,
  getCategoryBySlug,
  getProductDetailById,
  getProductsByCategoryAndBrand,
} from "@/lib/customer-api";

type Props = {
  params: Promise<{
    category: string;
    brand: string;
    model: string;
  }>;
};

export default async function ModelPage({ params }: Props) {
  const {
    category: categorySlug,
    brand: brandSlug,
    model: modelSlug,
  } = await params;

  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();

  const brand = await getBrandBySlugAndCategory(category.id, brandSlug);
  if (!brand) notFound();

  const products = await getProductsByCategoryAndBrand(category.id, brand.id);

  const normalizedModelSlug = decodeURIComponent(modelSlug)
    .trim()
    .toLowerCase();

  const productSummary = products.find(
    (product) =>
      product.slug.trim().toLowerCase() === normalizedModelSlug,
  );

  if (!productSummary) notFound();

  const product = await getProductDetailById(productSummary.id);
  if (!product) notFound();

  return (
    <main className="pricing-page">
      <div className="pricing-container">
        <nav className="pricing-breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight size={14} />
          <Link href={`/sell/${category.slug}`}>{category.name}</Link>
          <ChevronRight size={14} />
          <Link href={`/sell/${category.slug}/${brand.slug}`}>
            {brand.name}
          </Link>
          <ChevronRight size={14} />
          <span>{product.name}</span>
        </nav>

        <section className="device-pricing-card">
          <div className="device-visual">
            <div className="device-image-box">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={430}
                  height={430}
                  className="device-main-image"
                  unoptimized
                  priority
                />
              ) : (
                <Smartphone size={140} strokeWidth={1.2} />
              )}
            </div>

            <div className="genuine-value-note">
              <ShieldCheck size={23} />
              <div>
                <strong>Transparent Device Valuation</strong>
                <span>
                  Price comes directly from your selected configuration.
                </span>
              </div>
            </div>
          </div>

          <div className="device-pricing-content">
            <div className="simple-model-title-box">
              <span className="model-mini-label">SELL YOUR DEVICE</span>
              <h1>{product.name}</h1>
            </div>

            <VariantSelector
              productId={product.id}
              productName={product.name}
              productImage={product.imageUrl ?? null}
              variants={product.variants ?? []}
            />
          </div>
        </section>

        <section className="pricing-benefits">
          <article>
            <span><Sparkles size={22} /></span>
            <div>
              <strong>Instant Valuation</strong>
              <p>See your base price immediately.</p>
            </div>
          </article>

          <article>
            <span><LockKeyhole size={22} /></span>
            <div>
              <strong>Secure Process</strong>
              <p>Customer information is handled securely.</p>
            </div>
          </article>

          <article>
            <span><MapPin size={22} /></span>
            <div>
              <strong>Pickup Service</strong>
              <p>Pickup from your selected location.</p>
            </div>
          </article>

          <article>
            <span><CheckCircle2 size={22} /></span>
            <div>
              <strong>Clear Pricing</strong>
              <p>No hidden variant calculations.</p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
