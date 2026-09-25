import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import {
  AgentSessionGuard,
} from '../agent-session/agent-session.guard.js';

import type {
  AgentAuthenticatedRequest,
} from '../agent-session/agent-session.guard.js';

import {
  AgentDashboardService,
} from './agent-dashboard.service.js';

@Controller('agent-dashboard')
@UseGuards(AgentSessionGuard)
export class AgentDashboardController {
  constructor(
    private readonly agentDashboardService:
      AgentDashboardService,
  ) {}

  @Get()
  async getDashboard(
    @Req()
    request: AgentAuthenticatedRequest,

    @Query('range')
    range?: string,
  ) {
    const session =
      request.agentSession;

    if (!session) {
      throw new UnauthorizedException(
        'Agent session is required.',
      );
    }

    const dashboard =
      await this.agentDashboardService.getDashboard(
        session.agentId,
        session.vendorId,
        {
          range,
        },
      );

    return {
      agent: {
        id:
          session.agent.id,

        agentCode:
          session.agent.agentCode,

        fullName:
          session.agent.fullName,
      },

      vendor: {
        vendorCode:
          session.vendor.vendorCode,

        businessName:
          session.vendor.businessName,
      },

      ...dashboard,
    };
  }
}