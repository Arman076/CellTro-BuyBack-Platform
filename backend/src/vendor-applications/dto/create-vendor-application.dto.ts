import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateVendorApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  businessName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  contactName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message:
      'Mobile number must be a valid 10 digit Indian mobile number',
  })
  mobile!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, {
    message: 'PAN number is invalid',
  })
  pan?: string;

  @IsString()
  @Length(12, 12)
  @Matches(/^\d{12}$/, {
    message:
      'Aadhaar number must contain exactly 12 digits',
  })
  aadhaar!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  challengeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  verificationToken!: string;
}