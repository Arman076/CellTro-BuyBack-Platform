import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum PartnerLeadStatusDto {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UpdatePartnerLeadDto {
  @IsOptional()
  @IsEnum(PartnerLeadStatusDto)
  status?: PartnerLeadStatusDto;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  adminNotes?: string;
}