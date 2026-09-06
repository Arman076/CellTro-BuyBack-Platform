import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const category =
      await this.prisma.category.findUnique({
        where: { id },
      });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${id} not found`,
      );
    }

    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    await this.findOne(id);

    if (updateCategoryDto.slug) {
      const existingCategory =
        await this.prisma.category.findFirst({
          where: {
            slug: updateCategoryDto.slug,
            NOT: {
              id: id,
            },
          },
        });

      if (existingCategory) {
        throw new BadRequestException(
          `Category with slug "${updateCategoryDto.slug}" already exists`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.category.delete({
      where: { id },
    });
  }
}