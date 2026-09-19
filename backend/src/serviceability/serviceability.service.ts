import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import {
  PrismaService,
} from "../prisma/prisma/prisma.service.js";

@Injectable()
export class ServiceabilityService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private normalizePincode(
    value: unknown,
  ) {
    const pincode =
      String(value ?? "")
        .replace(/\D/g, "");

    if (
      !/^[1-9]\d{5}$/.test(
        pincode,
      )
    ) {
      throw new BadRequestException(
        "Enter a valid 6-digit pincode.",
      );
    }

    return pincode;
  }

  async check(
    pincodeInput: unknown,
  ) {
    const pincode =
      this.normalizePincode(
        pincodeInput,
      );

    const row =
      await this.prisma.serviceablePincode.findUnique({
        where: {
          pincode,
        },

        select: {
          pincode: true,
          district: true,
          state: true,
          isActive: true,
        },
      });

    return {
      pincode,

      district:
        row?.district ??
        null,

      state:
        row?.state ??
        null,

      serviceable:
        row?.isActive ===
        true,
    };
  }

  async listForAdmin() {
    return this.prisma.serviceablePincode.findMany({
      orderBy: [
        {
          isActive:
            "desc",
        },
        {
          state:
            "asc",
        },
        {
          district:
            "asc",
        },
        {
          pincode:
            "asc",
        },
      ],
    });
  }

  async createForAdmin(
    pincodeInput: unknown,
  ) {
    const pincode =
      this.normalizePincode(
        pincodeInput,
      );

    return this.prisma.serviceablePincode.upsert({
      where: {
        pincode,
      },

      update: {
        isActive:
          true,
      },

      create: {
        pincode,
        isActive:
          true,
      },
    });
  }

  async setStatusForAdmin(
    idInput: unknown,
    isActiveInput: unknown,
  ) {
    const id =
      Number(
        idInput,
      );

    if (
      !Number.isInteger(
        id,
      ) ||
      id <= 0
    ) {
      throw new BadRequestException(
        "Invalid serviceability record.",
      );
    }

    if (
      typeof isActiveInput !==
      "boolean"
    ) {
      throw new BadRequestException(
        "isActive must be true or false.",
      );
    }

    return this.prisma.serviceablePincode.update({
      where: {
        id,
      },

      data: {
        isActive:
          isActiveInput,
      },
    });
  }
}
