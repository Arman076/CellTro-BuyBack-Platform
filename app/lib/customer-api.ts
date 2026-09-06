const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

/* =========================
   TYPES
========================= */

export type Category = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Brand = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  displayOrder: number;
  isActive: boolean;

  categories?: {
    id: number;
    categoryId: number;
    brandId: number;
    category: Category;
  }[];

  _count?: {
    products: number;
  };

  createdAt?: string;
  updatedAt?: string;
};

export type ProductSeries = {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  categoryId: number;
  brandId: number;
};

export type VariantValue = {
  id: number;

  attribute: {
    id: number;
    name: string;
    slug?: string;
  };

  option: {
    id: number;
    value: string;
  };
};

export type ProductVariant = {
  id: number;
  productId: number;
  basePrice: string | number;
  isActive: boolean;
  values: VariantValue[];
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;

  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;

  categoryId: number;
  brandId: number;

  seriesId: number | null;
  series: ProductSeries | null;

  category?: Category;
  brand?: Brand;

  variants?: ProductVariant[];

  _count?: {
    variants: number;
  };
};

export type ProductDetail =
  Product & {
    variants: ProductVariant[];
  };

/* =========================
   COMMON FETCH
========================= */

async function apiFetch<T>(
  endpoint: string,
  revalidate = 120,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      headers: {
        Accept: "application/json",
      },

      next: {
        revalidate,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `API ${response.status}: ${endpoint}`,
    );
  }

  return response.json();
}

/* =========================
   CATEGORIES
========================= */

export async function getCategories(): Promise<
  Category[]
> {
  try {
    const data =
      await apiFetch<Category[]>(
        "/categories",
        300,
      );

    return data
      .filter((item) => item.isActive)
      .sort(
        (a, b) =>
          a.displayOrder -
          b.displayOrder,
      );
  } catch (error) {
    console.error(
      "Category API error:",
      error,
    );

    return [];
  }
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const categories =
    await getCategories();

  const normalized =
    decodeURIComponent(slug)
      .trim()
      .toLowerCase();

  return (
    categories.find(
      (item) =>
        item.slug
          .trim()
          .toLowerCase() ===
        normalized,
    ) ?? null
  );
}

/* =========================
   BRANDS
========================= */

export async function getBrandsByCategoryId(
  categoryId: number,
): Promise<Brand[]> {
  try {
    const data =
      await apiFetch<Brand[]>(
        `/brands?categoryId=${categoryId}`,
        300,
      );

    return data
      .filter((item) => item.isActive)
      .sort(
        (a, b) =>
          a.displayOrder -
          b.displayOrder,
      );
  } catch (error) {
    console.error(
      "Brand API error:",
      error,
    );

    return [];
  }
}

export async function getBrandBySlugAndCategory(
  categoryId: number,
  brandSlug: string,
): Promise<Brand | null> {
  const brands =
    await getBrandsByCategoryId(
      categoryId,
    );

  const normalized =
    decodeURIComponent(brandSlug)
      .trim()
      .toLowerCase();

  return (
    brands.find(
      (item) =>
        item.slug
          .trim()
          .toLowerCase() ===
        normalized,
    ) ?? null
  );
}

/* =========================
   PRODUCTS
========================= */

export async function getProductsByCategoryAndBrand(
  categoryId: number,
  brandId: number,
): Promise<Product[]> {
  try {
    const data =
      await apiFetch<Product[]>(
        `/products?categoryId=${categoryId}&brandId=${brandId}`,
        120,
      );

    return data
      .filter((item) => item.isActive)
      .sort(
        (a, b) =>
          a.displayOrder -
          b.displayOrder,
      );
  } catch (error) {
    console.error(
      "Product API error:",
      error,
    );

    return [];
  }
}

export async function getProductDetailById(
  productId: number,
): Promise<ProductDetail | null> {
  try {
    return await apiFetch<ProductDetail>(
      `/products/${productId}`,
      60,
    );
  } catch (error) {
    console.error(
      `Product ${productId} API error:`,
      error,
    );

    return null;
  }
}

export async function getProductsByCategoryId(
  categoryId: number,
): Promise<Product[]> {
  try {
    const data =
      await apiFetch<Product[]>(
        `/products?categoryId=${categoryId}`,
        120,
      );

    return data
      .filter(
        (item) => item.isActive,
      )
      .sort(
        (a, b) =>
          a.displayOrder -
          b.displayOrder,
      );
  } catch (error) {
    console.error(
      "Category product API error:",
      error,
    );

    return [];
  }
}