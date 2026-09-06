import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

import { CreateContactLeadDto } from './dto/create-contact-lead.dto.js';
import { UpdateContactLeadDto } from './dto/update-contact-lead.dto.js';

@Injectable()
export class ContactLeadsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateContactLeadDto) {
    return this.prisma.contactLead.create({
      data: {
        fullName: dto.fullName.trim(),
        mobile: dto.mobile.trim(),

        email:
          dto.email?.trim().toLowerCase() ||
          null,

        subject:
          dto.subject?.trim() || null,

        message: dto.message.trim(),
      },
    });
  }

  async findAll() {
    return this.prisma.contactLead.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const lead =
      await this.prisma.contactLead.findUnique({
        where: {
          id,
        },
      });

    if (!lead) {
      throw new NotFoundException(
        `Contact enquiry ${id} not found.`,
      );
    }

    return lead;
  }

  async update(
    id: number,
    dto: UpdateContactLeadDto,
  ) {
    await this.findOne(id);

    return this.prisma.contactLead.update({
      where: {
        id,
      },

      data: {
        ...(dto.status !== undefined
          ? {
              status: dto.status,
            }
          : {}),

        ...(dto.adminNotes !== undefined
          ? {
              adminNotes:
                dto.adminNotes.trim() ||
                null,
            }
          : {}),
      },
    });
  }
}