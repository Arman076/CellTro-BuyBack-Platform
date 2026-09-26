import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from 'crypto';

import {
  AgentQuoteDecision,
  OrderEventActorType,
  OrderEventType,
  OrderVerificationChannel,
  OrderVerificationPurpose,
  OrderVerificationStatus,
} from '../generated/prisma/client.js';

import {
  PrismaService,
} from '../prisma/prisma/prisma.service.js';

import {
  OtpService,
} from '../otp/otp.service.js';

import {
  VendorEmailService,
} from '../vendor-security/vendor-email.service.js';

import {
  OrderEventService,
} from '../order-events/order-event.service.js';

import type {
  SendOrderVerificationDto,
} from './dto/send-order-verification.dto.js';

const EMAIL_OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

type AgentIdentity = {
  agentId: number;
  vendorId: number;
};

type OwnedOrder = Awaited<
  ReturnType<AgentOrderVerificationService['getOwnedOrder']>
>;

@Injectable()
export class AgentOrderVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly emailService: VendorEmailService,
    private readonly orderEvents: OrderEventService,
    
  ) {}

  private normalizePhone(value: unknown): string {
    const digits = String(value ?? '').replace(/\D/g, '');

    const local =
      digits.startsWith('91') && digits.length === 12
        ? digits.slice(2)
        : digits;

    if (!/^[6-9]\d{9}$/.test(local)) {
      throw new BadRequestException(
        'Enter a valid Indian mobile number.',
      );
    }

    return local;
  }

  private normalizeEmail(value: unknown): string {
    const email = String(value ?? '')
      .trim()
      .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException(
        'Enter a valid email address.',
      );
    }

    return email;
  }

  private detectChannel(destination: string): {
    channel: OrderVerificationChannel;
    normalized: string;
  } {
    const value = String(destination ?? '').trim();

    if (value.includes('@')) {
      return {
        channel: OrderVerificationChannel.EMAIL,
        normalized: this.normalizeEmail(value),
      };
    }

    return {
      channel: OrderVerificationChannel.SMS,
      normalized: this.normalizePhone(value),
    };
  }

  private maskPhone(phone: string): string {
    return `${phone.slice(0, 2)}******${phone.slice(-2)}`;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');

    const first = local.charAt(0);

    return `${first}${'*'.repeat(
      Math.max(3, local.length - 1),
    )}@${domain}`;
  }

  private otpSecret(): string {
    const secret = String(
      process.env.ORDER_OTP_HMAC_SECRET ??
        process.env.VENDOR_OTP_HMAC_SECRET ??
        '',
    ).trim();

    if (!secret) {
      throw new Error(
        'ORDER_OTP_HMAC_SECRET is not configured',
      );
    }

    return secret;
  }

  /**
   * Never persist the raw destination specifically for an OTP challenge.
   * The fingerprint binds the challenge to the exact normalized contact.
   */
  private destinationFingerprint(
    orderId: string,
    purpose: OrderVerificationPurpose,
    channel: OrderVerificationChannel,
    normalizedDestination: string,
  ): string {
    return createHmac(
      'sha256',
      this.otpSecret(),
    )
      .update(
        [
          'ORDER_DESTINATION',
          orderId,
          purpose,
          channel,
          normalizedDestination,
        ].join(':'),
      )
      .digest('hex');
  }

  private hashEmailOtp(
    challengeId: string,
    purpose: OrderVerificationPurpose,
    email: string,
    otp: string,
  ): string {
    return createHmac(
      'sha256',
      this.otpSecret(),
    )
      .update(
        [
          'ORDER_VERIFICATION',
          challengeId,
          purpose,
          email,
          otp,
        ].join(':'),
      )
      .digest('hex');
  }

  private secureHashEquals(
    actual: string,
    expected: string,
  ): boolean {
    const actualBuffer = Buffer.from(
      actual,
      'utf8',
    );

    const expectedBuffer = Buffer.from(
      expected,
      'utf8',
    );

    if (
      actualBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    return timingSafeEqual(
      actualBuffer,
      expectedBuffer,
    );
  }

  private async getOwnedOrder(
    identity: AgentIdentity,
    orderNumber: string,
  ) {
    const order =
      await this.prisma.sellOrder.findFirst({
        where: {
          orderNumber,

          currentVendorId:
            identity.vendorId,

          agentAssignments: {
            some: {
              agentId:
                identity.agentId,

              vendorId:
                identity.vendorId,

              unassignedAt:
                null,
            },
          },
        },

        select: {
          id: true,
          orderNumber: true,
          status: true,
           productId: true,
            variantId: true,

          customer: {
            select: {
              id: true,
              phone: true,
              email: true,
              normalizedEmail: true,
            },
          },

          addressSnapshot: {
            select: {
              phone: true,
              email: true,
            },
          },
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Order not found.',
      );
    }

    return order;
  }

  private ensurePurposeAllowed(
    purpose: OrderVerificationPurpose,
    status: string,
  ): void {
    if (
      purpose ===
        OrderVerificationPurpose.INSPECTION_START &&
      ![
        'PICKUP_REQUESTED',
        'PICKUP_CONFIRMED',
        'PICKUP_STARTED',
      ].includes(status)
    ) {
      throw new ConflictException(
        'Inspection verification is not allowed for the current order status.',
      );
    }

    if (
      (
        purpose ===
          OrderVerificationPurpose.QUOTE_ACCEPT ||
        purpose ===
          OrderVerificationPurpose.QUOTE_REJECT
      ) &&
      status !==
        'INSPECTION_COMPLETED'
    ) {
      throw new ConflictException(
        'Quote decision verification is allowed only after inspection is completed.',
      );
    }
  }

  private getAllowedDestinations(
    order: OwnedOrder,
    channel: OrderVerificationChannel,
  ): string[] {
    if (
      channel ===
      OrderVerificationChannel.SMS
    ) {
      const values = [
        order.addressSnapshot?.phone,
        order.customer.phone,
      ].filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      );

      return [
        ...new Set(
          values.map((value) =>
            this.normalizePhone(
              value,
            ),
          ),
        ),
      ];
    }

    const values = [
      order.addressSnapshot?.email,
      order.customer.normalizedEmail,
      order.customer.email,
    ].filter(
      (
        value,
      ): value is string =>
        Boolean(value),
    );

    return [
      ...new Set(
        values.map((value) =>
          this.normalizeEmail(
            value,
          ),
        ),
      ),
    ];
  }

  private verifyDestinationMatches(
    order: OwnedOrder,
    purpose: OrderVerificationPurpose,
    channel: OrderVerificationChannel,
    normalizedDestination: string,
  ): void {
    const allowed =
      this.getAllowedDestinations(
        order,
        channel,
      );

    if (
      allowed.includes(
        normalizedDestination,
      )
    ) {
      return;
    }

    /*
     * A missing email may be captured by the agent only at
     * INSPECTION_START. It is still untrusted at this point:
     * the challenge fingerprint binds the OTP to this exact
     * normalized candidate, and the email is persisted only
     * after successful OTP verification.
     *
     * Once any authoritative email exists, a different email
     * is never accepted here.
     */
    if (
      channel ===
        OrderVerificationChannel.EMAIL &&
      purpose ===
        OrderVerificationPurpose.INSPECTION_START &&
      allowed.length === 0
    ) {
      return;
    }

    if (
      channel ===
      OrderVerificationChannel.SMS
    ) {
      throw new ForbiddenException(
        'Mobile number does not match this order.',
      );
    }

    throw new ForbiddenException(
      'Email address does not match this order.',
    );
  }

  /**
   * Resolves the exact authoritative destination that was selected
   * when the challenge was created.
   *
   * This fixes the previous problem where verification could simply
   * pick addressSnapshot first even when the OTP had been sent to the
   * customer's other authoritative contact.
   */
  private resolveChallengeDestination(
    order: OwnedOrder,
    challenge: {
      purpose: OrderVerificationPurpose;
      channel: OrderVerificationChannel;
      destinationFingerprint: string;
    },
    suppliedDestination?: string,
  ): {
    destination: string;
    isNewInspectionEmail: boolean;
  } {
    const allowed =
      this.getAllowedDestinations(
        order,
        challenge.channel,
      );

    for (
      const destination of allowed
    ) {
      const fingerprint =
        this.destinationFingerprint(
          order.id,
          challenge.purpose,
          challenge.channel,
          destination,
        );

      if (
        this.secureHashEquals(
          fingerprint,
          challenge.destinationFingerprint,
        )
      ) {
        return {
          destination,
          isNewInspectionEmail: false,
        };
      }
    }

    /*
     * The only non-authoritative destination we can resolve is
     * a candidate email created for INSPECTION_START when the
     * order/customer had no email at send time.
     *
     * The raw candidate is never stored on the challenge.
     * The browser must supply it again and its HMAC fingerprint
     * must match the challenge exactly.
     */
    if (
      challenge.channel ===
        OrderVerificationChannel.EMAIL &&
      challenge.purpose ===
        OrderVerificationPurpose.INSPECTION_START &&
      allowed.length === 0 &&
      suppliedDestination
    ) {
      const candidate =
        this.normalizeEmail(
          suppliedDestination,
        );

      const candidateFingerprint =
        this.destinationFingerprint(
          order.id,
          challenge.purpose,
          challenge.channel,
          candidate,
        );

      if (
        this.secureHashEquals(
          candidateFingerprint,
          challenge.destinationFingerprint,
        )
      ) {
        return {
          destination: candidate,
          isNewInspectionEmail: true,
        };
      }
    }

    throw new UnauthorizedException(
      'Verification destination is no longer valid for this order.',
    );
  }

  /**
   * Quote-decision OTPs are bound to the exact immutable agent quote.
   * No price supplied by the browser participates in this binding.
   */
  private quoteDecisionContextHash(
    orderId: string,
    inspectionId: string,
    quoteHash: string,
    purpose: OrderVerificationPurpose,
  ): string {
    if (
      purpose !== OrderVerificationPurpose.QUOTE_ACCEPT &&
      purpose !== OrderVerificationPurpose.QUOTE_REJECT
    ) {
      throw new BadRequestException(
        'Quote decision context requires an accept or reject purpose.',
      );
    }

    return createHmac('sha256', this.otpSecret())
      .update(
        [
          'AGENT_QUOTE_DECISION',
          orderId,
          inspectionId,
          quoteHash,
          purpose,
        ].join(':'),
      )
      .digest('hex');
  }

  private async getQuoteDecisionContext(
    orderId: string,
    purpose: OrderVerificationPurpose,
  ): Promise<{
    inspectionId: string;
    quoteHash: string;
    contextHash: string;
  } | null> {
    if (
      purpose !== OrderVerificationPurpose.QUOTE_ACCEPT &&
      purpose !== OrderVerificationPurpose.QUOTE_REJECT
    ) {
      return null;
    }

    const inspection =
      await this.prisma.agentOrderInspection.findUnique({
        where: {
          orderId,
        },

        select: {
          id: true,
          status: true,
          quoteHash: true,
          quoteGeneratedAt: true,
          quoteDecision: true,
        },
      });

    if (
      !inspection ||
      inspection.status !== 'COMPLETED' ||
      !inspection.quoteHash ||
      !inspection.quoteGeneratedAt
    ) {
      throw new ConflictException(
        'A completed frozen inspection quote is required before customer decision verification.',
      );
    }

    if (inspection.quoteDecision) {
      throw new ConflictException(
        `Customer has already ${inspection.quoteDecision.toLowerCase()} this quote.`,
      );
    }

    return {
      inspectionId: inspection.id,
      quoteHash: inspection.quoteHash,
      contextHash: this.quoteDecisionContextHash(
        orderId,
        inspection.id,
        inspection.quoteHash,
        purpose,
      ),
    };
  }

  private async enforceCooldown(
    orderId: string,
    purpose: OrderVerificationPurpose,
  ): Promise<void> {
    const latest =
      await this.prisma.orderVerificationChallenge.findFirst({
        where: {
          orderId,
          purpose,

          status: {
            in: [
              OrderVerificationStatus.PENDING,
              OrderVerificationStatus.VERIFIED,
            ],
          },
        },

        orderBy: {
          createdAt: 'desc',
        },

        select: {
          createdAt: true,
        },
      });

    if (!latest) {
      return;
    }

    const elapsed =
      Date.now() -
      latest.createdAt.getTime();

    const cooldownMs =
      RESEND_COOLDOWN_SECONDS *
      1000;

    if (
      elapsed <
      cooldownMs
    ) {
      const remaining =
        Math.ceil(
          (
            cooldownMs -
            elapsed
          ) / 1000,
        );

      throw new HttpException(
        `Please wait ${remaining} seconds before requesting another OTP.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async registerFailedAttempt(
    challengeId: string,
  ): Promise<void> {
    const updated =
      await this.prisma.orderVerificationChallenge.update({
        where: {
          id: challengeId,
        },

        data: {
          attempts: {
            increment: 1,
          },
        },

        select: {
          attempts: true,
        },
      });

    if (
      updated.attempts >=
      OTP_MAX_ATTEMPTS
    ) {
      await this.prisma.orderVerificationChallenge.updateMany({
        where: {
          id: challengeId,

          status:
            OrderVerificationStatus.PENDING,
        },

        data: {
          status:
            OrderVerificationStatus.LOCKED,
        },
      });
    }
  }

  async send(
    identity: AgentIdentity,
    orderNumber: string,
    body: SendOrderVerificationDto,
  ) {
    const order =
      await this.getOwnedOrder(
        identity,
        orderNumber,
      );

    this.ensurePurposeAllowed(
      body.purpose,
      order.status,
    );

    const quoteContext =
      await this.getQuoteDecisionContext(
        order.id,
        body.purpose,
      );

    const {
      channel,
      normalized,
    } =
      this.detectChannel(
        body.destination,
      );

    this.verifyDestinationMatches(
      order,
      body.purpose,
      channel,
      normalized,
    );

    await this.enforceCooldown(
      order.id,
      body.purpose,
    );

    const fingerprint =
      this.destinationFingerprint(
        order.id,
        body.purpose,
        channel,
        normalized,
      );

    const now = new Date();

    /*
     * Important:
     * We do NOT expire the previous challenge before the external
     * provider/email send succeeds. Otherwise a temporary provider
     * failure could destroy the customer's still-valid OTP.
     */

    if (
      channel ===
      OrderVerificationChannel.SMS
    ) {
      const providerResult =
        await this.otpService.sendOtp(
          normalized,
        );

      const expiresAt =
        new Date(
          now.getTime() +
            providerResult.expiresInSeconds *
              1000,
        );

      const challenge =
        await this.prisma.orderVerificationChallenge.create({
          data: {
            orderId:
              order.id,

            provider:
              providerResult.provider,

            purpose:
              body.purpose,

            channel,

            otpHash:
              null,

            destinationMasked:
              this.maskPhone(
                normalized,
              ),

            destinationFingerprint:
              fingerprint,

            contextHash:
              quoteContext?.contextHash ?? null,

            expiresAt,
          },

          select: {
            id: true,
            purpose: true,
            channel: true,
            destinationMasked: true,
            expiresAt: true,
          },
        });

      await this.prisma.orderVerificationChallenge.updateMany({
        where: {
          orderId:
            order.id,

          purpose:
            body.purpose,

          status:
            OrderVerificationStatus.PENDING,

          id: {
            not:
              challenge.id,
          },
        },

        data: {
          status:
            OrderVerificationStatus.EXPIRED,
        },
      });

      await this.orderEvents.record({
        orderId:
          order.id,

        eventType:
          OrderEventType.VERIFICATION_SENT,

        actorType:
          OrderEventActorType.AGENT,

        agentId:
          identity.agentId,

        metadata: {
          purpose:
            body.purpose,

          channel:
            OrderVerificationChannel.SMS,

          challengeId:
            challenge.id,

          destinationMasked:
            challenge.destinationMasked,
        },
      });

      return {
        challengeId:
          challenge.id,

        purpose:
          challenge.purpose,

        channel:
          challenge.channel,

        destinationMasked:
          challenge.destinationMasked,

        expiresAt:
          challenge.expiresAt,

        expiresInSeconds:
          providerResult.expiresInSeconds,
      };
    }

    const otp =
      String(
        randomInt(
          100000,
          1000000,
        ),
      );

    const expiresAt =
      new Date(
        now.getTime() +
          EMAIL_OTP_EXPIRY_MINUTES *
            60 *
            1000,
      );

    /*
     * We need the challenge id before generating the OTP HMAC,
     * therefore the row starts with a non-secret placeholder hash.
     */
    const challenge =
      await this.prisma.orderVerificationChallenge.create({
        data: {
          orderId:
            order.id,

          provider:
            'SMTP',

          purpose:
            body.purpose,

          channel,

          destinationMasked:
            this.maskEmail(
              normalized,
            ),

          destinationFingerprint:
            fingerprint,

          contextHash:
            quoteContext?.contextHash ?? null,

          expiresAt,

          otpHash:
            'PENDING',
        },

        select: {
          id: true,
          destinationMasked: true,
        },
      });

    const otpHash =
      this.hashEmailOtp(
        challenge.id,
        body.purpose,
        normalized,
        otp,
      );

    await this.prisma.orderVerificationChallenge.update({
      where: {
        id:
          challenge.id,
      },

      data: {
        otpHash,
      },
    });

    try {
      await this.emailService.sendOrderVerificationOtp({
        email:
          normalized,

        otp,

        purpose:
          body.purpose,

        orderNumber:
          order.orderNumber,
      });
    } catch (error) {
      await this.prisma.orderVerificationChallenge.updateMany({
        where: {
          id:
            challenge.id,

          status:
            OrderVerificationStatus.PENDING,
        },

        data: {
          status:
            OrderVerificationStatus.EXPIRED,
        },
      });

      throw error;
    }

    /*
     * Only after successful delivery do we invalidate older
     * pending challenges for the same order/purpose.
     */
    await this.prisma.orderVerificationChallenge.updateMany({
      where: {
        orderId:
          order.id,

        purpose:
          body.purpose,

        status:
          OrderVerificationStatus.PENDING,

        id: {
          not:
            challenge.id,
        },
      },

      data: {
        status:
          OrderVerificationStatus.EXPIRED,
      },
    });

    await this.orderEvents.record({
      orderId:
        order.id,

      eventType:
        OrderEventType.VERIFICATION_SENT,

      actorType:
        OrderEventActorType.AGENT,

      agentId:
        identity.agentId,

      metadata: {
        purpose:
          body.purpose,

        channel:
          OrderVerificationChannel.EMAIL,

        challengeId:
          challenge.id,

        destinationMasked:
          challenge.destinationMasked,
      },
    });

    /*
     * OTP is deliberately NEVER returned.
     * This applies to development/test as well as production.
     */
    return {
      challengeId:
        challenge.id,

      purpose:
        body.purpose,

      channel:
        OrderVerificationChannel.EMAIL,

      destinationMasked:
        challenge.destinationMasked,

      expiresAt,

      expiresInSeconds:
        EMAIL_OTP_EXPIRY_MINUTES *
        60,
    };
  }

  async verify(
    identity: AgentIdentity,
    orderNumber: string,
    challengeId: string,
    otp: string,
    suppliedDestination?: string,
  ) {
    const order =
      await this.getOwnedOrder(
        identity,
        orderNumber,
      );

    const challenge =
      await this.prisma.orderVerificationChallenge.findFirst({
        where: {
          id:
            challengeId,

          orderId:
            order.id,
        },

        select: {
          id: true,
          provider: true,
          purpose: true,
          channel: true,
          otpHash: true,
          destinationMasked: true,
          destinationFingerprint: true,
          contextHash: true,
          status: true,
          attempts: true,
          expiresAt: true,
          verifiedAt: true,
        },
      });

    if (!challenge) {
      throw new NotFoundException(
        'Verification challenge not found.',
      );
    }

    if (
      challenge.status ===
        OrderVerificationStatus.VERIFIED ||
      challenge.status ===
        OrderVerificationStatus.CONSUMED
    ) {
      return {
        verified: true,

        challengeId:
          challenge.id,

        purpose:
          challenge.purpose,

        channel:
          challenge.channel,

        verifiedAt:
          challenge.verifiedAt,
      };
    }

    if (
      challenge.status ===
        OrderVerificationStatus.EXPIRED ||
      challenge.status ===
        OrderVerificationStatus.LOCKED ||
      challenge.expiresAt.getTime() <=
        Date.now()
    ) {
      if (
        challenge.status ===
        OrderVerificationStatus.PENDING
      ) {
        await this.prisma.orderVerificationChallenge.updateMany({
          where: {
            id:
              challenge.id,

            status:
              OrderVerificationStatus.PENDING,
          },

          data: {
            status:
              OrderVerificationStatus.EXPIRED,
          },
        });
      }

      throw new UnauthorizedException(
        'OTP has expired. Request a new OTP.',
      );
    }

    this.ensurePurposeAllowed(
      challenge.purpose,
      order.status,
    );

    const quoteContext =
      await this.getQuoteDecisionContext(
        order.id,
        challenge.purpose,
      );

    if (quoteContext) {
      if (
        !challenge.contextHash ||
        !this.secureHashEquals(
          challenge.contextHash,
          quoteContext.contextHash,
        )
      ) {
        throw new UnauthorizedException(
          'OTP is not valid for the current frozen quote.',
        );
      }
    }

    const {
      destination,
      isNewInspectionEmail,
    } =
      this.resolveChallengeDestination(
        order,
        challenge,
        suppliedDestination,
      );

    if (
      challenge.channel ===
      OrderVerificationChannel.SMS
    ) {
      try {
        await this.otpService.verifyOtp(
          destination,
          otp,
        );
      } catch (error) {
        await this.registerFailedAttempt(
          challenge.id,
        );

        throw error;
      }
    } else {
      if (
        !challenge.otpHash ||
        challenge.otpHash ===
          'PENDING'
      ) {
        throw new UnauthorizedException(
          'OTP challenge is not valid.',
        );
      }

      const expected =
        this.hashEmailOtp(
          challenge.id,
          challenge.purpose,
          destination,
          String(otp),
        );

      if (
        !this.secureHashEquals(
          expected,
          challenge.otpHash,
        )
      ) {
        await this.registerFailedAttempt(
          challenge.id,
        );

        throw new UnauthorizedException(
          'Invalid OTP.',
        );
      }
    }

    const now = new Date();

    /*
     * Conditional update prevents two concurrent verify requests
     * from independently transitioning the same PENDING challenge.
     */
    const transitioned =
      await this.prisma.$transaction(
        async (tx) => {
          const challengeTransition =
            await tx.orderVerificationChallenge.updateMany({
              where: {
                id:
                  challenge.id,

                status:
                  OrderVerificationStatus.PENDING,

                expiresAt: {
                  gt: now,
                },
              },

              data: {
                status:
                  OrderVerificationStatus.VERIFIED,

                verifiedAt:
                  now,
              },
            });

          if (
            challengeTransition.count !== 1 ||
            !isNewInspectionEmail
          ) {
            return challengeTransition;
          }

          /*
           * Persist a manually entered email only after its OTP
           * has been verified. Both writes are conditional so a
           * concurrent request can never overwrite an email that
           * became authoritative in the meantime.
           */
          const customerWrite =
            await tx.customer.updateMany({
              where: {
                id:
                  order.customer.id,

                email:
                  null,

                normalizedEmail:
                  null,
              },

              data: {
                email:
                  destination,

                normalizedEmail:
                  destination,
              },
            });

          const snapshotWrite =
            await tx.orderAddressSnapshot.updateMany({
              where: {
                orderId:
                  order.id,

                email:
                  null,
              },

              data: {
                email:
                  destination,
              },
            });

          const expectedSnapshotWrites =
            order.addressSnapshot
              ? 1
              : 0;

          if (
            customerWrite.count !== 1 ||
            snapshotWrite.count !==
              expectedSnapshotWrites
          ) {
            const currentOrder =
              await tx.sellOrder.findUnique({
                where: {
                  id:
                    order.id,
                },

                select: {
                  customer: {
                    select: {
                      email: true,
                      normalizedEmail: true,
                    },
                  },

                  addressSnapshot: {
                    select: {
                      email: true,
                    },
                  },
                },
              });

            const currentEmails = [
              currentOrder?.customer.normalizedEmail,
              currentOrder?.customer.email,
              currentOrder?.addressSnapshot?.email,
            ]
              .filter(
                (
                  value,
                ): value is string =>
                  Boolean(value),
              )
              .map((value) =>
                this.normalizeEmail(
                  value,
                ),
              );

            if (
              currentEmails.length === 0 ||
              currentEmails.some(
                (value) =>
                  value !== destination,
              )
            ) {
              throw new ConflictException(
                'A different customer email was saved while this OTP was being verified. Refresh the order and try again.',
              );
            }
          }

          return challengeTransition;
        },
      );

    if (
      transitioned.count === 0
    ) {
      const current =
        await this.prisma.orderVerificationChallenge.findUnique({
          where: {
            id:
              challenge.id,
          },

          select: {
            status: true,
            verifiedAt: true,
          },
        });

      if (
        current?.status ===
          OrderVerificationStatus.VERIFIED ||
        current?.status ===
          OrderVerificationStatus.CONSUMED
      ) {
        return {
          verified: true,

          challengeId:
            challenge.id,

          purpose:
            challenge.purpose,

          channel:
            challenge.channel,

          verifiedAt:
            current.verifiedAt,
        };
      }

      throw new UnauthorizedException(
        'OTP challenge is no longer valid.',
      );
    }

    /*
     * Event idempotency will be moved into the same transaction as
     * lifecycle mutation in the next Start Inspection batch.
     *
     * For this verification-only transition, record the audit event
     * now. No OTP/raw destination is placed in metadata.
     */
    await this.orderEvents.record({
      orderId:
        order.id,

      eventType:
        OrderEventType.VERIFICATION_VERIFIED,

      actorType:
        OrderEventActorType.AGENT,

      agentId:
        identity.agentId,

      metadata: {
        purpose:
          challenge.purpose,

        channel:
          challenge.channel,

        challengeId:
          challenge.id,

        destinationMasked:
          challenge.destinationMasked,
      },
    });

    return {
      verified: true,

      challengeId:
        challenge.id,

      purpose:
        challenge.purpose,

      channel:
        challenge.channel,

      verifiedAt:
        now,
    };
  }
  async commitQuoteDecision(
    identity: AgentIdentity,
    orderNumber: string,
    challengeId: string,
    decisionValue: string,
  ) {
    const normalizedChallengeId =
      String(challengeId ?? '').trim();

    if (!normalizedChallengeId) {
      throw new BadRequestException(
        'Verified quote decision challenge is required.',
      );
    }

    const normalizedDecision =
      String(decisionValue ?? '')
        .trim()
        .toUpperCase();

    if (
      normalizedDecision !== AgentQuoteDecision.ACCEPTED &&
      normalizedDecision !== AgentQuoteDecision.REJECTED
    ) {
      throw new BadRequestException(
        'Decision must be ACCEPTED or REJECTED.',
      );
    }

    const decision =
      normalizedDecision as AgentQuoteDecision;

    const expectedPurpose =
      decision === AgentQuoteDecision.ACCEPTED
        ? OrderVerificationPurpose.QUOTE_ACCEPT
        : OrderVerificationPurpose.QUOTE_REJECT;

    const expectedEventType =
      decision === AgentQuoteDecision.ACCEPTED
        ? OrderEventType.CUSTOMER_ACCEPTED
        : OrderEventType.CUSTOMER_REJECTED;

    const order =
      await this.getOwnedOrder(
        identity,
        orderNumber,
      );

    if (order.status !== 'INSPECTION_COMPLETED') {
      throw new ConflictException(
        'Customer decision is allowed only after inspection is completed.',
      );
    }

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const inspection =
            await tx.agentOrderInspection.findUnique({
              where: {
                orderId: order.id,
              },

              select: {
                id: true,
                orderId: true,
                agentId: true,
                vendorId: true,
                status: true,
                quoteHash: true,
                quoteGeneratedAt: true,
                quoteFinalPrice: true,
                quoteDecision: true,
                quoteDecisionAt: true,
                quoteDecisionChallengeId: true,
              },
            });

          if (
            !inspection ||
            inspection.status !== 'COMPLETED' ||
            !inspection.quoteHash ||
            !inspection.quoteGeneratedAt ||
            inspection.quoteFinalPrice === null
          ) {
            throw new ConflictException(
              'Completed frozen inspection quote was not found.',
            );
          }

          if (
            inspection.agentId !== identity.agentId ||
            inspection.vendorId !== identity.vendorId
          ) {
            throw new ForbiddenException(
              'Inspection does not belong to the active agent assignment.',
            );
          }

          /*
           * Idempotent retry:
           * the same verified challenge + same decision returns the canonical
           * stored decision instead of creating another event.
           */
          if (inspection.quoteDecision) {
            if (
              inspection.quoteDecision === decision &&
              inspection.quoteDecisionChallengeId ===
                normalizedChallengeId
            ) {
              return {
                alreadyDecided: true,
                inspection,
              };
            }

            throw new ConflictException(
              `Customer has already ${inspection.quoteDecision.toLowerCase()} this quote.`,
            );
          }

          const challenge =
            await tx.orderVerificationChallenge.findFirst({
              where: {
                id: normalizedChallengeId,
                orderId: order.id,
                purpose: expectedPurpose,
              },

              select: {
                id: true,
                purpose: true,
                channel: true,
                destinationMasked: true,
                contextHash: true,
                status: true,
                expiresAt: true,
                verifiedAt: true,
                consumedAt: true,
              },
            });

          if (!challenge) {
            throw new NotFoundException(
              'Quote decision verification challenge not found.',
            );
          }

          const expectedContextHash =
            this.quoteDecisionContextHash(
              order.id,
              inspection.id,
              inspection.quoteHash,
              expectedPurpose,
            );

          if (
            !challenge.contextHash ||
            !this.secureHashEquals(
              challenge.contextHash,
              expectedContextHash,
            )
          ) {
            throw new UnauthorizedException(
              'OTP is not valid for the current frozen quote.',
            );
          }

          if (
            challenge.status !==
            OrderVerificationStatus.VERIFIED
          ) {
            throw new UnauthorizedException(
              'Verify the customer OTP before confirming the quote decision.',
            );
          }

          const now = new Date();

          if (
            challenge.expiresAt.getTime() <=
            now.getTime()
          ) {
            throw new UnauthorizedException(
              'OTP verification has expired. Request a new OTP.',
            );
          }

          /*
           * Exactly one concurrent request can consume VERIFIED -> CONSUMED.
           */
          const consumed =
            await tx.orderVerificationChallenge.updateMany({
              where: {
                id: challenge.id,
                orderId: order.id,
                purpose: expectedPurpose,
                status:
                  OrderVerificationStatus.VERIFIED,
                expiresAt: {
                  gt: now,
                },
              },

              data: {
                status:
                  OrderVerificationStatus.CONSUMED,
                consumedAt: now,
              },
            });

          if (consumed.count !== 1) {
            const currentInspection =
              await tx.agentOrderInspection.findUnique({
                where: {
                  orderId: order.id,
                },

                select: {
                  id: true,
                  quoteDecision: true,
                  quoteDecisionAt: true,
                  quoteDecisionChallengeId: true,
                  quoteFinalPrice: true,
                  quoteHash: true,
                },
              });

            if (
              currentInspection?.quoteDecision === decision &&
              currentInspection.quoteDecisionChallengeId ===
                challenge.id
            ) {
              return {
                alreadyDecided: true,
                inspection: {
                  ...inspection,
                  quoteDecision:
                    currentInspection.quoteDecision,
                  quoteDecisionAt:
                    currentInspection.quoteDecisionAt,
                  quoteDecisionChallengeId:
                    currentInspection.quoteDecisionChallengeId,
                },
              };
            }

            throw new ConflictException(
              'Quote decision is already being processed. Please retry.',
            );
          }

          /*
           * Conditional write is the second concurrency gate.
           * It prevents ACCEPT and REJECT from both winning.
           */
          const decisionWrite =
            await tx.agentOrderInspection.updateMany({
              where: {
                id: inspection.id,
                orderId: order.id,
                agentId: identity.agentId,
                vendorId: identity.vendorId,
                status: 'COMPLETED',
                quoteHash: inspection.quoteHash,
                quoteDecision: null,
              },

              data: {
                quoteDecision: decision,
                quoteDecisionAt: now,
                quoteDecisionChallengeId:
                  challenge.id,
              },
            });

          if (decisionWrite.count !== 1) {
            throw new ConflictException(
              'Customer decision changed before it could be saved.',
            );
          }

          await this.orderEvents.record(
            {
              orderId: order.id,
              eventType: expectedEventType,
              actorType:
                OrderEventActorType.CUSTOMER,
              agentId: identity.agentId,
              idempotencyKey:
                `quote-decision:${inspection.id}`,
              metadata: {
                inspectionId: inspection.id,
                quoteHash: inspection.quoteHash,
                decision,
                challengeId: challenge.id,
                channel: challenge.channel,
                destinationMasked:
                  challenge.destinationMasked,
                quoteFinalPrice:
                  inspection.quoteFinalPrice.toString(),
              },
            },
            tx,
          );

          return {
            alreadyDecided: false,
            inspection: {
              ...inspection,
              quoteDecision: decision,
              quoteDecisionAt: now,
              quoteDecisionChallengeId:
                challenge.id,
            },
          };
        },
      );

    return {
      decided: true,
      alreadyDecided:
        result.alreadyDecided,
      orderNumber:
        order.orderNumber,
      orderStatus:
        order.status,
      decision:
        result.inspection.quoteDecision,
      decisionAt:
        result.inspection.quoteDecisionAt,
      inspectionId:
        result.inspection.id,
      quote: {
        finalPrice:
          Number(
            result.inspection.quoteFinalPrice,
          ),
        quoteHash:
          result.inspection.quoteHash,
        generatedAt:
          result.inspection.quoteGeneratedAt,
      },
      nextStep:
        result.inspection.quoteDecision ===
        AgentQuoteDecision.ACCEPTED
          ? 'PAYMENT'
          : 'REJECTED',
    };
  }

   async startInspection(
  identity: AgentIdentity,
  orderNumber: string,
  challengeId: string,
) {
  const order =
    await this.getOwnedOrder(
      identity,
      orderNumber,
    );

  const validStartedStatuses = [
    'PICKUP_STARTED',
    'INSPECTION_COMPLETED',
    'PAYMENT_COMPLETED',
    'COMPLETED',
  ];

  const result =
    await this.prisma.$transaction(
      async (tx) => {
        const challenge =
          await tx.orderVerificationChallenge.findFirst({
            where: {
              id:
                challengeId,

              orderId:
                order.id,

              purpose:
                OrderVerificationPurpose.INSPECTION_START,
            },

            select: {
              id: true,
              status: true,
              purpose: true,
              channel: true,
              destinationMasked: true,
              expiresAt: true,
              verifiedAt: true,
              consumedAt: true,
            },
          });

        if (!challenge) {
          throw new NotFoundException(
            'Inspection verification challenge not found.',
          );
        }

        /*
         * Canonical idempotency check.
         *
         * A consumed OTP by itself is NOT enough.
         * Inspection is considered started only if:
         *
         * 1. lifecycle has reached inspection,
         * 2. AgentOrderInspection exists,
         * 3. INSPECTION_STARTED event exists.
         */
        const resolveAlreadyStarted =
          async () => {
            const [
              currentOrder,
              existingInspection,
              existingEvent,
            ] =
              await Promise.all([
                tx.sellOrder.findUnique({
                  where: {
                    id:
                      order.id,
                  },

                  select: {
                    status:
                      true,
                  },
                }),

                tx.agentOrderInspection.findUnique({
                  where: {
                    orderId:
                      order.id,
                  },

                  select: {
                    id: true,
                    agentId: true,
                    vendorId: true,
                    status: true,
                    startedAt: true,
                  },
                }),

                tx.orderEvent.findUnique({
                  where: {
                    idempotencyKey:
                      `inspection-started:${order.id}`,
                  },

                  select: {
                    id: true,
                    createdAt: true,
                  },
                }),
              ]);

            if (
              !currentOrder ||
              !validStartedStatuses.includes(
                currentOrder.status,
              ) ||
              !existingInspection ||
              !existingEvent
            ) {
              return null;
            }

            /*
             * Do not allow another Agent/Vendor to
             * resume an inspection created by a
             * different owner.
             */
            if (
              existingInspection.agentId !==
                identity.agentId ||
              existingInspection.vendorId !==
                identity.vendorId
            ) {
              throw new ConflictException(
                'Inspection belongs to another agent assignment.',
              );
            }

            return {
              currentOrder,
              existingInspection,
              existingEvent,
            };
          };

        /*
         * Safe retry after the original request
         * already completed successfully.
         */
        if (
          challenge.status ===
          OrderVerificationStatus.CONSUMED
        ) {
          const existing =
            await resolveAlreadyStarted();

          if (!existing) {
            throw new ConflictException(
              'Inspection state is inconsistent. Please contact support.',
            );
          }

          return {
            alreadyStarted:
              true,

            challenge,

            status:
              existing.currentOrder.status,

            startedAt:
              existing.existingEvent.createdAt,

            inspectionId:
              existing.existingInspection.id,
          };
        }

        if (
          challenge.status !==
          OrderVerificationStatus.VERIFIED
        ) {
          throw new UnauthorizedException(
            'Verify the customer OTP before starting inspection.',
          );
        }

        const now =
          new Date();

        if (
          challenge.expiresAt.getTime() <=
          now.getTime()
        ) {
          throw new UnauthorizedException(
            'OTP verification has expired. Request a new OTP.',
          );
        }

        /*
         * Re-read lifecycle inside the transaction.
         *
         * The order returned by getOwnedOrder()
         * happened before the transaction and must
         * not be trusted for the mutation.
         */
        const currentOrder =
          await tx.sellOrder.findUnique({
            where: {
              id:
                order.id,
            },

            select: {
              status:
                true,
            },
          });

        if (!currentOrder) {
          throw new NotFoundException(
            'Order not found.',
          );
        }

        if (
          ![
            'PICKUP_REQUESTED',
            'PICKUP_CONFIRMED',
            'PICKUP_STARTED',
          ].includes(
            currentOrder.status,
          )
        ) {
          throw new ConflictException(
            'Inspection cannot be started for the current order status.',
          );
        }

        /*
         * Exactly one concurrent request can consume
         * VERIFIED -> CONSUMED.
         */
        const consumed =
          await tx.orderVerificationChallenge.updateMany({
            where: {
              id:
                challenge.id,

              orderId:
                order.id,

              purpose:
                OrderVerificationPurpose.INSPECTION_START,

              status:
                OrderVerificationStatus.VERIFIED,

              expiresAt: {
                gt:
                  now,
              },
            },

            data: {
              status:
                OrderVerificationStatus.CONSUMED,

              consumedAt:
                now,
            },
          });

        /*
         * Another concurrent request may have
         * consumed the challenge first.
         *
         * Accept it only when the complete canonical
         * inspection state exists.
         */
        if (
          consumed.count !==
          1
        ) {
          const currentChallenge =
            await tx.orderVerificationChallenge.findUnique({
              where: {
                id:
                  challenge.id,
              },

              select: {
                id: true,
                status: true,
                purpose: true,
                channel: true,
                destinationMasked: true,
                expiresAt: true,
                verifiedAt: true,
                consumedAt: true,
              },
            });

          if (
            currentChallenge?.status ===
            OrderVerificationStatus.CONSUMED
          ) {
            const existing =
              await resolveAlreadyStarted();

            if (existing) {
              return {
                alreadyStarted:
                  true,

                challenge:
                  currentChallenge,

                status:
                  existing.currentOrder.status,

                startedAt:
                  existing.existingEvent.createdAt,

                inspectionId:
                  existing.existingInspection.id,
              };
            }

            /*
             * If the competing transaction is still
             * completing, do not manufacture success.
             */
            throw new ConflictException(
              'Inspection is already being started. Please retry.',
            );
          }

          throw new ConflictException(
            'Inspection verification is no longer valid.',
          );
        }

        /*
         * PICKUP_REQUESTED / PICKUP_CONFIRMED
         *            ↓
         *       PICKUP_STARTED
         *
         * Conditional update prevents us from
         * overwriting a concurrent lifecycle change.
         */
        const orderTransition =
          await tx.sellOrder.updateMany({
            where: {
              id:
                order.id,

              status: {
                in: [
                  'PICKUP_REQUESTED',
                  'PICKUP_CONFIRMED',
                ],
              },
            },

            data: {
              status:
                'PICKUP_STARTED',
            },
          });

        if (
          orderTransition.count ===
          1
        ) {
          await tx.orderStatusHistory.create({
            data: {
              orderId:
                order.id,

              status:
                'PICKUP_STARTED',

              note:
                'Inspection started after customer OTP verification.',
            },
          });
        } else {
          /*
           * PICKUP_STARTED is allowed because a
           * previous/legacy flow may already have
           * transitioned the order but not created
           * the inspection runtime state.
           */
          const lifecycle =
            await tx.sellOrder.findUnique({
              where: {
                id:
                  order.id,
              },

              select: {
                status:
                  true,
              },
            });

          if (
            lifecycle?.status !==
            'PICKUP_STARTED'
          ) {
            throw new ConflictException(
              'Order status changed before inspection could start.',
            );
          }
        }

        /*
         * One inspection per SellOrder.
         *
         * We do not accept agent/vendor/product
         * information from the frontend.
         */
        let inspection =
          await tx.agentOrderInspection.findUnique({
            where: {
              orderId:
                order.id,
            },

            select: {
              id: true,
              agentId: true,
              vendorId: true,
              status: true,
              startedAt: true,
            },
          });

        if (!inspection) {
          inspection =
            await tx.agentOrderInspection.create({
              data: {
                orderId:
                  order.id,

                agentId:
                  identity.agentId,

                vendorId:
                  identity.vendorId,

                productId:
                  order.productId,

                variantId:
                  order.variantId,

                /*
                 * Agent answers begin empty.
                 * Customer questionnaireSnapshot is
                 * intentionally NOT copied here.
                 */
                answers:
                  [],
              },

              select: {
                id: true,
                agentId: true,
                vendorId: true,
                status: true,
                startedAt: true,
              },
            });
        } else if (
          inspection.agentId !==
            identity.agentId ||
          inspection.vendorId !==
            identity.vendorId
        ) {
          throw new ConflictException(
            'Inspection belongs to another agent assignment.',
          );
        }

        /*
         * Lifecycle event lives in the SAME DB
         * transaction as:
         *
         * VERIFIED -> CONSUMED
         * SellOrder -> PICKUP_STARTED
         * OrderStatusHistory
         * AgentOrderInspection
         */
        const inspectionEvent =
          await this.orderEvents.record(
            {
              orderId:
                order.id,

              eventType:
                OrderEventType.INSPECTION_STARTED,

              actorType:
                OrderEventActorType.AGENT,

              agentId:
                identity.agentId,

              idempotencyKey:
                `inspection-started:${order.id}`,

              metadata: {
                challengeId:
                  challenge.id,

                channel:
                  challenge.channel,

                destinationMasked:
                  challenge.destinationMasked,

                inspectionId:
                  inspection.id,
              },
            },
            tx,
          );

        return {
          alreadyStarted:
            false,

          challenge: {
            ...challenge,

            status:
              OrderVerificationStatus.CONSUMED,

            consumedAt:
              now,
          },

          status:
            'PICKUP_STARTED' as const,

          startedAt:
            inspectionEvent.createdAt,

          inspectionId:
            inspection.id,
        };
      },
    );

  return {
    started:
      true,

    alreadyStarted:
      result.alreadyStarted,

    orderNumber:
      order.orderNumber,

    status:
      result.status,

    inspection: {
      id:
        result.inspectionId,

      started:
        true,

      challengeId:
        result.challenge.id,

      verificationPurpose:
        result.challenge.purpose,

      verificationChannel:
        result.challenge.channel,

      verifiedAt:
        result.challenge.verifiedAt,

      startedAt:
        result.startedAt,
    },

    evidence: {
      enabled:
        process.env
          .AGENT_INSPECTION_EVIDENCE_ENABLED ===
        'true',
    },
  };
}
}