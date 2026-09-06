import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

import { CreatePartnerLeadDto } from './dto/create-partner-lead.dto.js';
import { UpdatePartnerLeadDto } from './dto/update-partner-lead.dto.js';

@Injectable()
export class PartnerLeadsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreatePartnerLeadDto) {
    return this.prisma.partnerLead.create({
      data: {
        fullName: dto.fullName.trim(),

        businessName:
          dto.businessName?.trim() || null,

        mobile: dto.mobile.trim(),

        email:
          dto.email?.trim().toLowerCase() ||
          null,

        partnerType: dto.partnerType,

        city: dto.city.trim(),

        pincode: dto.pincode.trim(),

        businessAddress:
          dto.businessAddress?.trim() ||
          null,

        gstNumber:
          dto.gstNumber
            ?.trim()
            .toUpperCase() || null,

        message:
          dto.message?.trim() || null,
      },
    });
  }

  async findAll() {
    return this.prisma.partnerLead.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const lead =
      await this.prisma.partnerLead.findUnique({
        where: {
          id,
        },
      });

    if (!lead) {
      throw new NotFoundException(
        `Partner application ${id} not found.`,
      );
    }

    return lead;
  }

  async update(
    id: number,
    dto: UpdatePartnerLeadDto,
  ) {
    await this.findOne(id);

    return this.prisma.partnerLead.update({
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