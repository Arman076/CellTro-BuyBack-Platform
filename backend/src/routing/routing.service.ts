import {
  Injectable,
} from "@nestjs/common";

import type {
  Prisma,
} from "../generated/prisma/client.js";

type TransactionClient =
  Prisma.TransactionClient;

type AutoAssignNewOrderInput = {
  orderId: string;
  serviceablePincodeId: number;
};

type AutoAssignNewOrderResult =
  | {
      assigned: false;
      vendorId: null;
      priority: null;
    }
  | {
      assigned: true;
      vendorId: number;
      priority: number;
    };

@Injectable()
export class RoutingService {
  async autoAssignNewOrder(
    tx: TransactionClient,
    input: AutoAssignNewOrderInput,
  ): Promise<AutoAssignNewOrderResult> {
    const eligibleMapping =
      await tx.vendorServiceArea.findFirst({
        where: {
          serviceablePincodeId:
            input.serviceablePincodeId,

          isActive: true,

          serviceablePincode: {
            is: {
              isActive: true,
            },
          },

          vendor: {
            is: {
              status: "ACTIVE",
            },
          },
        },

        orderBy: [
          {
            priority: "asc",
          },
          {
            vendorId: "asc",
          },
        ],

        select: {
          vendorId: true,
          priority: true,
        },
      });

    if (!eligibleMapping) {
      return {
        assigned: false,
        vendorId: null,
        priority: null,
      };
    }

    await tx.sellOrder.update({
      where: {
        id: input.orderId,
      },

      data: {
        currentVendorId:
          eligibleMapping.vendorId,
      },

      select: {
        id: true,
      },
    });

    await tx.orderVendorAssignment.create({
      data: {
        orderId:
          input.orderId,

        vendorId:
          eligibleMapping.vendorId,

        source:
          "AUTO",

        reason:
          "PINCODE_PRIORITY",

        prioritySnapshot:
          eligibleMapping.priority,
      },

      select: {
        id: true,
      },
    });

    return {
      assigned: true,
      vendorId:
        eligibleMapping.vendorId,
      priority:
        eligibleMapping.priority,
    };
  }
}