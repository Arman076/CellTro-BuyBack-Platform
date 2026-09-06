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

import { VariantsService } from './variants.service.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';

@Controller('variants')
export class VariantsController {
  constructor(
    private readonly variantsService: VariantsService,
  ) {}

  @Post()
  create(
    @Body()
    createVariantDto: CreateVariantDto,
  ) {
    return this.variantsService.create(
      createVariantDto,
    );
  }

  @Get()
  findAll(
    @Query('productId')
    productId?: string,

    @Query('categoryId')
    categoryId?: string,

    @Query('brandId')
    brandId?: string,
  ) {
    return this.variantsService.findAll(
      productId
        ? Number(productId)
        : undefined,

      categoryId
        ? Number(categoryId)
        : undefined,

      brandId
        ? Number(brandId)
        : undefined,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.variantsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    updateVariantDto: UpdateVariantDto,
  ) {
    return this.variantsService.update(
      id,
      updateVariantDto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.variantsService.remove(id);
  }
}