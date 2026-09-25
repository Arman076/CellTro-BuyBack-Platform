import {
  Controller,
  Get,
  Param,
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
  AgentOrdersService,
} from './agent-orders.service.js';

@Controller('agent-orders')
@UseGuards(AgentSessionGuard)
export class AgentOrdersController {
  constructor(
    private readonly agentOrdersService:
      AgentOrdersService,
  ) {}

  @Get()
  async listOrders(
    @Req()
    request: AgentAuthenticatedRequest,

    @Query('search')
    search?: string,

    @Query('statusGroup')
    statusGroup?: string,

    @Query('dateFilter')
    dateFilter?: string,

    @Query('page')
    page?: string,

    @Query('limit')
    limit?: string,
  ) {
    const session =
      request.agentSession;

    if (!session) {
      throw new UnauthorizedException(
        'Agent session is required.',
      );
    }

    return this.agentOrdersService.listOrders(
      session.agentId,
      session.vendorId,
      {
        search,
        statusGroup,
        dateFilter,
        page,
        limit,
      },
    );
  }

  @Get(':orderNumber')
  async getOrder(
    @Req()
    request: AgentAuthenticatedRequest,

    @Param('orderNumber')
    orderNumber: string,
  ) {
    const session =
      request.agentSession;

    if (!session) {
      throw new UnauthorizedException(
        'Agent session is required.',
      );
    }

    return this.agentOrdersService.getOrder(
      session.agentId,
      session.vendorId,
      orderNumber,
    );
  }
}