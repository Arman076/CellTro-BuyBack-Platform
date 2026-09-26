import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AgentSessionGuard } from '../agent-session/agent-session.guard.js';

import type { AgentAuthenticatedRequest } from '../agent-session/agent-session.guard.js';

import { AgentInspectionService } from './agent-inspection.service.js';

type InspectionAnswersBody = {
  answers: Array<{
    questionId: number;
    optionIds: number[];
  }>;
};

@Controller('agent-orders/:orderNumber/inspection')
@UseGuards(AgentSessionGuard)
export class AgentInspectionController {
  constructor(private readonly inspectionService: AgentInspectionService) {}

  private getIdentity(request: AgentAuthenticatedRequest) {
    const session = request.agentSession;

    if (!session) {
      throw new UnauthorizedException('Agent session is required.');
    }

    return {
      agentId: session.agentId,

      vendorId: session.vendorId,
    };
  }

  @Get()
  getInspection(
    @Req()
    request: AgentAuthenticatedRequest,

    @Param('orderNumber')
    orderNumber: string,
  ) {
    return this.inspectionService.getInspection(
      this.getIdentity(request),
      orderNumber,
    );
  }

  @Patch('answers')
  saveAnswers(
    @Req()
    request: AgentAuthenticatedRequest,

    @Param('orderNumber')
    orderNumber: string,

    @Body()
    body: InspectionAnswersBody,
  ) {
    return this.inspectionService.saveAnswers(
      this.getIdentity(request),
      orderNumber,
      body,
    );
  }

  @Post('complete')
  completeInspection(
    @Req()
    request: AgentAuthenticatedRequest,

    @Param('orderNumber')
    orderNumber: string,

    @Body()
    body: InspectionAnswersBody,
  ) {
    return this.inspectionService.completeInspection(
      this.getIdentity(request),
      orderNumber,
      body,
    );
  }
}
