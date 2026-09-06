import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { VariantAttributesService } from './variant-attributes.service.js';
import { CreateVariantAttributeDto } from './dto/create-variant-attribute.dto.js';
import { UpdateVariantAttributeDto } from './dto/update-variant-attribute.dto.js';
import { CreateAttributeOptionDto } from './dto/create-attribute-option.dto.js';
import { UpdateAttributeOptionDto } from './dto/update-attribute-option.dto.js';

@Controller('variant-attributes')
export class VariantAttributesController {
  constructor(
    private readonly variantAttributesService: VariantAttributesService,
  ) {}

  @Post()
  create(@Body() dto: CreateVariantAttributeDto) {
    return this.variantAttributesService.create(dto);
  }

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.variantAttributesService.findAll(
      categoryId ? Number(categoryId) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.variantAttributesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVariantAttributeDto,
  ) {
    return this.variantAttributesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.variantAttributesService.remove(id);
  }

  @Post(':id/options')
  createOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAttributeOptionDto,
  ) {
    return this.variantAttributesService.createOption(id, dto);
  }

  @Patch(':attributeId/options/:optionId')
  updateOption(
    @Param('attributeId', ParseIntPipe) attributeId: number,
    @Param('optionId', ParseIntPipe) optionId: number,
    @Body() dto: UpdateAttributeOptionDto,
  ) {
    return this.variantAttributesService.updateOption(
      attributeId,
      optionId,
      dto,
    );
  }

  @Delete(':attributeId/options/:optionId')
  removeOption(
    @Param('attributeId', ParseIntPipe) attributeId: number,
    @Param('optionId', ParseIntPipe) optionId: number,
  ) {
    return this.variantAttributesService.removeOption(
      attributeId,
      optionId,
    );
  }
}
