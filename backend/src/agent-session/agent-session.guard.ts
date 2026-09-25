import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import type { Request } from 'express';

import {
  AgentSessionService,
  AuthenticatedAgentSession,
} from './agent-session.service.js';

export type AgentAuthenticatedRequest =
  Request & {
    agentSession?: AuthenticatedAgentSession;
  };

@Injectable()
export class AgentSessionGuard
  implements CanActivate
{
  constructor(
    private readonly sessionService:
      AgentSessionService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context
        .switchToHttp()
        .getRequest<AgentAuthenticatedRequest>();

    const token =
      this.getSessionToken(request);

    request.agentSession =
      await this.sessionService.getSession(
        token,
      );

    return true;
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

    /*
     * Safe fallback in case cookie-parser
     * is unavailable on a specific runtime.
     */
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
}