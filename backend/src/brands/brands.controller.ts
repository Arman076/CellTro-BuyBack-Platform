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

import { BrandsService } from './brands.service.js';

import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';

@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
  ) {}

  @Post()
  create(
    @Body() createBrandDto: CreateBrandDto,
  ) {
    return this.brandsService.create(
      createBrandDto,
    );
  }

  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
  ) {
    return this.brandsService.findAll(
      categoryId
        ? Number(categoryId)
        : undefined,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.brandsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    return this.brandsService.update(
      id,
      updateBrandDto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.brandsService.remove(id);
  }
}