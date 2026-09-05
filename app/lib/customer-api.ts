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


/* =========================
   COMMON FETCH
========================= */

async function apiFetch<T>(
  endpoint: string,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      headers: {
        "Content-Type":
          "application/json",
      },

      next: {
        revalidate: 60,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
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
    const categories =
      await apiFetch<Category[]>(
        "/categories",
      );

    return categories
      .filter(
        (category) =>
          category.isActive,
      )
      .sort(
        (a, b) =>
          a.displayOrder -
          b.displayOrder,
      );
  } catch (error) {
    console.error(
      "Failed to load categories:",
      error,
    );

    return [];
  }
}


/* =========================
   CATEGORY BY SLUG
========================= */

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const categories =
    await getCategories();

  const normalizedSlug =
    decodeURIComponent(slug)
      .trim()
      .toLowerCase();

  return (
    categories.find(
      (category) =>
        category.slug
          .trim()
          .toLowerCase() ===
        normalizedSlug,
    ) || null
  );
}


/* =========================
   BRANDS BY CATEGORY
========================= */

export async function getBrandsByCategoryId(
  categoryId: number,
): Promise<Brand[]> {
  try {
    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0
    ) {
      return [];
    }

    const brands =
      await apiFetch<Brand[]>(
        `/brands?categoryId=${encodeURIComponent(
          String(categoryId),
        )}`,
      );

    return brands
      .filter(
        (brand) =>
          brand.isActive,
      )
      .sort((a, b) => {
        if (
          a.displayOrder !==
          b.displayOrder
        ) {
          return (
            a.displayOrder -
            b.displayOrder
          );
        }

        return a.name.localeCompare(
          b.name,
        );
      });
  } catch (error) {
    console.error(
      `Failed to load brands for category ${categoryId}:`,
      error,
    );

    return [];
  }
}

export type ProductSeries = {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  categoryId: number;
  brandId: number;
  createdAt?: string;
  updatedAt?: string;
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

  _count?: {
    variants: number;
  };

  createdAt?: string;
  updatedAt?: string;
};

export async function getProductsByCategoryAndBrand(
  categoryId: number,
  brandId: number,
): Promise<Product[]> {
  try {
    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0 ||
      !Number.isInteger(brandId) ||
      brandId <= 0
    ) {
      return [];
    }

    const products =
      await apiFetch<Product[]>(
        `/products?categoryId=${encodeURIComponent(
          String(categoryId),
        )}&brandId=${encodeURIComponent(
          String(brandId),
        )}`,
      );

    return products
      .filter(
        (product) =>
          product.isActive,
      )
      .sort((a, b) => {
        if (
          a.displayOrder !==
          b.displayOrder
        ) {
          return (
            a.displayOrder -
            b.displayOrder
          );
        }

        return a.name.localeCompare(
          b.name,
        );
      });
  } catch (error) {
    console.error(
      `Failed to load products for category ${categoryId} and brand ${brandId}:`,
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

  const normalizedSlug =
    decodeURIComponent(brandSlug)
      .trim()
      .toLowerCase();

  return (
    brands.find(
      (brand) =>
        brand.slug
          .trim()
          .toLowerCase() ===
        normalizedSlug,
    ) || null
  );
}