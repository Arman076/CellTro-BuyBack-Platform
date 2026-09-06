import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

import { CreateProductSeriesDto } from './dto/create-product-series.dto.js';
import { UpdateProductSeriesDto } from './dto/update-product-series.dto.js';

@Injectable()
export class ProductSeriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateProductSeriesDto,
  ) {
    const category =
      await this.prisma.category.findUnique({
        where: {
          id: dto.categoryId,
        },
      });

    if (!category) {
      throw new BadRequestException(
        'Selected category does not exist',
      );
    }

    const brand =
      await this.prisma.brand.findUnique({
        where: {
          id: dto.brandId,
        },
      });

    if (!brand) {
      throw new BadRequestException(
        'Selected brand does not exist',
      );
    }

    const mapping =
      await this.prisma.categoryBrand.findUnique({
        where: {
          categoryId_brandId: {
            categoryId: dto.categoryId,
            brandId: dto.brandId,
          },
        },
      });

    if (!mapping) {
      throw new BadRequestException(
        'Selected brand is not mapped to selected category',
      );
    }

    const existing =
      await this.prisma.productSeries.findUnique({
        where: {
          categoryId_brandId_slug: {
            categoryId: dto.categoryId,
            brandId: dto.brandId,
            slug: dto.slug,
          },
        },
      });

    if (existing) {
      throw new BadRequestException(
        'This series already exists for selected category and brand',
      );
    }

    return this.prisma.productSeries.create({
      data: dto,

      include: {
        category: true,
        brand: true,

        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async findAll(
    categoryId?: number,
    brandId?: number,
  ) {
    return this.prisma.productSeries.findMany({
      where: {
        ...(categoryId
          ? { categoryId }
          : {}),

        ...(brandId
          ? { brandId }
          : {}),
      },

      include: {
        category: true,
        brand: true,

        _count: {
          select: {
            products: true,
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

  async findOne(id: number) {
    const series =
      await this.prisma.productSeries.findUnique({
        where: {
          id,
        },

        include: {
          category: true,
          brand: true,

          products: true,
        },
      });

    if (!series) {
      throw new NotFoundException(
        `Series with ID ${id} not found`,
      );
    }

    return series;
  }

  async update(
    id: number,
    dto: UpdateProductSeriesDto,
  ) {
    const existing =
      await this.prisma.productSeries.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        `Series with ID ${id} not found`,
      );
    }

    const categoryId =
      dto.categoryId ??
      existing.categoryId;

    const brandId =
      dto.brandId ??
      existing.brandId;

    const slug =
      dto.slug ??
      existing.slug;

    const mapping =
      await this.prisma.categoryBrand.findUnique({
        where: {
          categoryId_brandId: {
            categoryId,
            brandId,
          },
        },
      });

    if (!mapping) {
      throw new BadRequestException(
        'Selected brand is not mapped to selected category',
      );
    }

    const duplicate =
      await this.prisma.productSeries.findUnique({
        where: {
          categoryId_brandId_slug: {
            categoryId,
            brandId,
            slug,
          },
        },
      });

    if (
      duplicate &&
      duplicate.id !== id
    ) {
      throw new BadRequestException(
        'Another series with this slug already exists',
      );
    }

    return this.prisma.productSeries.update({
      where: {
        id,
      },

      data: dto,

      include: {
        category: true,
        brand: true,
      },
    });
  }

  async remove(id: number) {
    const series =
      await this.prisma.productSeries.findUnique({
        where: {
          id,
        },

        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

    if (!series) {
      throw new NotFoundException(
        `Series with ID ${id} not found`,
      );
    }

    if (
      series._count.products > 0
    ) {
      throw new BadRequestException(
        'Series has models linked to it. Disable it instead.',
      );
    }

    return this.prisma.productSeries.delete({
      where: {
        id,
      },
    });
  }
}