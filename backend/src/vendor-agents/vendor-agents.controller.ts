import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';

import { VendorAuthService } from '../vendor-auth/vendor-auth.service.js';

import { ListVendorAgentsDto } from './dto/list-vendor-agents.dto.js';
import { RejectAgentDto } from './dto/reject-agent.dto.js';
import { VendorAgentsService } from './vendor-agents.service.js';

@Controller('vendor-agents')
export class VendorAgentsController {
  constructor(
    private readonly vendorAgentsService:
      VendorAgentsService,

    private readonly vendorAuthService:
      VendorAuthService,
  ) {}

  private getSessionToken(
    req: Request,
  ): string | undefined {
    const cookieName =
      this.vendorAuthService.getCookieName();

    const parsedToken =
      req.cookies?.[cookieName];

    if (
      typeof parsedToken === 'string' &&
      parsedToken
    ) {
      return parsedToken;
    }

    const cookieHeader =
      req.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    for (
      const cookie of cookieHeader.split(';')
    ) {
      const separatorIndex =
        cookie.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const name = cookie
        .slice(0, separatorIndex)
        .trim();

      if (name !== cookieName) {
        continue;
      }

      const value = cookie
        .slice(separatorIndex + 1)
        .trim();

      if (!value) {
        return undefined;
      }

      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }

    return undefined;
  }

  private async getVendorSession(
    req: Request,
  ) {
    const session =
      await this.vendorAuthService.getSession(
        this.getSessionToken(req),
      );

    if (session.mustChangePassword) {
      throw new BadRequestException(
        'Please change your password before managing agents.',
      );
    }

    return session;
  }

  /*
   * ========================================================
   * PENDING REGISTRATION REQUESTS
   * ========================================================
   */

  @Get('requests')
  async getPendingRequests(
    @Req() req: Request,
  ) {
    const session =
      await this.getVendorSession(req);

    const agents =
      await this.vendorAgentsService.getPendingAgents(
        session.vendorId,
      );

    return {
      agents,
    };
  }

  @Get('requests/:agentId')
  async getRequest(
    @Req() req: Request,

    @Param(
      'agentId',
      ParseIntPipe,
    )
    agentId: number,
  ) {
    const session =
      await this.getVendorSession(req);

    return this.vendorAgentsService.getAgentRequest(
      session.vendorId,
      agentId,
    );
  }

  /*
   * ========================================================
   * AGENT MANAGEMENT
   * ========================================================
   */

  @Get()
  async getAgents(
    @Req() req: Request,

    @Query()
    query: ListVendorAgentsDto,
  ) {
    const session =
      await this.getVendorSession(req);

    const agents =
      await this.vendorAgentsService.getAgents(
        session.vendorId,
        query.status,
      );

    return {
      agents,
    };
  }

  @Get(':agentId')
  async getAgent(
    @Req() req: Request,

    @Param(
      'agentId',
      ParseIntPipe,
    )
    agentId: number,
  ) {
    const session =
      await this.getVendorSession(req);

    return this.vendorAgentsService.getAgent(
      session.vendorId,
      agentId,
    );
  }

  /*
   * ========================================================
   * APPROVE / REJECT
   * ========================================================
   */

  @Post(':agentId/approve')
  async approve(
    @Req() req: Request,

    @Param(
      'agentId',
      ParseIntPipe,
    )
    agentId: number,
  ) {
    const session =
      await this.getVendorSession(req);

    return this.vendorAgentsService.approveAgent(
      session.vendorId,
      agentId,
    );
  }

  @Post(':agentId/reject')
  async reject(
    @Req() req: Request,

    @Param(
      'agentId',
      ParseIntPipe,
    )
    agentId: number,

    @Body()
    dto: RejectAgentDto,
  ) {
    const session =
      await this.getVendorSession(req);

    return this.vendorAgentsService.rejectAgent(
      session.vendorId,
      agentId,
      dto.reason,
    );
  }
}