import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';


import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(createBrandDto: CreateBrandDto) {
    const {
      categoryId,
      ...brandData
    } = createBrandDto;

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

    /*
      Check whether the brand already exists globally.

      Example:
      Samsung may already exist for Mobile.
      If admin adds Samsung under Laptop,
      we do NOT create another Samsung.
      We only create CategoryBrand mapping.
    */
    let brand =
      await this.prisma.brand.findUnique({
        where: {
          slug: brandData.slug,
        },
      });

    if (!brand) {
      brand =
        await this.prisma.brand.create({
          data: brandData,
        });
    }

    const existingMapping =
      await this.prisma.categoryBrand.findUnique({
        where: {
          categoryId_brandId: {
            categoryId,
            brandId: brand.id,
          },
        },
      });

    if (existingMapping) {
      throw new BadRequestException(
        `${brand.name} is already mapped to this category`,
      );
    }

    await this.prisma.categoryBrand.create({
      data: {
        categoryId,
        brandId: brand.id,
      },
    });

    return this.findOne(brand.id);
  }

  async findAll(categoryId?: number) {
    return this.prisma.brand.findMany({
      where: categoryId
        ? {
            categories: {
              some: {
                categoryId,
              },
            },
          }
        : undefined,

      include: {
        categories: {
          include: {
            category: true,
          },
        },

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
    const brand =
      await this.prisma.brand.findUnique({
        where: {
          id,
        },

        include: {
          categories: {
            include: {
              category: true,
            },
          },

          _count: {
            select: {
              products: true,
            },
          },
        },
      });

    if (!brand) {
      throw new NotFoundException(
        `Brand with ID ${id} not found`,
      );
    }

    return brand;
  }

  async update(
    id: number,
    updateBrandDto: UpdateBrandDto,
  ) {
    await this.findOne(id);

    const {
      categoryId,
      ...brandData
    } = updateBrandDto;

    const updatedBrand =
      await this.prisma.brand.update({
        where: {
          id,
        },

        data: brandData,
      });

    /*
      If categoryId is sent while editing,
      ensure that this brand is mapped
      to that category.
    */
    if (categoryId) {
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

      await this.prisma.categoryBrand.upsert({
        where: {
          categoryId_brandId: {
            categoryId,
            brandId: id,
          },
        },

        update: {},

        create: {
          categoryId,
          brandId: id,
        },
      });
    }

    return this.findOne(updatedBrand.id);
  }

  async remove(id: number) {
    const brand = await this.findOne(id);

    if (brand._count.products > 0) {
      throw new BadRequestException(
        'Brand cannot be deleted because products are linked to it. Disable it instead.',
      );
    }

    /*
      Deleting Brand will also delete its
      CategoryBrand mappings because
      onDelete: Cascade is configured.
    */
    return this.prisma.brand.delete({
      where: {
        id,
      },
    });
  }
}