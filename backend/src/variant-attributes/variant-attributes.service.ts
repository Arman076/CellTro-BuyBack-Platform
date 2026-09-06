import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';
import { CreateVariantAttributeDto } from './dto/create-variant-attribute.dto.js';
import { UpdateVariantAttributeDto } from './dto/update-variant-attribute.dto.js';
import { CreateAttributeOptionDto } from './dto/create-attribute-option.dto.js';
import { UpdateAttributeOptionDto } from './dto/update-attribute-option.dto.js';

@Injectable()
export class VariantAttributesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVariantAttributeDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Selected category does not exist');
    }

    const duplicate = await this.prisma.variantAttribute.findUnique({
      where: {
        categoryId_slug: {
          categoryId: dto.categoryId,
          slug: dto.slug,
        },
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        'Attribute with this slug already exists in selected category',
      );
    }

    return this.prisma.variantAttribute.create({
      data: dto,
      include: {
        category: true,
        options: {
          orderBy: [{ displayOrder: 'asc' }, { value: 'asc' }],
        },
      },
    });
  }

  async findAll(categoryId?: number) {
    return this.prisma.variantAttribute.findMany({
      where: categoryId ? { categoryId } : {},
      include: {
        category: true,
        options: {
          orderBy: [{ displayOrder: 'asc' }, { value: 'asc' }],
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: number) {
    const attribute = await this.prisma.variantAttribute.findUnique({
      where: { id },
      include: {
        category: true,
        options: {
          orderBy: [{ displayOrder: 'asc' }, { value: 'asc' }],
        },
      },
    });

    if (!attribute) {
      throw new NotFoundException(`Variant attribute with ID ${id} not found`);
    }

    return attribute;
  }

  async update(id: number, dto: UpdateVariantAttributeDto) {
    const existing = await this.findOne(id);

    const categoryId = dto.categoryId ?? existing.categoryId;
    const slug = dto.slug ?? existing.slug;

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Selected category does not exist');
      }
    }

    const duplicate = await this.prisma.variantAttribute.findUnique({
      where: {
        categoryId_slug: {
          categoryId,
          slug,
        },
      },
    });

    if (duplicate && duplicate.id !== id) {
      throw new BadRequestException(
        'Another attribute with this slug already exists in selected category',
      );
    }

    return this.prisma.variantAttribute.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        options: {
          orderBy: [{ displayOrder: 'asc' }, { value: 'asc' }],
        },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const usedValues = await this.prisma.variantAttributeValue.count({
      where: { attributeId: id },
    });

    if (usedValues > 0) {
      throw new BadRequestException(
        'Attribute is already used by variants. Disable it instead.',
      );
    }

    return this.prisma.variantAttribute.delete({
      where: { id },
    });
  }

  async createOption(
    attributeId: number,
    dto: CreateAttributeOptionDto,
  ) {
    await this.findOne(attributeId);

    const duplicate =
      await this.prisma.variantAttributeOption.findUnique({
        where: {
          attributeId_value: {
            attributeId,
            value: dto.value,
          },
        },
      });

    if (duplicate) {
      throw new BadRequestException(
        'This option already exists for selected attribute',
      );
    }

    return this.prisma.variantAttributeOption.create({
      data: {
        ...dto,
        attributeId,
      },
      include: {
        attribute: true,
      },
    });
  }

  async updateOption(
    attributeId: number,
    optionId: number,
    dto: UpdateAttributeOptionDto,
  ) {
    const option = await this.prisma.variantAttributeOption.findFirst({
      where: {
        id: optionId,
        attributeId,
      },
    });

    if (!option) {
      throw new NotFoundException('Attribute option not found');
    }

    if (dto.value && dto.value !== option.value) {
      const duplicate =
        await this.prisma.variantAttributeOption.findUnique({
          where: {
            attributeId_value: {
              attributeId,
              value: dto.value,
            },
          },
        });

      if (duplicate && duplicate.id !== optionId) {
        throw new BadRequestException(
          'This option already exists for selected attribute',
        );
      }
    }

    return this.prisma.variantAttributeOption.update({
      where: { id: optionId },
      data: dto,
      include: {
        attribute: true,
      },
    });
  }

  async removeOption(attributeId: number, optionId: number) {
    const option = await this.prisma.variantAttributeOption.findFirst({
      where: {
        id: optionId,
        attributeId,
      },
    });

    if (!option) {
      throw new NotFoundException('Attribute option not found');
    }

    const usedValues = await this.prisma.variantAttributeValue.count({
      where: { optionId },
    });

    if (usedValues > 0) {
      throw new BadRequestException(
        'Option is already used by variants. Disable it instead.',
      );
    }

    return this.prisma.variantAttributeOption.delete({
      where: { id: optionId },
    });
  }
}
