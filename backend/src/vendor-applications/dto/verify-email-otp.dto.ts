import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class VerifyEmailOtpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  challengeId!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}