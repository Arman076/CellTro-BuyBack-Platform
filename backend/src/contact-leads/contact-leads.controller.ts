import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { ContactLeadsService } from './contact-leads.service.js';

import { CreateContactLeadDto } from './dto/create-contact-lead.dto.js';
import { UpdateContactLeadDto } from './dto/update-contact-lead.dto.js';

@Controller('contact-leads')
export class ContactLeadsController {
  constructor(
    private readonly service: ContactLeadsService,
  ) {}

  // Public
  @Post()
  create(
    @Body()
    dto: CreateContactLeadDto,
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
    dto: UpdateContactLeadDto,
  ) {
    return this.service.update(
      id,
      dto,
    );
  }
}