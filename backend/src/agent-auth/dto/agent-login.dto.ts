import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class AgentLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password!: string;
}