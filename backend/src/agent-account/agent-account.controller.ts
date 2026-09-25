import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type {
  Request,
  Response,
} from 'express';

import { AgentSessionGuard } from '../agent-session/agent-session.guard.js';

import type { AgentAuthenticatedRequest } from '../agent-session/agent-session.guard.js';

import { AgentSessionService } from '../agent-session/agent-session.service.js';

@Controller('agent-account')
export class AgentAccountController {
  constructor(
    private readonly sessionService:
      AgentSessionService,
  ) {}

  @Get('me')
  @UseGuards(AgentSessionGuard)
  getMe(
    @Req()
    request: AgentAuthenticatedRequest,
  ) {
    const session =
      request.agentSession;

    if (!session) {
      return {
        authenticated: false,
      };
    }

    return {
      authenticated: true,

      agent: session.agent,

      vendor: {
        vendorCode:
          session.vendor.vendorCode,

        businessName:
          session.vendor.businessName,
      },
    };
  }

  @Post('logout')
  async logout(
    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const token =
      this.getSessionToken(request);

    await this.sessionService.logout(
      token,
    );

    this.clearSessionCookie(
      request,
      response,
    );

    return {
      authenticated: false,
    };
  }

  private getSessionToken(
    request: Request,
  ): string | undefined {
    const cookieName =
      this.sessionService.getCookieName();

    const cookieToken =
      request.cookies?.[
        cookieName
      ] as string | undefined;

    if (cookieToken) {
      return cookieToken;
    }

    const cookieHeader =
      request.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    for (
      const cookie of
      cookieHeader.split(';')
    ) {
      const separatorIndex =
        cookie.indexOf('=');

      if (separatorIndex <= 0) {
        continue;
      }

      const key = cookie
        .slice(0, separatorIndex)
        .trim();

      if (key !== cookieName) {
        continue;
      }

      const value = cookie
        .slice(separatorIndex + 1)
        .trim();

      try {
        return decodeURIComponent(
          value,
        );
      } catch {
        return value;
      }
    }

    return undefined;
  }

  private clearSessionCookie(
    request: Request,
    response: Response,
  ): void {
    const hostname =
      request.hostname
        ?.toLowerCase();

    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1';

    const secure =
      process.env.NODE_ENV ===
        'production' &&
      !isLocal;

    response.clearCookie(
      this.sessionService.getCookieName(),
      {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
      },
    );
  }
}