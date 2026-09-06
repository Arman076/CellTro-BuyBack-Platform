import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ContactLeadStatusDto {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class UpdateContactLeadDto {
  @IsOptional()
  @IsEnum(ContactLeadStatusDto)
  status?: ContactLeadStatusDto;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  adminNotes?: string;
}