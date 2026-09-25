import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { createHash } from 'node:crypto';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

export type AuthenticatedAgentSession = {
  sessionId: string;
  agentId: number;
  vendorId: number;

  agent: {
    id: number;
    agentCode: string;
    fullName: string;
    email: string;
    mobile: string;
    status: string;
  };

  vendor: {
    id: number;
    vendorCode: string;
    businessName: string;
    status: string;
  };
};

@Injectable()
export class AgentSessionService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  getCookieName(): string {
    return (
      process.env.AGENT_SESSION_COOKIE_NAME ??
      'celltro_agent_session'
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  private getIdleTimeoutMs(): number {
    const minutes = Number(
      process.env.AGENT_SESSION_IDLE_MINUTES ?? 30,
    );

    const safeMinutes =
      Number.isFinite(minutes) && minutes > 0
        ? minutes
        : 30;

    return safeMinutes * 60 * 1000;
  }

  async getSession(
    rawToken: string | undefined,
  ): Promise<AuthenticatedAgentSession> {
    if (!rawToken) {
      throw new UnauthorizedException(
        'Authentication required',
      );
    }

    const tokenHash = this.hashToken(rawToken);

    const session =
      await this.prisma.agentSession.findUnique({
        where: {
          tokenHash,
        },

        select: {
          id: true,
          agentId: true,
          expiresAt: true,
          lastSeenAt: true,
          revokedAt: true,

          agent: {
            select: {
              id: true,
              agentCode: true,
              vendorId: true,
              fullName: true,
              email: true,
              mobile: true,
              status: true,

              vendor: {
                select: {
                  id: true,
                  vendorCode: true,
                  businessName: true,
                  status: true,
                },
              },
            },
          },
        },
      });

    if (
      !session ||
      session.revokedAt
    ) {
      throw new UnauthorizedException(
        'Session is invalid or has expired',
      );
    }

    const now = new Date();

    if (
      session.expiresAt.getTime() <=
      now.getTime()
    ) {
      await this.revokeSession(
        session.id,
      );

      throw new UnauthorizedException(
        'Session has expired',
      );
    }

    const idleTimeoutMs =
      this.getIdleTimeoutMs();

    const idleForMs =
      now.getTime() -
      session.lastSeenAt.getTime();

    if (idleForMs > idleTimeoutMs) {
      await this.revokeSession(
        session.id,
      );

      throw new UnauthorizedException(
        'Session has expired due to inactivity',
      );
    }

    if (
      session.agent.status !== 'ACTIVE'
    ) {
      await this.revokeSession(
        session.id,
      );

      throw new UnauthorizedException(
        'Agent account is not active',
      );
    }

    if (
      session.agent.vendor.status !==
      'ACTIVE'
    ) {
      await this.revokeSession(
        session.id,
      );

      throw new UnauthorizedException(
        'Vendor account is not active',
      );
    }

    /*
     * Avoid writing to DB on every API call.
     * Refresh lastSeenAt only once every 5 minutes.
     */
    const refreshThresholdMs =
      5 * 60 * 1000;

    if (
      idleForMs >= refreshThresholdMs
    ) {
      await this.prisma.agentSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
        },

        data: {
          lastSeenAt: now,
        },
      });
    }

    return {
      sessionId: session.id,
      agentId: session.agentId,
      vendorId:
        session.agent.vendorId,

      agent: {
        id: session.agent.id,
        agentCode:
          session.agent.agentCode,
        fullName:
          session.agent.fullName,
        email: session.agent.email,
        mobile: session.agent.mobile,
        status:
          session.agent.status,
      },

      vendor: {
        id:
          session.agent.vendor.id,
        vendorCode:
          session.agent.vendor
            .vendorCode,
        businessName:
          session.agent.vendor
            .businessName,
        status:
          session.agent.vendor.status,
      },
    };
  }

  async logout(
    rawToken: string | undefined,
  ): Promise<void> {
    if (!rawToken) {
      return;
    }

    const tokenHash =
      this.hashToken(rawToken);

    await this.prisma.agentSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });
  }

  private async revokeSession(
    sessionId: string,
  ): Promise<void> {
    await this.prisma.agentSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });
  }
}