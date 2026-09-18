import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from "@nestjs/common";
import {
  createHash,
  randomBytes,
  randomUUID,
} from "crypto";

import {
  QuestionnaireQuoteService,
} from "./questionnaire-quote.service.js";

import {
  PrismaService,
} from "../prisma/prisma/prisma.service.js";

const CUSTOMER_SESSION_HOURS = 24;
const MAX_DISTINCT_DEVICES_PER_SESSION = 3;

@Controller("questionnaire/quote")
export class QuestionnaireQuoteController {
  constructor(
    private readonly service:
      QuestionnaireQuoteService,

    private readonly prisma:
      PrismaService,
  ) {}

  private normalizePhone(
    value: unknown,
  ) {
    return String(value ?? "")
      .replace(/\D/g, "");
  }

  private hashToken(
    value: string,
  ) {
    return createHash("sha256")
      .update(value)
      .digest("hex");
  }

  private async getVerifiedSession(
    rawToken: string,
    phone: string,
  ) {
    const token =
      String(rawToken || "").trim();

    if (!token) {
      return null;
    }

    return this.prisma.customerVerifiedSession.findFirst({
      where: {
        tokenHash:
          this.hashToken(token),

        phone,

        revokedAt:
          null,

        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  private async createVerifiedSession(
    phone: string,
    previousToken?: string,
  ) {
    const rawToken =
      randomBytes(32)
        .toString("hex");

    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          CUSTOMER_SESSION_HOURS *
            60 *
            60 *
            1000,
      );

    const oldToken =
      String(
        previousToken || "",
      ).trim();

    if (oldToken) {
      await this.prisma.customerVerifiedSession.updateMany({
        where: {
          tokenHash:
            this.hashToken(
              oldToken,
            ),

          phone,

          revokedAt:
            null,
        },

        data: {
          revokedAt:
            now,
        },
      });
    }

    const session =
      await this.prisma.customerVerifiedSession.create({
        data: {
          tokenHash:
            this.hashToken(
              rawToken,
            ),

          phone,

          verifiedAt:
            now,

          expiresAt,
        },
      });

    return {
      rawToken,
      session,
    };
  }

  private async findOpenJourney(
    phone: string,
    productId: number,
    variantId: number,
  ) {
    return this.prisma.enquirySession.findFirst({
      where: {
        phone,
        productId,
        variantId,
        orderId:
          null,
      },

      orderBy: {
        updatedAt:
          "desc",
      },
    });
  }

  private async sessionCanQuoteDevice(
    verifiedSessionId: string,
    productId: number,
    variantId: number,
  ) {
    const quotedJourneys =
      await this.prisma.enquirySession.findMany({
        where: {
          verifiedSessionId,

          quoteViewedAt: {
            not: null,
          },
        },

        select: {
          productId: true,
          variantId: true,
        },
      });

    const uniqueDevices =
      new Set(
        quotedJourneys
          .filter(
            (
              item,
            ) =>
              item.productId !==
                null &&
              item.variantId !==
                null,
          )
          .map(
            (
              item,
            ) =>
              `${item.productId}:${item.variantId}`,
          ),
      );

    const currentKey =
      `${productId}:${variantId}`;

    if (
      uniqueDevices.has(
        currentKey,
      )
    ) {
      return true;
    }

    return (
      uniqueDevices.size <
      MAX_DISTINCT_DEVICES_PER_SESSION
    );
  }

  @Post("preview")
  preview(
    @Body()
    body: any,
  ) {
    return this.service.calculateQuote(
      body,
    );
  }

  @Post("send-otp")
  async sendOtp(
    @Body()
    body: any,
  ) {
    const phone =
      this.normalizePhone(
        body?.phone,
      );

    const productId =
      Number(
        body?.productId,
      );

    const variantId =
      Number(
        body?.variantId,
      );

    if (
      !/^[6-9]\d{9}$/.test(
        phone,
      )
    ) {
      throw new BadRequestException(
        "Enter a valid 10-digit mobile number.",
      );
    }

    if (
      !Number.isInteger(
        productId,
      ) ||
      !Number.isInteger(
        variantId,
      )
    ) {
      throw new BadRequestException(
        "Valid product and variant are required.",
      );
    }

    const existingOrder =
      await this.prisma.sellOrder.findFirst({
        where: {
          productId,
          variantId,

          status: {
            notIn: [
              "COMPLETED",
              "CANCELLED",
            ],
          },

          customer: {
            is: {
              phone,
            },
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          orderNumber: true,
          status: true,
        },
      });

    if (existingOrder) {
      return {
        existingOrder:
          true,

        orderNumber:
          existingOrder.orderNumber,

        orderStatus:
          existingOrder.status,

        message:
          "An active order already exists for this device.",
      };
    }

    const customerSessionToken =
      String(
        body?.customerSessionToken ||
          "",
      ).trim();

    const verifiedSession =
      await this.getVerifiedSession(
        customerSessionToken,
        phone,
      );

    if (verifiedSession) {
      const canQuoteWithoutOtp =
        await this.sessionCanQuoteDevice(
          verifiedSession.id,
          productId,
          variantId,
        );

      if (
        canQuoteWithoutOtp
      ) {
        const quote =
          await this.service.calculateQuote(
            body,
          );

        const now =
          new Date();

        const existingJourney =
          await this.findOpenJourney(
            phone,
            productId,
            variantId,
          );

        const journey =
          existingJourney
            ? await this.prisma.enquirySession.update({
                where: {
                  id:
                    existingJourney.id,
                },

                data: {
                  verifiedSessionId:
                    verifiedSession.id,

                  questionnaireSnapshot:
                    body?.answers ??
                    undefined,

                  questionnaireCompletedAt:
                    existingJourney
                      .questionnaireCompletedAt ??
                    now,

                  /*
                   * 24-hour verified session proves identity,
                   * but this is NOT a fresh SMS OTP verification.
                   */
                  identityVerifiedAt:
                    existingJourney
                      .identityVerifiedAt ??
                    now,

                  /*
                   * Preserve the first quote-view timestamp.
                   * Requoting / changing questionnaire answers
                   * must not restart the 10-minute inquiry clock.
                   */
                  quoteViewedAt:
                    existingJourney
                      .quoteViewedAt ??
                    now,

                  quoteAmount:
                    Number(
                      quote.finalPrice,
                    ),
                },
              })
            : await this.prisma.enquirySession.create({
                data: {
                  sessionId:
                    randomUUID(),

                  phone,
                  productId,
                  variantId,

                  verifiedSessionId:
                    verifiedSession.id,

                  questionnaireSnapshot:
                    body?.answers ??
                    undefined,

                  questionnaireCompletedAt:
                    now,

                  /*
                   * Identity trusted through existing 24h session.
                   * otpVerifiedAt intentionally stays NULL because
                   * no SMS OTP was verified for this device journey.
                   */
                  identityVerifiedAt:
                    now,

                  quoteViewedAt:
                    now,

                  quoteAmount:
                    Number(
                      quote.finalPrice,
                    ),
                },
              });

        return {
          existingOrder:
            false,

          otpRequired:
            false,

          sessionId:
            journey.sessionId,

          customerSessionExpiresAt:
            verifiedSession.expiresAt.toISOString(),

          ...quote,
        };
      }
    }

    const result =
      await this.service.sendOtp(
        body,
      );

    const sessionId =
      String(
        result?.sessionId ??
          "",
      ).trim();

    if (!sessionId) {
      throw new BadRequestException(
        "OTP session could not be created.",
      );
    }

    const now =
      new Date();

    const existingJourney =
      await this.findOpenJourney(
        phone,
        productId,
        variantId,
      );

    if (existingJourney) {
      await this.prisma.enquirySession.update({
        where: {
          id:
            existingJourney.id,
        },

        data: {
          sessionId,

          otpSentAt:
            now,

          questionnaireSnapshot:
            body?.answers ??
            undefined,

          questionnaireCompletedAt:
            existingJourney
              .questionnaireCompletedAt ??
            now,
        },
      });
    } else {
      await this.prisma.enquirySession.create({
        data: {
          sessionId,
          phone,
          productId,
          variantId,

          questionnaireSnapshot:
            body?.answers ??
            undefined,

          questionnaireCompletedAt:
            now,

          otpSentAt:
            now,
        },
      });
    }

    return {
      ...result,

      existingOrder:
        false,

      otpRequired:
        true,
    };
  }

  @Post("verify-otp")
  async verifyOtp(
    @Body()
    body: {
      sessionId: string;
      otp: string;
      customerSessionToken?: string;
    },
  ) {
    const result =
      await this.service.verifyOtp(
        body.sessionId,
        body.otp,
      );

    const phone =
      this.normalizePhone(
        result?.phone,
      );

    if (
      !/^[6-9]\d{9}$/.test(
        phone,
      )
    ) {
      throw new BadRequestException(
        "Verified mobile number is invalid.",
      );
    }

    const journey =
      await this.prisma.enquirySession.findUnique({
        where: {
          sessionId:
            String(
              body.sessionId ||
                "",
            ),
        },
      });

    if (!journey) {
      throw new BadRequestException(
        "Quote journey could not be found. Please request OTP again.",
      );
    }

    const {
      rawToken,
      session:
        verifiedSession,
    } =
      await this.createVerifiedSession(
        phone,
        body.customerSessionToken,
      );

    const now =
      new Date();

    await this.prisma.enquirySession.update({
      where: {
        id:
          journey.id,
      },

      data: {
        verifiedSessionId:
          verifiedSession.id,

        /*
         * These three timestamps have different meanings:
         * - otpVerifiedAt: actual SMS OTP success
         * - identityVerifiedAt: identity can now be trusted
         * - quoteViewedAt: first time this device quote was revealed
         */
        otpVerifiedAt:
          journey.otpVerifiedAt ??
          now,

        identityVerifiedAt:
          journey.identityVerifiedAt ??
          now,

        quoteViewedAt:
          journey.quoteViewedAt ??
          now,

        quoteAmount:
          Number(
            result?.finalPrice,
          ),
      },
    });

    return {
      ...result,

      customerSessionToken:
        rawToken,

      customerSessionExpiresAt:
        verifiedSession.expiresAt.toISOString(),

      maxDistinctDevicesPerSession:
        MAX_DISTINCT_DEVICES_PER_SESSION,
    };
  }
}
