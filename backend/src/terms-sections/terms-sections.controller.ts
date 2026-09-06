import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { TermsSectionsService } from './terms-sections.service.js';

import { CreateTermsSectionDto } from './dto/create-terms-section.dto.js';
import { UpdateTermsSectionDto } from './dto/update-terms-section.dto.js';

@Controller('terms-sections')
export class TermsSectionsController {
  constructor(
    private readonly termsSectionsService: TermsSectionsService,
  ) {}

  @Get('public')
  findPublic() {
    return this.termsSectionsService.findPublic();
  }

  @Get()
  findAll() {
    return this.termsSectionsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.termsSectionsService.findOne(id);
  }

  @Post()
  create(
    @Body()
    dto: CreateTermsSectionDto,
  ) {
    return this.termsSectionsService.create(
      dto,
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateTermsSectionDto,
  ) {
    return this.termsSectionsService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.termsSectionsService.remove(id);
  }
}