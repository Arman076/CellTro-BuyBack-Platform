import {
  IsEnum,
  IsOptional,
} from 'class-validator';

import { AgentStatus } from '../../generated/prisma/enums.js';

export class ListVendorAgentsDto {
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;
}