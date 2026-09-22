import crypto from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  VendorStatus,
} from "../../generated/prisma/enums.js";

import {
  PrismaService,
} from "../../prisma/prisma/prisma.service.js";

type CreateVendorInput = {
  businessName?: unknown;
  contactName?: unknown;
  phone?: unknown;
  email?: unknown;
};

type UpdateVendorInput = {
  businessName?: unknown;
  contactName?: unknown;
  phone?: unknown;
  email?: unknown;
};

@Injectable()
export class SuperAdminVendorsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private parsePositiveInt(
    value: unknown,
    fieldName: string,
  ) {
    const parsed = Number(value);

    if (
      !Number.isInteger(parsed) ||
      parsed <= 0
    ) {
      throw new BadRequestException(
        `Invalid ${fieldName}.`,
      );
    }

    return parsed;
  }

  private normalizeRequiredText(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    const text = String(value ?? "").trim();

    if (!text) {
      throw new BadRequestException(
        `${fieldName} is required.`,
      );
    }

    if (text.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} is too long.`,
      );
    }

    return text;
  }

  private normalizePhone(
    value: unknown,
  ) {
    const digits = String(value ?? "")
      .replace(/\D/g, "");

    const phone =
      digits.length === 12 &&
      digits.startsWith("91")
        ? digits.slice(2)
        : digits;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      throw new BadRequestException(
        "Enter a valid Indian mobile number.",
      );
    }

    return phone;
  }

  private normalizeEmail(
    value: unknown,
  ) {
    const email =
      String(value ?? "")
        .trim()
        .toLowerCase();

    if (!email) {
      return null;
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new BadRequestException(
        "Enter a valid email address.",
      );
    }

    return email;
  }

  private parseStatus(
    value: unknown,
  ): VendorStatus {
    const status =
      String(value ?? "")
        .trim()
        .toUpperCase();

    if (
      !Object.values(VendorStatus).includes(
        status as VendorStatus,
      )
    ) {
      throw new BadRequestException(
        "Invalid vendor status.",
      );
    }

    return status as VendorStatus;
  }

  private vendorCode(
    id: number,
  ) {
    return `VEN-${String(id).padStart(6, "0")}`;
  }

  async list(
    query: {
      search?: unknown;
      status?: unknown;
      page?: unknown;
      limit?: unknown;
    },
  ) {
    const page = Math.max(
      1,
      Number(query.page) || 1,
    );

    const requestedLimit =
      Number(query.limit) || 20;

    const limit = Math.min(
      100,
      Math.max(1, requestedLimit),
    );

    const search =
      String(query.search ?? "")
        .trim()
        .slice(0, 100);

    const status =
      query.status
        ? this.parseStatus(query.status)
        : undefined;

    const where = {
      ...(status
        ? { status }
        : {}),

      ...(search
        ? {
            OR: [
              {
                vendorCode: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                businessName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                contactName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                phone: {
                  contains: search,
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [
      vendors,
      total,
      totalVendors,
      activeVendors,
    ] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({
        where,

        skip:
          (page - 1) * limit,

        take:
          limit,

        orderBy: [
          {
            createdAt:
              "desc",
          },
          {
            id:
              "desc",
          },
        ],

        select: {
          id: true,
          vendorCode: true,
          businessName: true,
          contactName: true,
          phone: true,
          email: true,
          status: true,
          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              serviceAreas: {
                where: {
                  isActive:
                    true,
                },
              },
            },
          },
        },
      }),

      this.prisma.vendor.count({
        where,
      }),

      this.prisma.vendor.count(),

      this.prisma.vendor.count({
        where: {
          status:
            VendorStatus.ACTIVE,
        },
      }),
    ]);

    return {
      data:
        vendors.map(
          ({
            _count,
            ...vendor
          }) => ({
            ...vendor,

            serviceAreaCount:
              _count.serviceAreas,
          }),
        ),

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit),
      },

      summary: {
        totalVendors,
        activeVendors,

        /*
         * Order routing has not been implemented yet.
         * Never return a fake 0 for routed orders.
         */
        ordersRouted:
          null,
      },
    };
  }

  async getById(
    idInput: unknown,
  ) {
    const id =
      this.parsePositiveInt(
        idInput,
        "vendor id",
      );

    const vendor =
      await this.prisma.vendor.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          vendorCode: true,
          businessName: true,
          contactName: true,
          phone: true,
          email: true,
          status: true,
          createdAt: true,
          updatedAt: true,

          serviceAreas: {
            where: {
              isActive:
                true,
            },

            orderBy: [
              {
                priority:
                  "asc",
              },
              {
                serviceablePincode: {
                  pincode:
                    "asc",
                },
              },
            ],

            select: {
              id: true,
              priority: true,
              isActive: true,

              serviceablePincode: {
                select: {
                  id: true,
                  pincode: true,
                  district: true,
                  state: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

    if (!vendor) {
      throw new NotFoundException(
        "Vendor not found.",
      );
    }

    return {
      ...vendor,

      summary: {
        serviceAreas:
          vendor.serviceAreas.length,

        totalOrders:
          null,

        completedOrders:
          null,

        successRate:
          null,
      },
    };
  }

  async create(
    input: CreateVendorInput,
  ) {
    const businessName =
      this.normalizeRequiredText(
        input.businessName,
        "Business name",
        150,
      );

    const contactName =
      this.normalizeRequiredText(
        input.contactName,
        "Contact name",
        120,
      );

    const phone =
      this.normalizePhone(
        input.phone,
      );

    const email =
      this.normalizeEmail(
        input.email,
      );

    /*
     * Create first, then derive vendorCode from the DB-generated id.
     * This avoids count()+1 race conditions.
     */
    return this.prisma.$transaction(
      async (tx) => {
        const vendor =
          await tx.vendor.create({
            data: {
              vendorCode:
                `PENDING-${crypto.randomUUID()}`,

              businessName,
              contactName,
              phone,
              email,
            },

            select: {
              id: true,
            },
          });

        const vendorCode =
          this.vendorCode(
            vendor.id,
          );

        return tx.vendor.update({
          where: {
            id:
              vendor.id,
          },

          data: {
            vendorCode,
          },

          select: {
            id: true,
            vendorCode: true,
            businessName: true,
            contactName: true,
            phone: true,
            email: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      },
    );
  }

  async update(
    idInput: unknown,
    input: UpdateVendorInput,
  ) {
    const id =
      this.parsePositiveInt(
        idInput,
        "vendor id",
      );

    const existing =
      await this.prisma.vendor.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        "Vendor not found.",
      );
    }

    const data: {
      businessName?: string;
      contactName?: string;
      phone?: string;
      email?: string | null;
    } = {};

    if (
      input.businessName !==
      undefined
    ) {
      data.businessName =
        this.normalizeRequiredText(
          input.businessName,
          "Business name",
          150,
        );
    }

    if (
      input.contactName !==
      undefined
    ) {
      data.contactName =
        this.normalizeRequiredText(
          input.contactName,
          "Contact name",
          120,
        );
    }

    if (
      input.phone !==
      undefined
    ) {
      data.phone =
        this.normalizePhone(
          input.phone,
        );
    }

    if (
      input.email !==
      undefined
    ) {
      data.email =
        this.normalizeEmail(
          input.email,
        );
    }

    if (
      Object.keys(data).length ===
      0
    ) {
      throw new BadRequestException(
        "No vendor fields were provided.",
      );
    }

    return this.prisma.vendor.update({
      where: {
        id,
      },

      data,

      select: {
        id: true,
        vendorCode: true,
        businessName: true,
        contactName: true,
        phone: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async setStatus(
    idInput: unknown,
    statusInput: unknown,
  ) {
    const id =
      this.parsePositiveInt(
        idInput,
        "vendor id",
      );

    const status =
      this.parseStatus(
        statusInput,
      );

    const existing =
      await this.prisma.vendor.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        "Vendor not found.",
      );
    }

    return this.prisma.vendor.update({
      where: {
        id,
      },

      data: {
        status,
      },

      select: {
        id: true,
        vendorCode: true,
        businessName: true,
        status: true,
        updatedAt: true,
      },
    });
  }
  async getAvailableServiceAreas(
  vendorIdInput: unknown,
  searchInput?: unknown,
) {
  const vendorId =
    this.parsePositiveInt(
      vendorIdInput,
      "vendor id",
    );

  const vendor =
    await this.prisma.vendor.findUnique({
      where: {
        id: vendorId,
      },

      select: {
        id: true,
      },
    });

  if (!vendor) {
    throw new NotFoundException(
      "Vendor not found.",
    );
  }

  const search =
    String(searchInput ?? "")
      .trim()
      .replace(/\D/g, "")
      .slice(0, 6);

  const areas =
    await this.prisma.serviceablePincode.findMany({
      where: {
        isActive: true,

        ...(search
          ? {
              pincode: {
                startsWith: search,
              },
            }
          : {}),
      },

      orderBy: {
        pincode: "asc",
      },

      take: 200,

      select: {
        id: true,
        pincode: true,
        district: true,
        state: true,

        vendorMappings: {
          where: {
            vendorId,
          },

          take: 1,

          select: {
            id: true,
            priority: true,
            isActive: true,
          },
        },
      },
    });

  return areas.map((area) => {
    const mapping =
      area.vendorMappings[0] ?? null;

    return {
      id: area.id,
      pincode: area.pincode,
      district: area.district,
      state: area.state,

      mapped:
        mapping?.isActive === true,

      priority:
        mapping?.priority ?? null,
    };
  });
}

async replaceServiceAreas(
  vendorIdInput: unknown,
  body: {
    areas?: unknown;
  },
) {
  const vendorId =
    this.parsePositiveInt(
      vendorIdInput,
      "vendor id",
    );

  if (!Array.isArray(body.areas)) {
    throw new BadRequestException(
      "areas must be an array.",
    );
  }

  if (body.areas.length > 500) {
    throw new BadRequestException(
      "A maximum of 500 service areas can be updated at once.",
    );
  }

  const normalized = new Map<
    number,
    number
  >();

  for (const item of body.areas) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      throw new BadRequestException(
        "Invalid service area.",
      );
    }

    const raw =
      item as {
        serviceablePincodeId?: unknown;
        priority?: unknown;
      };

    const serviceablePincodeId =
      this.parsePositiveInt(
        raw.serviceablePincodeId,
        "serviceable pincode id",
      );

    const priority =
      raw.priority === undefined
        ? 100
        : Number(raw.priority);

    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 10000
    ) {
      throw new BadRequestException(
        "Priority must be between 1 and 10000.",
      );
    }

    /*
     * Same pincode appearing twice in the request
     * is rejected instead of silently overwriting it.
     */
    if (
      normalized.has(
        serviceablePincodeId,
      )
    ) {
      throw new BadRequestException(
        "Duplicate serviceable pincode in request.",
      );
    }

    normalized.set(
      serviceablePincodeId,
      priority,
    );
  }

  const requestedIds =
    [...normalized.keys()];

  return this.prisma.$transaction(
    async (tx) => {
      /*
       * Serialize mapping updates for the same vendor.
       * ::text avoids adapter-pg void deserialization.
       */
      await tx.$queryRaw<
        Array<{
          lock_result:
            string | null;
        }>
      >`
        SELECT pg_advisory_xact_lock(
          hashtext(${`celltro-vendor-service-area:${vendorId}`})
        )::text AS lock_result
      `;

      const vendor =
        await tx.vendor.findUnique({
          where: {
            id: vendorId,
          },

          select: {
            id: true,
          },
        });

      if (!vendor) {
        throw new NotFoundException(
          "Vendor not found.",
        );
      }

      if (requestedIds.length > 0) {
        const validPincodes =
          await tx.serviceablePincode.findMany({
            where: {
              id: {
                in: requestedIds,
              },

              isActive:
                true,
            },

            select: {
              id: true,
            },
          });

        if (
          validPincodes.length !==
          requestedIds.length
        ) {
          throw new BadRequestException(
            "One or more selected pincodes are invalid or inactive.",
          );
        }
      }

      /*
       * Existing mappings are retained for audit/data integrity,
       * but mappings removed from the selection become inactive.
       */
      await tx.vendorServiceArea.updateMany({
        where: {
          vendorId,

          ...(requestedIds.length
            ? {
                serviceablePincodeId: {
                  notIn:
                    requestedIds,
                },
              }
            : {}),
        },

        data: {
          isActive:
            false,
        },
      });

      /*
       * Prisma does not provide bulk upsert.
       * This loop stays inside one transaction and is capped at 500.
       *
       * This is an admin write path, not customer request traffic.
       * Customer serviceability remains completely independent.
       */
      for (
        const [
          serviceablePincodeId,
          priority,
        ] of normalized
      ) {
        await tx.vendorServiceArea.upsert({
          where: {
            vendorId_serviceablePincodeId: {
              vendorId,
              serviceablePincodeId,
            },
          },

          create: {
            vendorId,
            serviceablePincodeId,
            priority,
            isActive:
              true,
          },

          update: {
            priority,
            isActive:
              true,
          },
        });
      }

      const mappings =
        await tx.vendorServiceArea.findMany({
          where: {
            vendorId,
            isActive:
              true,
          },

          orderBy: [
            {
              priority:
                "asc",
            },
            {
              serviceablePincode: {
                pincode:
                  "asc",
              },
            },
          ],

          select: {
            id: true,
            priority: true,

            serviceablePincode: {
              select: {
                id: true,
                pincode: true,
                district: true,
                state: true,
              },
            },
          },
        });

      return {
        vendorId,
        mappedCount:
          mappings.length,
        mappings,
      };
    },
  );
}
}