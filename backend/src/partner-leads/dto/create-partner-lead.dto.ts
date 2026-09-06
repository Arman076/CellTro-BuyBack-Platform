import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export enum PartnerTypeDto {
  BUYBACK_VENDOR = 'BUYBACK_VENDOR',
  PICKUP_PARTNER = 'PICKUP_PARTNER',
  BUSINESS_PARTNER = 'BUSINESS_PARTNER',
}

export class CreatePartnerLeadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  businessName?: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message:
      'Mobile number must be a valid 10-digit Indian mobile number.',
  })
  mobile: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsEnum(PartnerTypeDto)
  partnerType: PartnerTypeDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'Pincode must contain 6 digits.',
  })
  pincode: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gstNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}