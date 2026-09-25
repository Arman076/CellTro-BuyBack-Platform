import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AgentRegistrationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Invalid mobile number',
  })
  mobile!: string;

  @IsString()
  @Matches(/^\d{12}$/, {
    message: 'Aadhaar number must contain exactly 12 digits',
  })
  aadhaarNumber!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  vendorCode!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(72)
  password!: string;

  @IsString()
  @IsNotEmpty()
  verificationToken!: string;
}