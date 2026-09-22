import {
  IsEmail,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class SendEmailOtpDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;
}