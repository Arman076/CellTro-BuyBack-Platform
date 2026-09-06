import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateSiteSettingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  tagline?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{8,20}$/, {
    message: 'Support phone number is invalid',
  })
  supportPhone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{8,20}$/, {
    message: 'WhatsApp number is invalid',
  })
  whatsappNumber?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  supportEmail?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  businessEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  officeAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/, {
    message: 'Pincode must contain exactly 6 digits',
  })
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessHours?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  facebookUrl?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  instagramUrl?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  linkedinUrl?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  youtubeUrl?: string;
}