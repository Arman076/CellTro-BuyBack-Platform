import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProductSeriesDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsInt()
  categoryId: number;

  @IsInt()
  brandId: number;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}