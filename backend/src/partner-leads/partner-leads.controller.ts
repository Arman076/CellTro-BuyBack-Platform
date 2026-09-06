import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { PartnerLeadsService } from './partner-leads.service.js';

import { CreatePartnerLeadDto } from './dto/create-partner-lead.dto.js';
import { UpdatePartnerLeadDto } from './dto/update-partner-lead.dto.js';

@Controller('partner-leads')
export class PartnerLeadsController {
  constructor(
    private readonly service: PartnerLeadsService,
  ) {}

  // Public customer application endpoint
  @Post()
  create(
    @Body()
    dto: CreatePartnerLeadDto,
  ) {
    return this.service.create(dto);
  }

  // Admin
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // Admin
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.service.findOne(id);
  }

  // Admin
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdatePartnerLeadDto,
  ) {
    return this.service.update(
      id,
      dto,
    );
  }
}