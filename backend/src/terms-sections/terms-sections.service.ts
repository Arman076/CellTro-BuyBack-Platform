import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

import { CreateTermsSectionDto } from './dto/create-terms-section.dto.js';
import { UpdateTermsSectionDto } from './dto/update-terms-section.dto.js';

@Injectable()
export class TermsSectionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findPublic() {
    return this.prisma.termsSection.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          displayOrder: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  }

  async findAll() {
    return this.prisma.termsSection.findMany({
      orderBy: [
        {
          displayOrder: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  }

  async findOne(id: number) {
    const section =
      await this.prisma.termsSection.findUnique({
        where: {
          id,
        },
      });

    if (!section) {
      throw new NotFoundException(
        `Terms section with id ${id} not found.`,
      );
    }

    return section;
  }

  async create(
    dto: CreateTermsSectionDto,
  ) {
    return this.prisma.termsSection.create({
      data: {
        title: dto.title.trim(),
        content: dto.content.trim(),
        displayOrder:
          dto.displayOrder ?? 0,
        isActive:
          dto.isActive ?? true,
      },
    });
  }

  async update(
    id: number,
    dto: UpdateTermsSectionDto,
  ) {
    await this.findOne(id);

    return this.prisma.termsSection.update({
      where: {
        id,
      },
      data: {
        ...(dto.title !== undefined
          ? {
              title: dto.title.trim(),
            }
          : {}),

        ...(dto.content !== undefined
          ? {
              content: dto.content.trim(),
            }
          : {}),

        ...(dto.displayOrder !== undefined
          ? {
              displayOrder:
                dto.displayOrder,
            }
          : {}),

        ...(dto.isActive !== undefined
          ? {
              isActive: dto.isActive,
            }
          : {}),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.termsSection.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message:
        'Terms section deleted successfully.',
    };
  }
}