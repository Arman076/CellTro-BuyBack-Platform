import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AgentStatus } from '../generated/prisma/enums.js';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

@Injectable()
export class VendorAgentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private maskAadhaar(
    aadhaarNumber: string,
  ) {
    const last4 =
      aadhaarNumber.slice(-4);

    return `XXXXXXXX${last4}`;
  }

  /*
   * ========================================================
   * PENDING REQUESTS
   * ========================================================
   */

  async getPendingAgents(
    vendorId: number,
  ) {
    const agents =
      await this.prisma.agent.findMany({
        where: {
          vendorId,
          status: 'PENDING_APPROVAL',
        },

        select: {
          id: true,
          agentCode: true,
          fullName: true,
          email: true,
          mobile: true,
          aadhaarNumber: true,
          createdAt: true,
        },

        orderBy: {
          createdAt: 'asc',
        },

        take: 100,
      });

    return agents.map((agent) => ({
      id: agent.id,
      agentCode: agent.agentCode,
      fullName: agent.fullName,
      email: agent.email,
      mobile: agent.mobile,

      aadhaarMasked:
        this.maskAadhaar(
          agent.aadhaarNumber,
        ),

      createdAt: agent.createdAt,
    }));
  }

  async getAgentRequest(
    vendorId: number,
    agentId: number,
  ) {
    const agent =
      await this.prisma.agent.findFirst({
        where: {
          id: agentId,
          vendorId,
          status: 'PENDING_APPROVAL',
        },

        select: {
          id: true,
          agentCode: true,
          fullName: true,
          email: true,
          mobile: true,
          aadhaarNumber: true,
          address: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });

    if (!agent) {
      throw new NotFoundException(
        'Agent request not found',
      );
    }

    /*
     * Do not send the complete Aadhaar
     * number to the Vendor frontend.
     */
    return {
      id: agent.id,
      agentCode: agent.agentCode,
      fullName: agent.fullName,
      email: agent.email,
      mobile: agent.mobile,

      aadhaarMasked:
        this.maskAadhaar(
          agent.aadhaarNumber,
        ),

      address: agent.address,

      emailVerifiedAt:
        agent.emailVerifiedAt,

      createdAt:
        agent.createdAt,
    };
  }

  /*
   * ========================================================
   * AGENT MANAGEMENT
   * ========================================================
   */

  async getAgents(
    vendorId: number,
    status?: AgentStatus,
  ) {
    /*
     * PENDING_APPROVAL is intentionally
     * handled by /requests.
     *
     * If no status is provided, return all
     * already-reviewed/managed agents.
     */
    const statusFilter:
      | AgentStatus
      | {
          not: AgentStatus;
        } =
      status ??
      {
        not: 'PENDING_APPROVAL',
      };

    const agents =
      await this.prisma.agent.findMany({
        where: {
          vendorId,
          status: statusFilter,
        },

        select: {
          id: true,
          agentCode: true,
          fullName: true,
          email: true,
          mobile: true,
          status: true,
          reviewedAt: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              orderAssignments: true,
            },
          },
        },

        orderBy: [
          {
            updatedAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],

        take: 200,
      });

    return agents.map((agent) => ({
      id: agent.id,
      agentCode: agent.agentCode,
      fullName: agent.fullName,
      email: agent.email,
      mobile: agent.mobile,
      status: agent.status,

      reviewedAt:
        agent.reviewedAt,

      rejectionReason:
        agent.rejectionReason,

      assignmentCount:
        agent._count.orderAssignments,

      createdAt:
        agent.createdAt,

      updatedAt:
        agent.updatedAt,
    }));
  }

  async getAgent(
    vendorId: number,
    agentId: number,
  ) {
    const agent =
      await this.prisma.agent.findFirst({
        where: {
          id: agentId,
          vendorId,
        },

        select: {
          id: true,
          agentCode: true,
          fullName: true,
          email: true,
          mobile: true,
          aadhaarNumber: true,
          address: true,
          emailVerifiedAt: true,
          status: true,
          rejectionReason: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              orderAssignments: true,
            },
          },
        },
      });

    if (!agent) {
      /*
       * Same response for nonexistent agent
       * and another vendor's agent.
       */
      throw new NotFoundException(
        'Agent not found',
      );
    }

    return {
      id: agent.id,
      agentCode: agent.agentCode,
      fullName: agent.fullName,
      email: agent.email,
      mobile: agent.mobile,

      aadhaarMasked:
        this.maskAadhaar(
          agent.aadhaarNumber,
        ),

      address: agent.address,

      emailVerifiedAt:
        agent.emailVerifiedAt,

      status: agent.status,

      rejectionReason:
        agent.rejectionReason,

      reviewedAt:
        agent.reviewedAt,

      assignmentCount:
        agent._count.orderAssignments,

      createdAt:
        agent.createdAt,

      updatedAt:
        agent.updatedAt,
    };
  }

  /*
   * ========================================================
   * APPROVAL
   * ========================================================
   */

  async approveAgent(
    vendorId: number,
    agentId: number,
  ) {
    const result =
      await this.prisma.agent.updateMany({
        where: {
          id: agentId,
          vendorId,
          status: 'PENDING_APPROVAL',
        },

        data: {
          status: 'ACTIVE',
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

    if (result.count === 1) {
      return {
        approved: true,

        message:
          'Agent approved successfully',
      };
    }

    const agent =
      await this.prisma.agent.findFirst({
        where: {
          id: agentId,
          vendorId,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (!agent) {
      throw new NotFoundException(
        'Agent request not found',
      );
    }

    if (
      agent.status === 'ACTIVE'
    ) {
      return {
        approved: true,
        alreadyProcessed: true,

        message:
          'Agent is already approved',
      };
    }

    throw new ConflictException(
      'Agent request cannot be approved in its current status',
    );
  }

  /*
   * ========================================================
   * REJECTION
   * ========================================================
   */

  async rejectAgent(
    vendorId: number,
    agentId: number,
    reason: string,
  ) {
    const rejectionReason =
      reason.trim();

    const result =
      await this.prisma.agent.updateMany({
        where: {
          id: agentId,
          vendorId,
          status: 'PENDING_APPROVAL',
        },

        data: {
          status: 'REJECTED',
          rejectionReason,
          reviewedAt: new Date(),
        },
      });

    if (result.count === 1) {
      return {
        rejected: true,

        message:
          'Agent registration rejected',
      };
    }

    const agent =
      await this.prisma.agent.findFirst({
        where: {
          id: agentId,
          vendorId,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (!agent) {
      throw new NotFoundException(
        'Agent request not found',
      );
    }

    if (
      agent.status === 'REJECTED'
    ) {
      return {
        rejected: true,
        alreadyProcessed: true,

        message:
          'Agent registration is already rejected',
      };
    }

    throw new ConflictException(
      'Agent request cannot be rejected in its current status',
    );
  }
}