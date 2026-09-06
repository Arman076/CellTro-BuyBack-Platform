import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

import { CreateVariantDto } from './dto/create-variant.dto.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVariantDto: CreateVariantDto) {
    const {
      productId,
      basePrice,
      isActive,
      values,
    } = createVariantDto;

    const product =
      await this.prisma.product.findUnique({
        where: {
          id: productId,
        },
      });

    if (!product) {
      throw new BadRequestException(
        'Selected product does not exist',
      );
    }

    await this.validateVariantValues(
      product.categoryId,
      values,
    );

    await this.checkDuplicateVariant(
      productId,
      values,
    );

    return this.prisma.productVariant.create({
      data: {
        productId,
        basePrice,
        isActive: isActive ?? true,

        values: {
          create: values.map((value) => ({
            attributeId: value.attributeId,
            optionId: value.optionId,
          })),
        },
      },

      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },

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
    });
  }

  async findAll(
    productId?: number,
    categoryId?: number,
    brandId?: number,
  ) {
    return this.prisma.productVariant.findMany({
      where: {
        ...(productId
          ? {
              productId,
            }
          : {}),

        ...(categoryId || brandId
          ? {
              product: {
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
            }
          : {}),
      },

      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },

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
    });
  }

  async findOne(id: number) {
    const variant =
      await this.prisma.productVariant.findUnique({
        where: {
          id,
        },

        include: {
          product: {
            include: {
              category: true,
              brand: true,
            },
          },

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
      });

    if (!variant) {
      throw new NotFoundException(
        `Variant with ID ${id} not found`,
      );
    }

    return variant;
  }

  async update(
    id: number,
    updateVariantDto: UpdateVariantDto,
  ) {
    const existingVariant =
      await this.prisma.productVariant.findUnique({
        where: {
          id,
        },

        include: {
          values: true,
        },
      });

    if (!existingVariant) {
      throw new NotFoundException(
        `Variant with ID ${id} not found`,
      );
    }

    const productId =
      updateVariantDto.productId ??
      existingVariant.productId;

    const product =
      await this.prisma.product.findUnique({
        where: {
          id: productId,
        },
      });

    if (!product) {
      throw new BadRequestException(
        'Selected product does not exist',
      );
    }

    const values =
      updateVariantDto.values ??
      existingVariant.values.map(
        (value) => ({
          attributeId: value.attributeId,
          optionId: value.optionId,
        }),
      );

    await this.validateVariantValues(
      product.categoryId,
      values,
    );

    await this.checkDuplicateVariant(
      productId,
      values,
      id,
    );

    const {
      values: dtoValues,
      ...variantData
    } = updateVariantDto;

    return this.prisma.$transaction(
      async (tx) => {
        if (dtoValues) {
          await tx.variantAttributeValue.deleteMany({
            where: {
              variantId: id,
            },
          });
        }

        return tx.productVariant.update({
          where: {
            id,
          },

          data: {
            ...variantData,

            ...(dtoValues
              ? {
                  values: {
                    create: dtoValues.map(
                      (value) => ({
                        attributeId:
                          value.attributeId,

                        optionId:
                          value.optionId,
                      }),
                    ),
                  },
                }
              : {}),
          },

          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },

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
        });
      },
    );
  }

  async remove(id: number) {
    const variant =
      await this.prisma.productVariant.findUnique({
        where: {
          id,
        },
      });

    if (!variant) {
      throw new NotFoundException(
        `Variant with ID ${id} not found`,
      );
    }

    return this.prisma.productVariant.delete({
      where: {
        id,
      },
    });
  }

  private async validateVariantValues(
    categoryId: number,
    values: {
      attributeId: number;
      optionId: number;
    }[],
  ) {
    if (!values || values.length === 0) {
      throw new BadRequestException(
        'At least one variant attribute must be selected',
      );
    }

    const selectedAttributeIds =
      values.map(
        (value) => value.attributeId,
      );

    const uniqueAttributeIds =
      new Set(selectedAttributeIds);

    if (
      uniqueAttributeIds.size !==
      selectedAttributeIds.length
    ) {
      throw new BadRequestException(
        'Same attribute cannot be selected more than once',
      );
    }

    const attributes =
      await this.prisma.variantAttribute.findMany({
        where: {
          id: {
            in: selectedAttributeIds,
          },

          categoryId,
          isActive: true,
        },

        include: {
          options: {
            where: {
              isActive: true,
            },
          },
        },
      });

    if (
      attributes.length !==
      selectedAttributeIds.length
    ) {
      throw new BadRequestException(
        'One or more selected attributes do not belong to this product category',
      );
    }

    for (const value of values) {
      const attribute =
        attributes.find(
          (item) =>
            item.id === value.attributeId,
        );

      if (!attribute) {
        throw new BadRequestException(
          'Invalid variant attribute',
        );
      }

      const optionExists =
        attribute.options.some(
          (option) =>
            option.id === value.optionId,
        );

      if (!optionExists) {
        throw new BadRequestException(
          `Selected option does not belong to attribute "${attribute.name}"`,
        );
      }
    }
  }

  private async checkDuplicateVariant(
    productId: number,
    values: {
      attributeId: number;
      optionId: number;
    }[],
    excludeVariantId?: number,
  ) {
    const existingVariants =
      await this.prisma.productVariant.findMany({
        where: {
          productId,

          ...(excludeVariantId
            ? {
                id: {
                  not: excludeVariantId,
                },
              }
            : {}),
        },

        include: {
          values: true,
        },
      });

    const normalizedIncoming =
      values
        .map(
          (value) =>
            `${value.attributeId}:${value.optionId}`,
        )
        .sort()
        .join('|');

    for (const variant of existingVariants) {
      const normalizedExisting =
        variant.values
          .map(
            (value) =>
              `${value.attributeId}:${value.optionId}`,
          )
          .sort()
          .join('|');

      if (
        normalizedExisting ===
        normalizedIncoming
      ) {
        throw new BadRequestException(
          'Same variant configuration already exists for this model',
        );
      }
    }
  }
}