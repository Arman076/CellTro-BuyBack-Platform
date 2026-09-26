import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
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
  AgentOrderVerificationService,
} from './agent-order-verification.service.js';

import {
  SendOrderVerificationDto,
} from './dto/send-order-verification.dto.js';

import {
  VerifyOrderVerificationDto,
} from './dto/verify-order-verification.dto.js';

@Controller(
  'agent-orders/:orderNumber/verification',
)
@UseGuards(AgentSessionGuard)
export class AgentOrderVerificationController {
  constructor(
    private readonly verificationService:
      AgentOrderVerificationService,
  ) {}

  private getIdentity(
    request: AgentAuthenticatedRequest,
  ) {
    const session =
      request.agentSession;

    if (!session) {
      throw new UnauthorizedException(
        'Agent session is required.',
      );
    }

    return {
      agentId:
        session.agentId,

      vendorId:
        session.vendorId,
    };
  }

  @Post('send')
  send(
    @Req()
    request: AgentAuthenticatedRequest,

    @Param('orderNumber')
    orderNumber: string,

    @Body()
    body: SendOrderVerificationDto,
  ) {
    return this.verificationService.send(
      this.getIdentity(
        request,
      ),
      orderNumber,
      body,
    );
  }

  @Post('verify')
  verify(
    @Req()
    request: AgentAuthenticatedRequest,

    @Param('orderNumber')
    orderNumber: string,

    @Body()
    body: VerifyOrderVerificationDto,
  ) {
    return this.verificationService.verify(
      this.getIdentity(
        request,
      ),
      orderNumber,
      body.challengeId,
      body.otp,
      body.destination,
    );
  }

  @Post('start-inspection')
  startInspection(
    @Req()
    request: AgentAuthenticatedRequest,

    @Param('orderNumber')
    orderNumber: string,

    @Body()
    body: {
      challengeId?: string;
    },
  ) {
    const challengeId =
      String(
        body?.challengeId ??
          '',
      ).trim();

    if (!challengeId) {
      throw new UnauthorizedException(
        'Verified inspection challenge is required.',
      );
    }

    return this.verificationService.startInspection(
      this.getIdentity(
        request,
      ),
      orderNumber,
      challengeId,
    );
  }

  @Post('quote-decision')
  quoteDecision(
    @Req()
    request: AgentAuthenticatedRequest,

    @Param('orderNumber')
    orderNumber: string,

    @Body()
    body: {
      challengeId?: string;
      decision?: string;
    },
  ) {
    const challengeId =
      String(
        body?.challengeId ??
          '',
      ).trim();

    const decision =
      String(
        body?.decision ??
          '',
      )
        .trim()
        .toUpperCase();

    if (!challengeId) {
      throw new UnauthorizedException(
        'Verified quote decision challenge is required.',
      );
    }

    if (
      decision !== 'ACCEPTED' &&
      decision !== 'REJECTED'
    ) {
      throw new BadRequestException(
        'Decision must be ACCEPTED or REJECTED.',
      );
    }

    return this.verificationService.commitQuoteDecision(
      this.getIdentity(
        request,
      ),
      orderNumber,
      challengeId,
      decision,
    );
  }
}
