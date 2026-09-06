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

import { ProductSeriesService } from './product-series.service.js';

import { CreateProductSeriesDto } from './dto/create-product-series.dto.js';
import { UpdateProductSeriesDto } from './dto/update-product-series.dto.js';

@Controller('product-series')
export class ProductSeriesController {
  constructor(
    private readonly productSeriesService:
      ProductSeriesService,
  ) {}

  @Post()
  create(
    @Body()
    dto: CreateProductSeriesDto,
  ) {
    return this.productSeriesService.create(
      dto,
    );
  }

  @Get()
  findAll(
    @Query('categoryId')
    categoryId?: string,

    @Query('brandId')
    brandId?: string,
  ) {
    return this.productSeriesService.findAll(
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
    return this.productSeriesService.findOne(
      id,
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateProductSeriesDto,
  ) {
    return this.productSeriesService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.productSeriesService.remove(
      id,
    );
  }
}