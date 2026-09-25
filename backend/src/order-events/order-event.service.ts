import {
  Injectable,
} from '@nestjs/common';

import type {
  OrderEventActorType,
  OrderEventType,
  Prisma,
} from '../generated/prisma/client.js';

import {
  PrismaService,
} from '../prisma/prisma/prisma.service.js';

type TransactionClient =
  Prisma.TransactionClient;

type RecordOrderEventInput = {
  orderId: string;
  eventType: OrderEventType;
  actorType: OrderEventActorType;
  agentId?: number | null;
  idempotencyKey?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class OrderEventService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Append an audit event.
   *
   * If an idempotency key is supplied, retries/double-clicks
   * resolve to the already-created logical event.
   */
  async record(
    input: RecordOrderEventInput,
    tx?: TransactionClient,
  ) {
    const db =
      tx ?? this.prisma;

    if (
      input.idempotencyKey
    ) {
      return db.orderEvent.upsert({
        where: {
          idempotencyKey:
            input.idempotencyKey,
        },

        create: {
          orderId:
            input.orderId,

          eventType:
            input.eventType,

          actorType:
            input.actorType,

          agentId:
            input.agentId ??
            null,

          idempotencyKey:
            input.idempotencyKey,

          metadata:
            input.metadata ??
            undefined,
        },

        update: {},

        select: {
          id: true,
          orderId: true,
          eventType: true,
          actorType: true,
          agentId: true,
          idempotencyKey: true,
          metadata: true,
          createdAt: true,
        },
      });
    }

    return db.orderEvent.create({
      data: {
        orderId:
          input.orderId,

        eventType:
          input.eventType,

        actorType:
          input.actorType,

        agentId:
          input.agentId ??
          null,

        metadata:
          input.metadata ??
          undefined,
      },

      select: {
        id: true,
        orderId: true,
        eventType: true,
        actorType: true,
        agentId: true,
        idempotencyKey: true,
        metadata: true,
        createdAt: true,
      },
    });
  }

  async getTimeline(
    orderId: string,
  ) {
    return this.prisma.orderEvent.findMany({
      where: {
        orderId,
      },

      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],

      select: {
        id: true,
        eventType: true,
        actorType: true,
        metadata: true,
        createdAt: true,

        agent: {
          select: {
            agentCode: true,
            fullName: true,
          },
        },
      },
    });
  }
}