import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
  ) {
    const {
      categoryId,
      brandId,
      seriesId,
      ...productData
    } = createProductDto;

    /* -----------------------------
       CATEGORY VALIDATION
    ----------------------------- */

    const category =
      await this.prisma.category.findUnique({
        where: {
          id: categoryId,
        },
      });

    if (!category) {
      throw new BadRequestException(
        'Selected category does not exist',
      );
    }

    /* -----------------------------
       BRAND VALIDATION
    ----------------------------- */

    const brand =
      await this.prisma.brand.findUnique({
        where: {
          id: brandId,
        },
      });

    if (!brand) {
      throw new BadRequestException(
        'Selected brand does not exist',
      );
    }

    /* -----------------------------
       CATEGORY-BRAND MAPPING
    ----------------------------- */

    const brandMapping =
      await this.prisma.categoryBrand.findUnique({
        where: {
          categoryId_brandId: {
            categoryId,
            brandId,
          },
        },
      });

    if (!brandMapping) {
      throw new BadRequestException(
        'Selected brand is not mapped to selected category',
      );
    }

    /* -----------------------------
       SERIES VALIDATION
    ----------------------------- */

    if (seriesId) {
      const series =
        await this.prisma.productSeries.findFirst({
          where: {
            id: seriesId,
            categoryId,
            brandId,
            isActive: true,
          },
        });

      if (!series) {
        throw new BadRequestException(
          'Selected series does not belong to selected category and brand',
        );
      }
    }

    /* -----------------------------
       DUPLICATE MODEL CHECK
    ----------------------------- */

    const existingProduct =
      await this.prisma.product.findUnique({
        where: {
          categoryId_brandId_slug: {
            categoryId,
            brandId,
            slug: productData.slug,
          },
        },
      });

    if (existingProduct) {
      throw new BadRequestException(
        'This model already exists for selected category and brand',
      );
    }

    /* -----------------------------
       CREATE PRODUCT
    ----------------------------- */

    return this.prisma.product.create({
      data: {
        ...productData,
        categoryId,
        brandId,

        ...(seriesId
          ? {
              seriesId,
            }
          : {}),
      },

      include: {
        category: true,
        brand: true,
        series: true,

        _count: {
          select: {
            variants: true,
          },
        },
      },
    });
  }

  /* =====================================
     GET ALL PRODUCTS
  ===================================== */

  async findAll(
    categoryId?: number,
    brandId?: number,
  ) {
    return this.prisma.product.findMany({
      where: {
        ...(categoryId
          ? {
              categoryId,
            }
          : {}),

        ...(brandId
          ? {
              brandId,
            }
          : {}),
      },

      include: {
        category: true,
        brand: true,

        series: true,

        _count: {
          select: {
            variants: true,
          },
        },
      },

      orderBy: [
        {
          displayOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  /* =====================================
     GET SINGLE PRODUCT
  ===================================== */

  async findOne(id: number) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id,
        },

        include: {
          category: true,
          brand: true,

          series: true,

          variants: {
            include: {
              values: {
                include: {
                  attribute: true,
                  option: true,
                },

                orderBy: {
                  attribute: {
                    displayOrder: 'asc',
                  },
                },
              },
            },

            orderBy: {
              createdAt: 'asc',
            },
          },

          _count: {
            select: {
              variants: true,
            },
          },
        },
      });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found`,
      );
    }

    return product;
  }

  /* =====================================
     UPDATE PRODUCT
  ===================================== */

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ) {
    const existingProduct =
      await this.prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!existingProduct) {
      throw new NotFoundException(
        `Product with ID ${id} not found`,
      );
    }

    const categoryId =
      updateProductDto.categoryId ??
      existingProduct.categoryId;

    const brandId =
      updateProductDto.brandId ??
      existingProduct.brandId;

    const slug =
      updateProductDto.slug ??
      existingProduct.slug;

    /*
      Important:
      Agar request me seriesId nahi aaya,
      existing series retain hogi.
    */

    const effectiveSeriesId =
      updateProductDto.seriesId !== undefined
        ? updateProductDto.seriesId
        : existingProduct.seriesId;

    /* -----------------------------
       CATEGORY VALIDATION
    ----------------------------- */

    const category =
      await this.prisma.category.findUnique({
        where: {
          id: categoryId,
        },
      });

    if (!category) {
      throw new BadRequestException(
        'Selected category does not exist',
      );
    }

    /* -----------------------------
       BRAND VALIDATION
    ----------------------------- */

    const brand =
      await this.prisma.brand.findUnique({
        where: {
          id: brandId,
        },
      });

    if (!brand) {
      throw new BadRequestException(
        'Selected brand does not exist',
      );
    }

    /* -----------------------------
       CATEGORY-BRAND VALIDATION
    ----------------------------- */

    const brandMapping =
      await this.prisma.categoryBrand.findUnique({
        where: {
          categoryId_brandId: {
            categoryId,
            brandId,
          },
        },
      });

    if (!brandMapping) {
      throw new BadRequestException(
        'Selected brand is not mapped to selected category',
      );
    }

    /* -----------------------------
       SERIES VALIDATION
    ----------------------------- */

    if (effectiveSeriesId) {
      const series =
        await this.prisma.productSeries.findFirst({
          where: {
            id: effectiveSeriesId,
            categoryId,
            brandId,
            isActive: true,
          },
        });

      if (!series) {
        throw new BadRequestException(
          'Selected series does not belong to selected category and brand',
        );
      }
    }

    /* -----------------------------
       DUPLICATE MODEL VALIDATION
    ----------------------------- */

    const duplicateProduct =
      await this.prisma.product.findUnique({
        where: {
          categoryId_brandId_slug: {
            categoryId,
            brandId,
            slug,
          },
        },
      });

    if (
      duplicateProduct &&
      duplicateProduct.id !== id
    ) {
      throw new BadRequestException(
        'Another model with this slug already exists for selected category and brand',
      );
    }

    /* -----------------------------
       UPDATE
    ----------------------------- */

    return this.prisma.product.update({
      where: {
        id,
      },

      data: updateProductDto,

      include: {
        category: true,
        brand: true,

        series: true,

        _count: {
          select: {
            variants: true,
          },
        },
      },
    });
  }

  /* =====================================
     DELETE PRODUCT
  ===================================== */

  async remove(id: number) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id,
        },

        include: {
          _count: {
            select: {
              variants: true,
            },
          },
        },
      });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found`,
      );
    }

    if (product._count.variants > 0) {
      throw new BadRequestException(
        'Product cannot be deleted because variants are linked to it. Disable it instead.',
      );
    }

    return this.prisma.product.delete({
      where: {
        id,
      },
    });
  }
}