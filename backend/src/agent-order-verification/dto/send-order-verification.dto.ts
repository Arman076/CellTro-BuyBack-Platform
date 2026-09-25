import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  OrderVerificationPurpose,
} from '../../generated/prisma/client.js';

export class SendOrderVerificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  destination!: string;

  @IsEnum(
    OrderVerificationPurpose,
  )
  purpose!: OrderVerificationPurpose;
}