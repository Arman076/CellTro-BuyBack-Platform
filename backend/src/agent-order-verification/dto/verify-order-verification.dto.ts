import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class VerifyOrderVerificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  challengeId!: string;

  @IsString()
  @Matches(
    /^\d{4,9}$/,
    {
      message:
        'Enter a valid OTP.',
    },
  )
  otp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  destination?: string;
}