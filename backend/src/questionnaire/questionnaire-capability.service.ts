import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

@Injectable()
export class QuestionnaireCapabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getCapabilities() {
    return this.prisma.deviceCapability.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getProductCapabilities(productId: number) {
    await this.ensureProduct(productId);

    return this.prisma.productCapability.findMany({
      where: { productId },
      include: { capability: true },
      orderBy: { capability: { displayOrder: 'asc' } },
    });
  }

  async setProductCapabilities(productId: number, capabilityIds: number[]) {
    await this.ensureProduct(productId);

    const ids = this.cleanIds(capabilityIds);

    if (ids.length) {
      const count = await this.prisma.deviceCapability.count({
        where: { id: { in: ids }, isActive: true },
      });

      if (count !== ids.length) {
        throw new BadRequestException(
          'One or more capabilities are invalid or inactive',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productCapability.deleteMany({ where: { productId } });

      if (ids.length) {
        await tx.productCapability.createMany({
          data: ids.map((capabilityId) => ({
            productId,
            capabilityId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.getProductCapabilities(productId);
  }

  async setOptionCapabilities(optionId: number, capabilityIds: number[]) {
    const option = await this.prisma.questionnaireOption.findUnique({
      where: { id: optionId },
    });

    if (!option) {
      throw new NotFoundException('Questionnaire option not found');
    }

    const ids = this.cleanIds(capabilityIds);

    if (ids.length) {
      const count = await this.prisma.deviceCapability.count({
        where: { id: { in: ids }, isActive: true },
      });

      if (count !== ids.length) {
        throw new BadRequestException(
          'One or more capabilities are invalid or inactive',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.questionnaireOptionCapability.deleteMany({
        where: { optionId },
      });

      if (ids.length) {
        await tx.questionnaireOptionCapability.createMany({
          data: ids.map((capabilityId) => ({
            optionId,
            capabilityId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.prisma.questionnaireOption.findUnique({
      where: { id: optionId },
      include: {
        capabilities: {
          include: { capability: true },
        },
      },
    });
  }

  private cleanIds(ids: number[]) {
    return [
      ...new Set(
        (ids || [])
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
  }

  private async ensureProduct(productId: number) {
    const id = Number(productId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }
}
