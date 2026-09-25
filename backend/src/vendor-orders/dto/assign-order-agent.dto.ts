import {
  IsInt,
  Min,
} from "class-validator";

export class AssignOrderAgentDto {
  @IsInt()
  @Min(1)
  agentId!: number;
}