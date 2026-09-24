import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  createHash,
} from "crypto";

import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

import {
  PrismaService,
} from "../prisma/prisma/prisma.service.js";

import {
  RoutingService,
} from "../routing/routing.service.js";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma:
      PrismaService,

    private readonly routingService:
      RoutingService,
  ) {}

  private hashToken(
    value: string,
  ) {
    return createHash("sha256")
      .update(value)
      .digest("hex");
  }

  private normalizePhone(
    phone: unknown,
  ) {
    return String(phone ?? "")
      .replace(/\D/g, "");
  }

  private validateIndianPhone(
    phone: string,
  ) {
    return /^[6-9]\d{9}$/.test(
      phone,
    );
  }

  private async requireVerifiedCustomer(
    rawToken: string,
  ) {
    const token =
      String(rawToken || "")
        .trim();

    if (!token) {
      throw new UnauthorizedException(
        "Customer verification session is required.",
      );
    }

    const session =
      await this.prisma.customerVerifiedSession.findFirst({
        where: {
          tokenHash:
            this.hashToken(
              token,
            ),

          revokedAt:
            null,

          expiresAt: {
            gt: new Date(),
          },
        },

        select: {
          id: true,
          phone: true,
          expiresAt: true,
        },
      });

    if (
      !session ||
      !this.validateIndianPhone(
        session.phone,
      )
    ) {
      throw new UnauthorizedException(
        "Customer verification session is invalid or expired.",
      );
    }

    return session;
  }

  private requiredText(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    const text =
      String(value ?? "")
        .trim();

    if (
      !text ||
      text.length >
        maxLength
    ) {
      throw new BadRequestException(
        `${fieldName} is invalid.`,
      );
    }

    return text;
  }

  private optionalText(
    value: unknown,
    maxLength: number,
  ) {
    const text =
      String(value ?? "")
        .trim();

    if (!text) {
      return null;
    }

    if (
      text.length >
      maxLength
    ) {
      throw new BadRequestException(
        "Provided text is too long.",
      );
    }

    return text;
  }

  private addressType(
    type: unknown,
  ) {
    const value =
      String(type || "")
        .toUpperCase();

    if (
      ![
        "HOME",
        "OFFICE",
        "OTHER",
      ].includes(
        value,
      )
    ) {
      throw new BadRequestException(
        "Invalid address type.",
      );
    }

    return value as
      | "HOME"
      | "OFFICE"
      | "OTHER";
  }

  private pincode(
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

  private addressInput(
    body: any,
  ) {
    return {
      fullName:
        this.requiredText(
          body?.fullName,
          "Full name",
          100,
        ),

      house:
        this.requiredText(
          body?.house,
          "House / flat",
          160,
        ),

      street:
        this.requiredText(
          body?.street,
          "Street",
          160,
        ),

      locality:
        this.requiredText(
          body?.locality,
          "Locality",
          120,
        ),

      landmark:
        this.optionalText(
          body?.landmark,
          160,
        ),

      pincode:
        this.pincode(
          body?.pincode,
        ),

      city:
        this.requiredText(
          body?.city,
          "City",
          100,
        ),

      state:
        this.requiredText(
          body?.state,
          "State",
          100,
        ),

      type:
        this.addressType(
          body?.type,
        ),
    };
  }

  private dateOnly(
    value: unknown,
  ) {
    const raw =
      String(value || "");

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        raw,
      )
    ) {
      throw new BadRequestException(
        "Invalid pickup date.",
      );
    }

    const valueAsDate =
      new Date(
        `${raw}T00:00:00.000Z`,
      );

    if (
      Number.isNaN(
        valueAsDate.getTime(),
      )
    ) {
      throw new BadRequestException(
        "Invalid pickup date.",
      );
    }

    return valueAsDate;
  }

  private orderNumber() {
    const date =
      new Date();

    const ymd = [
      date.getFullYear(),

      String(
        date.getMonth() +
          1,
      ).padStart(
        2,
        "0",
      ),

      String(
        date.getDate(),
      ).padStart(
        2,
        "0",
      ),
    ].join("");

    const tail =
      `${Date.now().toString(36)}${Math.random()
        .toString(36)
        .slice(2, 6)}`
        .toUpperCase();

    return `CEL-${ymd}-${tail}`;
  }

  private async ensureDefaultSlots() {
    const defaults = [
      {
        code:
          "10_14",

        label:
          "10:00 AM - 02:00 PM",

        startTime:
          "10:00",

        endTime:
          "14:00",

        displayOrder:
          10,
      },

      {
        code:
          "14_18",

        label:
          "02:00 PM - 06:00 PM",

        startTime:
          "14:00",

        endTime:
          "18:00",

        displayOrder:
          20,
      },

      {
        code:
          "18_22",

        label:
          "06:00 PM - 10:00 PM",

        startTime:
          "18:00",

        endTime:
          "22:00",

        displayOrder:
          30,
      },
    ];

    await Promise.all(
      defaults.map(
        (slot) =>
          this.prisma.pickupSlotTemplate.upsert({
            where: {
              code:
                slot.code,
            },

            update: {},

            create:
              slot,
          }),
      ),
    );
  }


  private async ensureDefaultCancellationReasons() {
    const defaults = [
      {
        code: "CHANGED_MIND",
        label: "Changed my mind",
        audience: "CUSTOMER" as const,
        requiresFreeText: false,
        displayOrder: 10,
      },
      {
        code: "PRICE_LOW",
        label: "Expected a better price",
        audience: "CUSTOMER" as const,
        requiresFreeText: false,
        displayOrder: 20,
      },
      {
        code: "TIMING_ISSUE",
        label: "Pickup timing does not work",
        audience: "CUSTOMER" as const,
        requiresFreeText: false,
        displayOrder: 30,
      },
      {
        code: "SOLD_ELSEWHERE",
        label: "Sold the device elsewhere",
        audience: "CUSTOMER" as const,
        requiresFreeText: false,
        displayOrder: 40,
      },
      {
        code: "WRONG_DEVICE",
        label: "Selected the wrong device",
        audience: "CUSTOMER" as const,
        requiresFreeText: false,
        displayOrder: 50,
      },
      {
        code: "OTHER",
        label: "Other",
        audience: "CUSTOMER" as const,
        requiresFreeText: true,
        displayOrder: 90,
      },
      {
        code: "PREFER_NOT_TO_SAY",
        label: "Prefer not to say",
        audience: "CUSTOMER" as const,
        requiresFreeText: false,
        displayOrder: 100,
      },

      {
        code: "CUSTOMER_UNAVAILABLE",
        label: "Customer unavailable",
        audience: "AGENT" as const,
        requiresFreeText: false,
        displayOrder: 10,
      },
      {
        code: "UNABLE_TO_CONTACT",
        label: "Unable to contact customer",
        audience: "AGENT" as const,
        requiresFreeText: false,
        displayOrder: 20,
      },
      {
        code: "DEVICE_MISMATCH",
        label: "Device does not match order",
        audience: "AGENT" as const,
        requiresFreeText: false,
        displayOrder: 30,
      },
      {
        code: "CUSTOMER_REFUSED",
        label: "Customer refused pickup",
        audience: "AGENT" as const,
        requiresFreeText: false,
        displayOrder: 40,
      },
      {
        code: "DEVICE_UNAVAILABLE",
        label: "Device not available",
        audience: "AGENT" as const,
        requiresFreeText: false,
        displayOrder: 50,
      },
      {
        code: "ADDRESS_ISSUE",
        label: "Address / location issue",
        audience: "AGENT" as const,
        requiresFreeText: false,
        displayOrder: 60,
      },
      {
        code: "OTHER",
        label: "Other",
        audience: "AGENT" as const,
        requiresFreeText: true,
        displayOrder: 90,
      },
    ];

    await Promise.all(
      defaults.map(
        (item) =>
          this.prisma.cancellationReasonMaster.upsert({
            where: {
              audience_code: {
                audience:
                  item.audience,
                code:
                  item.code,
              },
            },

            update: {},

            create:
              item,
          }),
      ),
    );
  }

  async getCustomerCancellationReasons() {
    await this.ensureDefaultCancellationReasons();

    return this.prisma.cancellationReasonMaster.findMany({
      where: {
        audience:
          "CUSTOMER",

        isActive:
          true,
      },

      orderBy: [
        {
          displayOrder:
            "asc",
        },
        {
          id:
            "asc",
        },
      ],

      select: {
        code: true,
        label: true,
        requiresFreeText: true,
      },
    });
  }

  private async getCustomerCancellationReason(
    reasonCode: string | null,
  ) {
    if (!reasonCode) {
      return null;
    }

    await this.ensureDefaultCancellationReasons();

    const reason =
      await this.prisma.cancellationReasonMaster.findUnique({
        where: {
          audience_code: {
            audience:
              "CUSTOMER",

            code:
              reasonCode,
          },
        },
      });

    if (
      !reason ||
      !reason.isActive
    ) {
      throw new BadRequestException(
        "Invalid cancellation reason.",
      );
    }

    return reason;
  }

  async getPickupSlots() {
    await this.ensureDefaultSlots();

    return this.prisma.pickupSlotTemplate.findMany({
      where: {
        isActive:
          true,
      },

      orderBy: [
        {
          displayOrder:
            "asc",
        },

        {
          id:
            "asc",
        },
      ],

      select: {
        id: true,
        code: true,
        label: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  async getCustomerAddresses(
    rawToken: string,
  ) {
    const verified =
      await this.requireVerifiedCustomer(
        rawToken,
      );

    const customer =
      await this.prisma.customer.findUnique({
        where: {
          phone:
            verified.phone,
        },

        include: {
          addresses: {
            where: {
              isActive:
                true,
            },

            orderBy: {
              updatedAt:
                "desc",
            },
          },
        },
      });

    if (!customer) {
      return [];
    }

    const activePincodes =
      await this.prisma.serviceablePincode.findMany({
        where: {
          isActive:
            true,

          pincode: {
            in:
              customer.addresses.map(
                (address) =>
                  address.pincode,
              ),
          },
        },

        select: {
          pincode:
            true,
        },
      });

    const serviceableSet =
      new Set(
        activePincodes.map(
          (item) =>
            item.pincode,
        ),
      );

    return customer.addresses.map(
      (address) => ({
        ...address,

        type:
          address.type ===
          "HOME"
            ? "Home"
            : address.type ===
                "OFFICE"
              ? "Office"
              : "Other",

        serviceable:
          serviceableSet.has(
            address.pincode,
          ),
      }),
    );
  }

  async createCustomerAddress(
    rawToken: string,
    body: any,
  ) {
    const verified =
      await this.requireVerifiedCustomer(
        rawToken,
      );

    const input =
      this.addressInput(
        body,
      );

    const customer =
      await this.prisma.customer.upsert({
        where: {
          phone:
            verified.phone,
        },

        update: {},

        create: {
          phone:
            verified.phone,
        },
      });

    const address =
      await this.prisma.customerAddress.create({
        data: {
          customerId:
            customer.id,

          ...input,
        },
      });

    const serviceability =
      await this.prisma.serviceablePincode.findUnique({
        where: {
          pincode:
            address.pincode,
        },

        select: {
          isActive:
            true,
        },
      });

    return {
      ...address,

      type:
        address.type ===
        "HOME"
          ? "Home"
          : address.type ===
              "OFFICE"
            ? "Office"
            : "Other",

      phone:
        verified.phone,

      serviceable:
        serviceability?.isActive ===
        true,
    };
  }

  async updateCustomerAddress(
    rawToken: string,
    id: number,
    body: any,
  ) {
    const verified =
      await this.requireVerifiedCustomer(
        rawToken,
      );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new BadRequestException(
        "Invalid address.",
      );
    }

    const existing =
      await this.prisma.customerAddress.findFirst({
        where: {
          id,

          customer: {
            is: {
              phone:
                verified.phone,
            },
          },

          isActive:
            true,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        "Address not found.",
      );
    }

    const input =
      this.addressInput(
        body,
      );

    const address =
      await this.prisma.customerAddress.update({
        where: {
          id,
        },

        data:
          input,
      });

    const serviceability =
      await this.prisma.serviceablePincode.findUnique({
        where: {
          pincode:
            address.pincode,
        },

        select: {
          isActive:
            true,
        },
      });

    return {
      ...address,

      type:
        address.type ===
        "HOME"
          ? "Home"
          : address.type ===
              "OFFICE"
            ? "Office"
            : "Other",

      phone:
        verified.phone,

      serviceable:
        serviceability?.isActive ===
        true,
    };
  }

  async deleteCustomerAddress(
    rawToken: string,
    id: number,
  ) {
    const verified =
      await this.requireVerifiedCustomer(
        rawToken,
      );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new BadRequestException(
        "Invalid address.",
      );
    }

    const existing =
      await this.prisma.customerAddress.findFirst({
        where: {
          id,

          customer: {
            is: {
              phone:
                verified.phone,
            },
          },

          isActive:
            true,
        },

        select: {
          id: true,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        "Address not found.",
      );
    }

    await this.prisma.customerAddress.update({
      where: {
        id,
      },

      data: {
        isActive:
          false,
      },
    });

    return {
      success:
        true,
    };
  }

  async createOrder(
    rawToken: string,
    body: any,
  ) {
    const verified =
      await this.requireVerifiedCustomer(
        rawToken,
      );

    const addressId =
      Number(
        body?.addressId,
      );

    if (
      !Number.isInteger(
        addressId,
      ) ||
      addressId <= 0
    ) {
      throw new BadRequestException(
        "Select a valid address.",
      );
    }

    const pickupDate =
      this.dateOnly(
        body?.pickupDate,
      );

    const slotCode =
      String(
        body?.pickupSlotCode ||
          "",
      ).trim();

    const payoutMethod =
      String(
        body?.payoutMethod ||
          "",
      )
        .trim()
        .toUpperCase();

    if (
      ![
        "CASH",
        "UPI",
      ].includes(
        payoutMethod,
      )
    ) {
      throw new BadRequestException(
        "Select Cash or UPI payout.",
      );
    }

    const payoutUpiMobile =
      payoutMethod ===
      "UPI"
        ? this.normalizePhone(
            body?.payoutUpiMobile,
          )
        : null;

    if (
      payoutMethod ===
        "UPI" &&
      !this.validateIndianPhone(
        payoutUpiMobile ||
          "",
      )
    ) {
      throw new BadRequestException(
        "Valid UPI-linked mobile number is required.",
      );
    }

    /*
     * Temporary frontend compatibility:
     * root enquirySessionId is preferred.
     * Old nested quote.enquirySessionId is accepted,
     * but NO price/product data from quote is trusted.
     */
    const enquirySessionId =
      String(
        body?.enquirySessionId ||
          body?.quote
            ?.enquirySessionId ||
          "",
      ).trim();

    if (!enquirySessionId) {
      throw new BadRequestException(
        "Verified quote session is required.",
      );
    }

    const enquiry =
      await this.prisma.enquirySession.findFirst({
        where: {
          sessionId:
            enquirySessionId,

          phone:
            verified.phone,

          orderId:
            null,

          identityVerifiedAt: {
            not:
              null,
          },

          quoteViewedAt: {
            not:
              null,
          },

          quoteAmount: {
            not:
              null,
          },
        },

        include: {
          product: {
            select: {
              id:
                true,

              name:
                true,

              imageUrl:
                true,
            },
          },

          variant: {
            select: {
              id:
                true,

              productId:
                true,

              basePrice:
                true,

              values: {
                include: {
                  attribute: {
                    select: {
                      name:
                        true,

                      displayOrder:
                        true,
                    },
                  },

                  option: {
                    select: {
                      value:
                        true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (
      !enquiry ||
      !enquiry.product ||
      !enquiry.variant ||
      enquiry.productId ===
        null ||
      enquiry.variantId ===
        null
    ) {
      throw new BadRequestException(
        "Verified quote session not found. Please get the quote again.",
      );
    }

    if (
      enquiry.variant
        .productId !==
      enquiry.productId
    ) {
      throw new BadRequestException(
        "Quote device data is inconsistent.",
      );
    }

    /*
     * Capture the already-validated non-null relations before
     * entering the transaction callback. TypeScript does not
     * preserve object-property narrowing across async closures.
     */
    const product =
      enquiry.product;

    const variant =
      enquiry.variant;

    const productId =
      enquiry.productId;

    const variantId =
      enquiry.variantId;

    const basePrice =
      Number(
        variant
          .basePrice,
      );

    const finalPrice =
      Number(
        enquiry.quoteAmount,
      );

    if (
      !Number.isFinite(
        basePrice,
      ) ||
      !Number.isFinite(
        finalPrice,
      ) ||
      basePrice < 0 ||
      finalPrice < 0
    ) {
      throw new BadRequestException(
        "Stored quote is invalid.",
      );
    }

    const totalDeduction =
      Math.max(
        0,
        basePrice -
          finalPrice,
      );

    const variantLabel =
      [...variant.values]
        .sort(
          (
            a,
            b,
          ) =>
            a.attribute
              .displayOrder -
            b.attribute
              .displayOrder,
        )
        .map(
          (item) =>
            item.option.value,
        )
        .filter(
          Boolean,
        )
        .join(" / ");

    await this.ensureDefaultSlots();

    const customer =
      await this.prisma.customer.upsert({
        where: {
          phone:
            verified.phone,
        },

        update: {},

        create: {
          phone:
            verified.phone,
        },
      });

    const [
      address,
      slot,
    ] =
      await Promise.all([
        this.prisma.customerAddress.findFirst({
          where: {
            id:
              addressId,

            customerId:
              customer.id,

            isActive:
              true,
          },
        }),

        this.prisma.pickupSlotTemplate.findFirst({
          where: {
            code:
              slotCode,

            isActive:
              true,
          },
        }),
      ]);

    if (!address) {
      throw new BadRequestException(
        "Selected address is invalid.",
      );
    }

    if (!slot) {
      throw new BadRequestException(
        "Selected pickup slot is invalid.",
      );
    }

    const serviceability =
      await this.prisma.serviceablePincode.findUnique({
        where: {
          pincode:
            address.pincode,
        },

        select: {
          id:
            true,

          isActive:
            true,
        },
      });

    if (
      serviceability?.isActive !==
      true
    ) {
      throw new BadRequestException(
        "Pickup is currently unavailable for the selected pincode.",
      );
    }

    const orderNumber =
      this.orderNumber();

    const duplicateLockKey =
      `celltro-order:${customer.id}:${productId}:${variantId}`;

    const order =
      await this.prisma.$transaction(
        async (
          tx,
        ) => {
          /*
           * PostgreSQL transaction advisory lock.
           * Same customer + product + variant order
           * requests are serialized even across
           * multiple backend instances.
           */
          await tx.$queryRaw<Array<{ lock_result: string | null }>>`
            SELECT pg_advisory_xact_lock(
              hashtext(${duplicateLockKey})
            )::text AS lock_result
          `;

          const existingActiveOrder =
            await tx.sellOrder.findFirst({
              where: {
                customerId:
                  customer.id,

                productId,

                variantId,

                status: {
                  notIn: [
                    "COMPLETED",
                    "CANCELLED",
                  ],
                },
              },

              select: {
                orderNumber:
                  true,

                status:
                  true,
              },
            });

          if (
            existingActiveOrder
          ) {
            throw new BadRequestException(
              `An active order already exists for this device: ${existingActiveOrder.orderNumber}.`,
            );
          }

          /*
           * Re-check exact journey inside the
           * same transaction before consuming it.
           */
          const freshEnquiry =
            await tx.enquirySession.findFirst({
              where: {
                id:
                  enquiry.id,

                phone:
                  verified.phone,

                orderId:
                  null,

                identityVerifiedAt: {
                  not:
                    null,
                },

                quoteViewedAt: {
                  not:
                    null,
                },

                quoteAmount: {
                  not:
                    null,
                },
              },

              select: {
                id:
                  true,

                quoteAmount:
                  true,
              },
            });

          if (
            !freshEnquiry
          ) {
            throw new BadRequestException(
              "This quote has already been converted or is no longer valid.",
            );
          }

          const authoritativeFinalPrice =
            Number(
              freshEnquiry.quoteAmount,
            );

          if (
            !Number.isFinite(
              authoritativeFinalPrice,
            ) ||
            authoritativeFinalPrice <
              0
          ) {
            throw new BadRequestException(
              "Stored quote is invalid.",
            );
          }

          const createdOrder =
            await tx.sellOrder.create({
              data: {
                orderNumber,

                customerId:
                  customer.id,

                productId,
                variantId,

                productName:
                  product.name,

                productImage:
                  product.imageUrl,

                variantLabel,

                basePrice,

                totalDeduction:
                  Math.max(
                    0,
                    basePrice -
                      authoritativeFinalPrice,
                  ),

                finalPrice:
                  authoritativeFinalPrice,

                questionnaireSnapshot:
                  (
                    enquiry.questionnaireSnapshot ??
                    undefined
                  ) as any,

                pickupDate,

                pickupSlotId:
                  slot.id,

                payoutMethod:
                  payoutMethod as
                    | "CASH"
                    | "UPI",

                payoutUpiMobile,

                addressSnapshot: {
                  create: {
                    sourceAddressId:
                      address.id,

                    fullName:
                      address.fullName,

                    phone:
                      verified.phone,

                    house:
                      address.house,

                    street:
                      address.street,

                    locality:
                      address.locality,

                    landmark:
                      address.landmark,

                    pincode:
                      address.pincode,

                    city:
                      address.city,

                    state:
                      address.state,

                    type:
                      address.type,
                  },
                },

                statusHistory: {
                  create: {
                    status:
                      "PICKUP_REQUESTED",

                    note:
                      "Pickup request created by customer.",
                  },
                },
              },

              include: {
                pickupSlot:
                  true,

                addressSnapshot:
                  true,

                statusHistory:
                  true,

                reschedules:
                  true,
              },
            });

          await this.routingService.autoAssignNewOrder(
            tx,
            {
              orderId:
                createdOrder.id,

              serviceablePincodeId:
                serviceability.id,
            },
          );

          const linkResult =
            await tx.enquirySession.updateMany({
              where: {
                id:
                  enquiry.id,

                orderId:
                  null,
              },

              data: {
                orderId:
                  createdOrder.id,
              },
            });

          if (
            linkResult.count !==
            1
          ) {
            throw new BadRequestException(
              "This quote has already been converted. Please check your existing order.",
            );
          }

          return createdOrder;
        },
      );

    return this.toOrderView(
      order,
    );
  }

  async getOrder(
    rawToken: string,
    orderNumber: string,
  ) {
    const verified =
      await this.requireVerifiedCustomer(
        rawToken,
      );

    const order =
      await this.prisma.sellOrder.findFirst({
        where: {
          orderNumber,

          customer: {
            is: {
              phone:
                verified.phone,
            },
          },
        },

        include: {
          pickupSlot:
            true,

          addressSnapshot:
            true,

          statusHistory: {
            orderBy: {
              createdAt:
                "asc",
            },
          },

          reschedules: {
            orderBy: {
              createdAt:
                "desc",
            },
          },

          feedback:
            true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found.",
      );
    }

    return this.toOrderView(
      order,
    );
  }

  async rescheduleOrder(
    rawToken: string,
    orderNumber: string,
    body: any,
  ) {
    const verified =
      await this.requireVerifiedCustomer(
        rawToken,
      );

    const pickupDate =
      this.dateOnly(
        body?.pickupDate,
      );

    const slotCode =
      String(
        body?.pickupSlotCode ||
          "",
      ).trim();

    const slot =
      await this.prisma.pickupSlotTemplate.findFirst({
        where: {
          code:
            slotCode,

          isActive:
            true,
        },
      });

    if (!slot) {
      throw new BadRequestException(
        "Pickup slot not found.",
      );
    }

    await this.prisma.$transaction(
      async (
        tx,
      ) => {
        await tx.$queryRaw<Array<{ lock_result: string | null }>>`
          SELECT pg_advisory_xact_lock(
            hashtext(${`celltro-order-action:${orderNumber}`})
          )::text AS lock_result
        `;

        const order =
          await tx.sellOrder.findFirst({
            where: {
              orderNumber,

              customer: {
                is: {
                  phone:
                    verified.phone,
                },
              },
            },

            include: {
              pickupSlot:
                true,
            },
          });

        if (!order) {
          throw new NotFoundException(
            "Order not found.",
          );
        }

        if (
          [
            "COMPLETED",
            "CANCELLED",
          ].includes(
            order.status,
          )
        ) {
          throw new BadRequestException(
            "This order can no longer be rescheduled.",
          );
        }

        await tx.orderRescheduleHistory.create({
          data: {
            orderId:
              order.id,

            oldPickupDate:
              order.pickupDate,

            newPickupDate:
              pickupDate,

            oldSlotLabel:
              order.pickupSlot
                .label,

            newSlotLabel:
              slot.label,
          },
        });

        await tx.sellOrder.update({
          where: {
            id:
              order.id,
          },

          data: {
            pickupDate,

            pickupSlotId:
              slot.id,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId:
              order.id,

            status:
              order.status,

            note:
              `Pickup rescheduled to ${slot.label}.`,
          },
        });
      },
    );

    return this.getOrder(
      rawToken,
      orderNumber,
    );
  }

  async cancelOrder(
    rawToken: string,
    orderNumber: string,
    body?: {
      reasonCode?: string;
      reasonText?: string;
    },
  ) {
    const verified =
      await this.requireVerifiedCustomer(
        rawToken,
      );

    const reasonCode =
      this.optionalText(
        body?.reasonCode,
        80,
      );

    const reasonText =
      this.optionalText(
        body?.reasonText,
        500,
      );

    const reason =
      await this.getCustomerCancellationReason(
        reasonCode,
      );

    if (
      reason?.requiresFreeText &&
      !reasonText
    ) {
      throw new BadRequestException(
        "Please provide a reason for selecting Other.",
      );
    }

    await this.prisma.$transaction(
      async (
        tx,
      ) => {
        await tx.$queryRaw<Array<{ lock_result: string | null }>>`
          SELECT pg_advisory_xact_lock(
            hashtext(${`celltro-order-action:${orderNumber}`})
          )::text AS lock_result
        `;

        const order =
          await tx.sellOrder.findFirst({
            where: {
              orderNumber,

              customer: {
                is: {
                  phone:
                    verified.phone,
                },
              },
            },
          });

        if (!order) {
          throw new NotFoundException(
            "Order not found.",
          );
        }

        if (
          order.status ===
          "COMPLETED"
        ) {
          throw new BadRequestException(
            "Completed order cannot be cancelled.",
          );
        }

        if (
          order.status ===
          "CANCELLED"
        ) {
          return;
        }

        const reasonSummary =
          reasonText ||
          reasonCode;

        await tx.sellOrder.update({
          where: {
            id:
              order.id,
          },

          data: {
            status:
              "CANCELLED",
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId:
              order.id,

            status:
              "CANCELLED",

            note:
              reasonSummary
                ? `Pickup request cancelled by customer. Reason: ${reasonSummary}`
                : "Pickup request cancelled by customer.",
          },
        });

        await tx.orderCancellation.upsert({
          where: {
            orderId:
              order.id,
          },

          update: {
            actor:
              "CUSTOMER",

            reasonCode,
            reasonText,
          },

          create: {
            orderId:
              order.id,

            actor:
              "CUSTOMER",

            reasonCode,
            reasonText,
          },
        });
      },
    );

    return this.getOrder(
      rawToken,
      orderNumber,
    );
  }


  async getCustomerFeedbackOptions() {
    return this.prisma.customerFeedbackOption.findMany({
      where: {
        isActive:
          true,
      },

      orderBy: [
        {
          displayOrder:
            "asc",
        },
        {
          id:
            "asc",
        },
      ],

      select: {
        code: true,
        label: true,
        requiresFreeText: true,
      },
    });
  }

  async submitCustomerFeedback(
    rawToken: string,
    orderNumber: string,
    body: {
      rating?: number;
      optionCode?: string;
      feedbackText?: string;
    },
  ) {
    const verified =
      await this.requireVerifiedCustomer(
        rawToken,
      );

    const order =
      await this.prisma.sellOrder.findFirst({
        where: {
          orderNumber,

          customer: {
            is: {
              phone:
                verified.phone,
            },
          },
        },

        select: {
          id:
            true,

          status:
            true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found.",
      );
    }

    if (
      order.status !==
      "COMPLETED"
    ) {
      throw new BadRequestException(
        "Feedback can be submitted only after the order is completed.",
      );
    }

    const existing =
      await this.prisma.orderFeedback.findUnique({
        where: {
          orderId:
            order.id,
        },

        select: {
          id:
            true,
        },
      });

    if (existing) {
      throw new BadRequestException(
        "Feedback has already been submitted for this order.",
      );
    }

    const ratingRaw =
      body?.rating;

    let rating:
      | number
      | null =
      null;

    if (
      ratingRaw !==
      undefined &&
      ratingRaw !==
      null
    ) {
      const parsed =
        Number(
          ratingRaw,
        );

      if (
        !Number.isInteger(
          parsed,
        ) ||
        parsed < 1 ||
        parsed > 5
      ) {
        throw new BadRequestException(
          "Rating must be between 1 and 5.",
        );
      }

      rating =
        parsed;
    }

    const optionCode =
      String(
        body?.optionCode ||
          "",
      )
        .trim()
        .toUpperCase() ||
      null;

    const feedbackText =
      this.optionalText(
        body?.feedbackText,
        1000,
      );

    let optionLabelSnapshot:
      | string
      | null =
      null;

    if (optionCode) {
      const option =
        await this.prisma.customerFeedbackOption.findUnique({
          where: {
            code:
              optionCode,
          },
        });

      if (
        !option ||
        !option.isActive
      ) {
        throw new BadRequestException(
          "Invalid feedback option.",
        );
      }

      if (
        option.requiresFreeText &&
        !feedbackText
      ) {
        throw new BadRequestException(
          "Please provide feedback details for the selected option.",
        );
      }

      optionLabelSnapshot =
        option.label;
    }

    if (
      rating ===
        null &&
      !optionCode &&
      !feedbackText
    ) {
      throw new BadRequestException(
        "Please provide a rating, select a feedback option, or enter feedback.",
      );
    }

    return this.prisma.orderFeedback.create({
      data: {
        orderId:
          order.id,

        rating,
        optionCode,
        optionLabelSnapshot,
        feedbackText,
      },
    });
  }

  private async buildOrderPdf(
    order: any,
  ) {
    const pdf =
      await PDFDocument.create();

    const regular =
      await pdf.embedFont(
        StandardFonts.Helvetica,
      );

    const bold =
      await pdf.embedFont(
        StandardFonts.HelveticaBold,
      );

    const pageWidth =
      595.28;

    const pageHeight =
      841.89;

    const margin =
      46;

    const contentWidth =
      pageWidth -
      margin * 2;

    let page =
      pdf.addPage([
        pageWidth,
        pageHeight,
      ]);

    let y =
      pageHeight -
      margin;

    const newPage =
      () => {
        page =
          pdf.addPage([
            pageWidth,
            pageHeight,
          ]);

        y =
          pageHeight -
          margin;
      };

    const ensureSpace =
      (
        required:
          number,
      ) => {
        if (
          y -
            required <
          margin
        ) {
          newPage();
        }
      };

    const wrap =
      (
        value:
          unknown,
        maxChars =
          76,
      ) => {
        const text =
          String(
            value ??
              "",
          )
            .replace(
              /\s+/g,
              " ",
            )
            .trim();

        if (!text) {
          return [
            "-",
          ];
        }

        const words =
          text.split(
            " ",
          );

        const lines:
          string[] =
          [];

        let current =
          "";

        for (
          const word of words
        ) {
          const next =
            current
              ? `${current} ${word}`
              : word;

          if (
            next.length >
              maxChars &&
            current
          ) {
            lines.push(
              current,
            );

            current =
              word;
          } else {
            current =
              next;
          }
        }

        if (current) {
          lines.push(
            current,
          );
        }

        return lines;
      };

    const drawText =
      (
        text:
          string,
        options?: {
          size?: number;
          strong?: boolean;
          x?: number;
          gapAfter?: number;
          color?: {
            r: number;
            g: number;
            b: number;
          };
        },
      ) => {
        const size =
          options?.size ??
          10;

        const lineHeight =
          size +
          4;

        ensureSpace(
          lineHeight +
            (
              options?.gapAfter ??
              0
            ),
        );

        const color =
          options?.color ??
          {
            r:
              0.12,
            g:
              0.16,
            b:
              0.23,
          };

        page.drawText(
          text,
          {
            x:
              options?.x ??
              margin,

            y,
            size,

            font:
              options?.strong
                ? bold
                : regular,

            color:
              rgb(
                color.r,
                color.g,
                color.b,
              ),
          },
        );

        y -=
          lineHeight +
          (
            options?.gapAfter ??
            0
          );
      };

    const drawWrapped =
      (
        value:
          unknown,
        options?: {
          size?: number;
          strong?: boolean;
          x?: number;
          maxChars?: number;
          gapAfter?: number;
        },
      ) => {
        const lines =
          wrap(
            value,
            options?.maxChars ??
              76,
          );

        for (
          let index =
            0;
          index <
          lines.length;
          index++
        ) {
          drawText(
            lines[index],
            {
              size:
                options?.size,

              strong:
                options?.strong,

              x:
                options?.x,

              gapAfter:
                index ===
                lines.length -
                  1
                  ? options?.gapAfter
                  : 0,
            },
          );
        }
      };

    const section =
      (
        title:
          string,
      ) => {
        ensureSpace(
          36,
        );

        y -=
          8;

        page.drawLine({
          start: {
            x:
              margin,
            y:
              y +
              9,
          },

          end: {
            x:
              pageWidth -
              margin,
            y:
              y +
              9,
          },

          thickness:
            0.7,

          color:
            rgb(
              0.88,
              0.90,
              0.93,
            ),
        });

        drawText(
          title,
          {
            size:
              12,
            strong:
              true,
            gapAfter:
              5,
          },
        );
      };

    const labelValue =
      (
        label:
          string,
        value:
          unknown,
      ) => {
        drawText(
          label.toUpperCase(),
          {
            size:
              7.5,
            strong:
              true,
            color: {
              r:
                0.40,
              g:
                0.45,
              b:
                0.53,
            },
          },
        );

        drawWrapped(
          value,
          {
            size:
              10,
            gapAfter:
              5,
          },
        );
      };

    const formatDate =
      (
        value:
          unknown,
      ) => {
        if (!value) {
          return "-";
        }

        const date =
          new Date(
            String(
              value,
            ),
          );

        if (
          Number.isNaN(
            date.getTime(),
          )
        ) {
          return "-";
        }

        return date.toLocaleDateString(
          "en-IN",
          {
            day:
              "2-digit",
            month:
              "short",
            year:
              "numeric",
          },
        );
      };

    const money =
      (
        value:
          unknown,
      ) =>
        `INR ${Number(
          value ??
            0,
        ).toLocaleString(
          "en-IN",
          {
            maximumFractionDigits:
              0,
          },
        )}`;

    drawText(
      "CELLTRO",
      {
        size:
          22,
        strong:
          true,
        gapAfter:
          2,
      },
    );

    drawText(
      "ORDER SUMMARY",
      {
        size:
          9,
        strong:
          true,
        color: {
          r:
            0.03,
          g:
            0.45,
          b:
            0.35,
        },
        gapAfter:
          10,
      },
    );

    drawText(
      `Order ID: ${order.orderNumber}`,
      {
        size:
          15,
        strong:
          true,
        gapAfter:
          3,
      },
    );

    drawWrapped(
      `${order.productName}${
        order.variantLabel
          ? ` - ${order.variantLabel}`
          : ""
      }`,
      {
        size:
          11,
        strong:
          true,
        gapAfter:
          8,
      },
    );

    drawText(
      `Status: ${String(
        order.status ??
          "",
      ).replace(
        /_/g,
        " ",
      )}`,
      {
        size:
          10,
        strong:
          true,
      },
    );

    section(
      "ORDER DETAILS",
    );

    labelValue(
      "Expected Value",
      money(
        order.finalPrice,
      ),
    );

    labelValue(
      "Pickup Date",
      formatDate(
        order.pickupDate,
      ),
    );

    labelValue(
      "Pickup Slot",
      order.pickupSlot
        ?.label ??
        "-",
    );

    labelValue(
      "Payout Method",
      order.payoutMethod ??
        "-",
    );

    if (
      order.address
    ) {
      section(
        "PICKUP ADDRESS",
      );

      labelValue(
        "Customer",
        order.address.fullName ??
          "-",
      );

      const addressLine =
        [
          order.address
            .house,
          order.address
            .street,
          order.address
            .locality,
          order.address
            .landmark,
        ]
          .filter(
            Boolean,
          )
          .join(
            ", ",
          );

      labelValue(
        "Address",
        addressLine ||
          "-",
      );

      labelValue(
        "District / State / Pincode",
        [
          order.address
            .city,
          order.address
            .state,
          order.address
            .pincode,
        ]
          .filter(
            Boolean,
          )
          .join(
            ", ",
          ) ||
          "-",
      );

      labelValue(
        "Verified Mobile",
        order.address
          .phone ??
          "-",
      );
    }

    section(
      "ORDER TIMELINE",
    );

    const history =
      Array.isArray(
        order.statusHistory,
      )
        ? order.statusHistory
        : [];

    if (
      history.length ===
      0
    ) {
      drawText(
        "No status history available.",
        {
          size:
            9,
        },
      );
    } else {
      for (
        const item of history
      ) {
        ensureSpace(
          52,
        );

        drawWrapped(
          `${formatDate(
            item.createdAt,
          )} - ${String(
            item.status ??
              "",
          ).replace(
            /_/g,
            " ",
          )}`,
          {
            size:
              9,
            strong:
              true,
            gapAfter:
              1,
          },
        );

        if (
          item.note
        ) {
          drawWrapped(
            item.note,
            {
              size:
                8.5,
              maxChars:
                85,
              gapAfter:
                5,
            },
          );
        }
      }
    }

    if (
      order.feedback
    ) {
      section(
        "CUSTOMER FEEDBACK",
      );

      labelValue(
        "Rating",
        order.feedback
          .rating
          ? `${order.feedback.rating}/5`
          : "-",
      );

      labelValue(
        "Response",
        order.feedback
          .optionLabel ??
          "-",
      );

      labelValue(
        "Comment",
        order.feedback
          .feedbackText ??
          "-",
      );
    }

    ensureSpace(
      55,
    );

    y -=
      12;

    page.drawLine({
      start: {
        x:
          margin,
        y:
          y +
          8,
      },

      end: {
        x:
          pageWidth -
          margin,
        y:
          y +
          8,
      },

      thickness:
        0.7,

      color:
        rgb(
          0.88,
          0.90,
          0.93,
        ),
    });

    drawText(
      "This document is generated from the Celltro order record.",
      {
        size:
          8,
        color: {
          r:
            0.45,
          g:
            0.49,
          b:
            0.56,
        },
      },
    );

    drawText(
      `Generated: ${new Date().toISOString()}`,
      {
        size:
          7.5,
        color: {
          r:
            0.45,
          g:
            0.49,
          b:
            0.56,
        },
      },
    );

    return pdf.save();
  }

  async getCustomerOrderHistory(
    rawToken: string,
  ) {
    const verified =
      await this.requireVerifiedCustomer(
        rawToken,
      );

    const customer =
      await this.prisma.customer.findUnique({
        where: {
          phone:
            verified.phone,
        },
      });

    if (!customer) {
      return [];
    }

    const orders =
      await this.prisma.sellOrder.findMany({
        where: {
          customerId:
            customer.id,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          orderNumber:
            true,
          status:
            true,
          productName:
            true,
          variantLabel:
            true,
          finalPrice:
            true,
          pickupDate:
            true,
          createdAt:
            true,
        },
      });

    return orders.map(
      (order) => ({
        ...order,
        finalPrice:
          Number(
            order.finalPrice,
          ),
      }),
    );
  }

  async generateCustomerOrderPdf(
    rawToken: string,
    orderNumber: string,
  ) {
    const order =
      await this.getOrder(
        rawToken,
        orderNumber,
      );

    if (
      order.status !==
      "COMPLETED"
    ) {
      throw new BadRequestException(
        "Order PDF is available only after the order is completed.",
      );
    }

    return this.buildOrderPdf(
      order,
    );
  }

  /*
   * Kept as a service-only method for the Admin Orders module.
   * Do NOT expose this from an unauthenticated controller.
   * A protected Admin/RBAC controller can call this later.
   */
  async generateAdminOrderPdf(
    orderNumber: string,
  ) {
    const order =
      await this.prisma.sellOrder.findUnique({
        where: {
          orderNumber,
        },

        include: {
          pickupSlot:
            true,

          addressSnapshot:
            true,

          statusHistory: {
            orderBy: {
              createdAt:
                "asc",
            },
          },

          reschedules: {
            orderBy: {
              createdAt:
                "desc",
            },
          },

          feedback:
            true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found.",
      );
    }

    return this.buildOrderPdf(
      this.toOrderView(
        order,
      ),
    );
  }

  private toOrderView(
    order: any,
  ) {
    const address =
      order.addressSnapshot;

    return {
      orderNumber:
        order.orderNumber,

      status:
        order.status,

      productId:
        order.productId,

      variantId:
        order.variantId,

      productName:
        order.productName,

      productImage:
        order.productImage,

      variantLabel:
        order.variantLabel,

      basePrice:
        Number(
          order.basePrice,
        ),

      totalDeduction:
        Number(
          order.totalDeduction,
        ),

      finalPrice:
        Number(
          order.finalPrice,
        ),

      pickupDate:
        order.pickupDate,

      pickupSlot: {
        code:
          order.pickupSlot.code,

        label:
          order.pickupSlot.label,
      },

      payoutMethod:
        order.payoutMethod,

      payoutUpiMobile:
        order.payoutUpiMobile,

      address:
        address
          ? {
              fullName:
                address.fullName,

              phone:
                address.phone,

              house:
                address.house,

              street:
                address.street,

              locality:
                address.locality,

              landmark:
                address.landmark,

              pincode:
                address.pincode,

              city:
                address.city,

              state:
                address.state,

              type:
                address.type ===
                "HOME"
                  ? "Home"
                  : address.type ===
                      "OFFICE"
                    ? "Office"
                    : "Other",
            }
          : null,

      statusHistory:
        (
          order.statusHistory ||
          []
        ).map(
          (
            item: any,
          ) => ({
            id:
              item.id,

            status:
              item.status,

            note:
              item.note,

            createdAt:
              item.createdAt,
          }),
        ),

      reschedules:
        (
          order.reschedules ||
          []
        ).map(
          (
            item: any,
          ) => ({
            id:
              item.id,

            oldPickupDate:
              item.oldPickupDate,

            newPickupDate:
              item.newPickupDate,

            oldSlotLabel:
              item.oldSlotLabel,

            newSlotLabel:
              item.newSlotLabel,

            createdAt:
              item.createdAt,
          }),
        ),

      feedback:
        order.feedback
          ? {
              rating:
                order.feedback.rating,

              optionCode:
                order.feedback.optionCode,

              optionLabel:
                order.feedback.optionLabelSnapshot,

              feedbackText:
                order.feedback.feedbackText,

              createdAt:
                order.feedback.createdAt,
            }
          : null,

      createdAt:
        order.createdAt,

      updatedAt:
        order.updatedAt,
    };
  }
}
