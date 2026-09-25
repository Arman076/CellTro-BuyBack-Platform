import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';

export class SendAgentEmailOtpDto {
  @IsEmail()
  email!: string;
}

export class VerifyAgentEmailOtpDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}