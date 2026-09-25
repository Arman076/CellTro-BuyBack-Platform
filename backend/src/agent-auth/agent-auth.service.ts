import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma/prisma.service.js';
import { VendorEmailService } from '../vendor-security/vendor-email.service.js';

import {
  SendAgentEmailOtpDto,
  VerifyAgentEmailOtpDto,
} from './dto/agent-email-otp.dto.js';

import { AgentRegistrationDto } from './dto/agent-registration.dto.js';
import { AgentLoginDto } from './dto/agent-login.dto.js';


const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,72}$/;

@Injectable()
export class AgentAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: VendorEmailService,
  ) {}

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizeMobile(value: string): string {
    return value.replace(/\D/g, '').slice(-10);
  }

  private normalizeAadhaar(value: string): string {
    return value.replace(/\D/g, '');
  }

  private normalizeVendorCode(value: string): string {
    return value.trim().toUpperCase();
  }

  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  private hashOtp(
    challengeId: string,
    email: string,
    otp: string,
  ): string {
    const secret =
      process.env.VENDOR_OTP_HMAC_SECRET;

    if (!secret) {
      throw new Error(
        'VENDOR_OTP_HMAC_SECRET is not configured',
      );
    }

    return createHmac('sha256', secret)
      .update(
        `AGENT_SIGNUP:${challengeId}:${email}:${otp}`,
      )
      .digest('hex');
  }

  private hashesEqual(
    first: string,
    second: string,
  ): boolean {
    const firstBuffer =
      Buffer.from(first, 'utf8');

    const secondBuffer =
      Buffer.from(second, 'utf8');

    if (
      firstBuffer.length !==
      secondBuffer.length
    ) {
      return false;
    }

    return timingSafeEqual(
      firstBuffer,
      secondBuffer,
    );
  }

//   getCookieName(): string {
//   return (
//     process.env.AGENT_SESSION_COOKIE_NAME ??
//     'celltro_agent_session'
//   );
// }

// getCookieMaxAge(): number {
//   return (
//     Number(
//       process.env.AGENT_SESSION_HOURS ??
//         8,
//     ) *
//     60 *
//     60 *
//     1000
//   );
// }

// async login(
//   dto: AgentLoginDto,
// ) {
//   const identifier =
//     dto.identifier.trim();

//   const isEmail =
//     identifier.includes('@');

//   const normalizedIdentifier =
//     isEmail
//       ? this.normalizeEmail(identifier)
//       : this.normalizeMobile(identifier);

//   const agent =
//     isEmail
//       ? await this.prisma.agent.findUnique({
//           where: {
//             normalizedEmail:
//               normalizedIdentifier,
//           },
//           select: {
//             id: true,
//             agentCode: true,
//             fullName: true,
//             email: true,
//             mobile: true,
//             passwordHash: true,
//             status: true,

//             vendor: {
//               select: {
//                 id: true,
//                 vendorCode: true,
//                 businessName: true,
//                 status: true,
//               },
//             },
//           },
//         })
//       : await this.prisma.agent.findUnique({
//           where: {
//             normalizedMobile:
//               normalizedIdentifier,
//           },
//           select: {
//             id: true,
//             agentCode: true,
//             fullName: true,
//             email: true,
//             mobile: true,
//             passwordHash: true,
//             status: true,

//             vendor: {
//               select: {
//                 id: true,
//                 vendorCode: true,
//                 businessName: true,
//                 status: true,
//               },
//             },
//           },
//         });

//   /*
//    * Keep invalid credentials generic.
//    * Do not disclose whether an account exists.
//    */
//   if (!agent) {
//     throw new UnauthorizedException(
//       'Invalid login credentials',
//     );
//   }

//   let passwordMatches = false;

//   try {
//     passwordMatches =
//       await argon2.verify(
//         agent.passwordHash,
//         dto.password,
//       );
//   } catch {
//     passwordMatches = false;
//   }

//   if (!passwordMatches) {
//     throw new UnauthorizedException(
//       'Invalid login credentials',
//     );
//   }

//   /*
//    * Agent cannot login until
//    * respective Vendor approves them.
//    */
//   if (
//     agent.status ===
//     'PENDING_APPROVAL'
//   ) {
//     throw new UnauthorizedException(
//       'Your registration is awaiting vendor approval',
//     );
//   }

//   if (
//     agent.status ===
//     'REJECTED'
//   ) {
//     throw new UnauthorizedException(
//       'Your agent registration was not approved',
//     );
//   }

//   if (
//     agent.status !== 'ACTIVE'
//   ) {
//     throw new UnauthorizedException(
//       'Your agent account is not active',
//     );
//   }

//   if (
//     agent.vendor.status !==
//     'ACTIVE'
//   ) {
//     throw new UnauthorizedException(
//       'Your vendor account is not active',
//     );
//   }

//   const sessionToken =
//     randomBytes(32).toString(
//       'base64url',
//     );

//   const tokenHash =
//     this.hashToken(
//       sessionToken,
//     );

//   const expiresAt =
//     new Date(
//       Date.now() +
//         this.getCookieMaxAge(),
//     );

//   await this.prisma.agentSession.create({
//     data: {
//       agentId:
//         agent.id,

//       tokenHash,

//       expiresAt,
//     },
//   });

//   return {
//     sessionToken,

//     agent: {
//       id:
//         agent.id,

//       agentCode:
//         agent.agentCode,

//       fullName:
//         agent.fullName,

//       email:
//         agent.email,

//       mobile:
//         agent.mobile,

//       vendor: {
//         vendorCode:
//           agent.vendor.vendorCode,

//         businessName:
//           agent.vendor.businessName,
//       },
//     },
//   };
// }

getCookieName(): string {
  return (
    process.env.AGENT_SESSION_COOKIE_NAME ??
    'celltro_agent_session'
  );
}

getCookieMaxAge(): number {
  const hours = Number(
    process.env.AGENT_SESSION_HOURS ?? 8,
  );

  return hours * 60 * 60 * 1000;
}

async login(
  dto: AgentLoginDto,
) {
  const identifier =
    dto.identifier.trim();

  const isEmail =
    identifier.includes('@');

  const normalizedIdentifier =
    isEmail
      ? this.normalizeEmail(
          identifier,
        )
      : this.normalizeMobile(
          identifier,
        );

  const agent = isEmail
    ? await this.prisma.agent.findUnique({
        where: {
          normalizedEmail:
            normalizedIdentifier,
        },

        select: {
          id: true,
          agentCode: true,
          fullName: true,
          email: true,
          mobile: true,
          passwordHash: true,
          status: true,
          vendorId: true,

          vendor: {
            select: {
              id: true,
              vendorCode: true,
              businessName: true,
              status: true,
            },
          },
        },
      })
    : await this.prisma.agent.findUnique({
        where: {
          normalizedMobile:
            normalizedIdentifier,
        },

        select: {
          id: true,
          agentCode: true,
          fullName: true,
          email: true,
          mobile: true,
          passwordHash: true,
          status: true,
          vendorId: true,

          vendor: {
            select: {
              id: true,
              vendorCode: true,
              businessName: true,
              status: true,
            },
          },
        },
      });

  /*
   * Generic error intentionally avoids
   * disclosing whether the Agent exists.
   */
  if (!agent) {
    throw new UnauthorizedException(
      'Invalid login credentials',
    );
  }

  let passwordMatches = false;

  try {
    passwordMatches =
      await argon2.verify(
        agent.passwordHash,
        dto.password,
      );
  } catch {
    passwordMatches = false;
  }

  if (!passwordMatches) {
    throw new UnauthorizedException(
      'Invalid login credentials',
    );
  }

  if (
    agent.status ===
    'PENDING_APPROVAL'
  ) {
    throw new UnauthorizedException(
      'Your registration is awaiting vendor approval',
    );
  }

  if (
    agent.status === 'REJECTED'
  ) {
    throw new UnauthorizedException(
      'Your agent registration was not approved',
    );
  }

  if (
    agent.status !== 'ACTIVE'
  ) {
    throw new UnauthorizedException(
      'Your agent account is not active',
    );
  }

  if (
    agent.vendor.status !==
    'ACTIVE'
  ) {
    throw new UnauthorizedException(
      'Your vendor account is not active',
    );
  }

  const sessionToken =
    randomBytes(32).toString(
      'base64url',
    );

  const tokenHash =
    this.hashToken(
      sessionToken,
    );

  const expiresAt =
    new Date(
      Date.now() +
        this.getCookieMaxAge(),
    );

  await this.prisma.agentSession.create({
    data: {
      agentId:
        agent.id,

      tokenHash,

      expiresAt,

      lastSeenAt:
        new Date(),
    },
  });

  return {
    sessionToken,

    agent: {
      id:
        agent.id,

      agentCode:
        agent.agentCode,

      fullName:
        agent.fullName,

      email:
        agent.email,

      mobile:
        agent.mobile,

      vendor: {
        vendorCode:
          agent.vendor.vendorCode,

        businessName:
          agent.vendor.businessName,
      },
    },
  };
}

private sessionIdleMinutes(): number {
  return Number(
    process.env.AGENT_SESSION_IDLE_MINUTES ?? 30,
  );
}

async getSession(rawToken?: string) {
  if (!rawToken) {
    throw new UnauthorizedException(
      'Authentication required',
    );
  }

  const tokenHash =
    this.hashToken(rawToken);

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
            fullName: true,
            email: true,
            mobile: true,
            status: true,
            vendorId: true,

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
    session.revokedAt ||
    session.expiresAt <= new Date()
  ) {
    throw new UnauthorizedException(
      'Session expired',
    );
  }

  const idleLimit =
    this.sessionIdleMinutes() *
    60 *
    1000;

  if (
    Date.now() -
      session.lastSeenAt.getTime() >
    idleLimit
  ) {
    await this.prisma.agentSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

    throw new UnauthorizedException(
      'Session expired',
    );
  }

  if (
    session.agent.status !== 'ACTIVE' ||
    session.agent.vendor.status !== 'ACTIVE'
  ) {
    await this.prisma.agentSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

    throw new UnauthorizedException(
      'Agent account is unavailable',
    );
  }

  /*
   * Avoid DB write on every API request.
   * Update lastSeenAt maximum once per 5 minutes.
   */
  const fiveMinutes =
    5 * 60 * 1000;

  if (
    Date.now() -
      session.lastSeenAt.getTime() >
    fiveMinutes
  ) {
    await this.prisma.agentSession.update({
      where: {
        id: session.id,
      },

      data: {
        lastSeenAt: new Date(),
      },
    });
  }

  return {
    sessionId: session.id,

    agentId:
      session.agent.id,

    vendorId:
      session.agent.vendorId,

    agent: {
      agentCode:
        session.agent.agentCode,

      fullName:
        session.agent.fullName,

      email:
        session.agent.email,

      mobile:
        session.agent.mobile,

      status:
        session.agent.status,
    },

    vendor: {
      vendorCode:
        session.agent.vendor.vendorCode,

      businessName:
        session.agent.vendor.businessName,
    },
  };
}

async logout(
  rawToken?: string,
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

  private validatePassword(
    password: string,
  ): void {
    if (!PASSWORD_REGEX.test(password)) {
      throw new BadRequestException(
        'Password must be 10-72 characters and include uppercase, lowercase, number and special character.',
      );
    }
  }

  private generateAgentCode(): string {
    return `AGT-${randomUUID()
      .replaceAll('-', '')
      .slice(0, 10)
      .toUpperCase()}`;
  }

  async sendEmailOtp(
    dto: SendAgentEmailOtpDto,
  ) {
    const email =
      this.normalizeEmail(dto.email);

    /*
     * Do not send OTP if this email
     * already belongs to an Agent.
     */
    const existingAgent =
      await this.prisma.agent.findUnique({
        where: {
          normalizedEmail: email,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (existingAgent) {
      throw new ConflictException(
        'An agent account already exists for this email address',
      );
    }

    /*
     * Resend throttling.
     */
    const latestOtp =
      await this.prisma.agentEmailOtp.findFirst({
        where: {
          emailNormalized: email,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
      });

    if (latestOtp) {
      const nextAllowedAt =
        latestOtp.createdAt.getTime() +
        OTP_RESEND_SECONDS * 1000;

      if (Date.now() < nextAllowedAt) {
        const remainingSeconds =
          Math.ceil(
            (nextAllowedAt - Date.now()) /
              1000,
          );

        throw new HttpException(
          `Please wait ${remainingSeconds} seconds before requesting another code`,
          429,
        );
      }
    }

    const challengeId =
      randomUUID();

    const otp =
      randomInt(
        100000,
        1000000,
      ).toString();

    const otpHash =
      this.hashOtp(
        challengeId,
        email,
        otp,
      );

    const expiresAt =
      new Date(
        Date.now() +
          OTP_EXPIRY_MINUTES *
            60 *
            1000,
      );

    await this.prisma.agentEmailOtp.create({
      data: {
        id: challengeId,
        emailNormalized: email,
        otpHash,
        expiresAt,
        purpose: 'SIGNUP',
      },
    });

    try {
      /*
       * For now reuse existing SMTP infrastructure.
       * We will make the email copy Agent-specific next.
       */
      await this.emailService.sendAgentSignupOtp(
  email,
  otp,
);
    } catch (error) {
      await this.prisma.agentEmailOtp
        .delete({
          where: {
            id: challengeId,
          },
        })
        .catch(() => undefined);

      throw error;
    }

    return {
      challengeId,
      expiresInSeconds:
        OTP_EXPIRY_MINUTES * 60,
      resendAfterSeconds:
        OTP_RESEND_SECONDS,
    };
  }

  async verifyEmailOtp(
    dto: VerifyAgentEmailOtpDto,
  ) {
    const email =
      this.normalizeEmail(dto.email);

    const challenge =
      await this.prisma.agentEmailOtp.findUnique({
        where: {
          id: dto.challengeId,
        },
        select: {
          id: true,
          emailNormalized: true,
          otpHash: true,
          expiresAt: true,
          verifiedAt: true,
          consumedAt: true,
          attempts: true,
          purpose: true,
        },
      });

    if (
      !challenge ||
      challenge.emailNormalized !== email ||
      challenge.purpose !== 'SIGNUP'
    ) {
      throw new BadRequestException(
        'Invalid or expired verification code',
      );
    }

    if (
      challenge.verifiedAt ||
      challenge.consumedAt
    ) {
      throw new BadRequestException(
        'Verification code has already been used',
      );
    }

    if (
      challenge.expiresAt.getTime() <
      Date.now()
    ) {
      throw new BadRequestException(
        'Verification code has expired',
      );
    }

    if (
      challenge.attempts >=
      OTP_MAX_ATTEMPTS
    ) {
      throw new HttpException(
        'Maximum verification attempts exceeded',
        429,
      );
    }

    const submittedHash =
      this.hashOtp(
        challenge.id,
        email,
        dto.otp,
      );

    if (
      !this.hashesEqual(
        submittedHash,
        challenge.otpHash,
      )
    ) {
      await this.prisma.agentEmailOtp.update({
        where: {
          id: challenge.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException(
        'Invalid or expired verification code',
      );
    }

    const verificationToken =
      randomUUID() +
      randomUUID();

    const verificationTokenHash =
      this.hashToken(
        verificationToken,
      );

    await this.prisma.agentEmailOtp.update({
      where: {
        id: challenge.id,
      },
      data: {
        verifiedAt: new Date(),
        verificationTokenHash,
      },
    });

    return {
      verified: true,
      verificationToken,
    };
  }

  async register(
    dto: AgentRegistrationDto,
  ) {
    const fullName =
      dto.fullName.trim();

    const email =
      this.normalizeEmail(dto.email);

    const mobile =
      this.normalizeMobile(dto.mobile);

    const aadhaarNumber =
      this.normalizeAadhaar(
        dto.aadhaarNumber,
      );

    const address =
      dto.address.trim();

    const vendorCode =
      this.normalizeVendorCode(
        dto.vendorCode,
      );

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      throw new BadRequestException(
        'Invalid mobile number',
      );
    }

    if (
      !/^\d{12}$/.test(
        aadhaarNumber,
      )
    ) {
      throw new BadRequestException(
        'Invalid Aadhaar number',
      );
    }

    this.validatePassword(
      dto.password,
    );

    /*
     * Vendor + duplicate identities are fetched
     * concurrently. No sequential DB round trips.
     */
    const [
      vendor,
      duplicateAgent,
      verification,
    ] = await Promise.all([
      this.prisma.vendor.findUnique({
        where: {
          vendorCode,
        },
        select: {
          id: true,
          vendorCode: true,
          businessName: true,
          status: true,
        },
      }),

      this.prisma.agent.findFirst({
        where: {
          OR: [
            {
              normalizedEmail:
                email,
            },
            {
              normalizedMobile:
                mobile,
            },
            {
              aadhaarNumber,
            },
          ],
        },
        select: {
          id: true,
          normalizedEmail: true,
          normalizedMobile: true,
          aadhaarNumber: true,
        },
      }),

      this.prisma.agentEmailOtp.findFirst({
        where: {
          emailNormalized:
            email,
          verificationTokenHash:
            this.hashToken(
              dto.verificationToken,
            ),
          purpose: 'SIGNUP',
          verifiedAt: {
            not: null,
          },
          consumedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (
      !vendor ||
      vendor.status !== 'ACTIVE'
    ) {
      throw new NotFoundException(
        'Invalid or inactive Vendor ID',
      );
    }

    if (!verification) {
      throw new BadRequestException(
        'Email verification is invalid or expired',
      );
    }

    if (duplicateAgent) {
      if (
        duplicateAgent.normalizedEmail ===
        email
      ) {
        throw new ConflictException(
          'An agent account already exists for this email address',
        );
      }

      if (
        duplicateAgent.normalizedMobile ===
        mobile
      ) {
        throw new ConflictException(
          'An agent account already exists for this mobile number',
        );
      }

      throw new ConflictException(
        'An agent account already exists for this Aadhaar number',
      );
    }

    const passwordHash =
      await argon2.hash(
        dto.password,
        {
          type:
            argon2.argon2id,
        },
      );

    /*
     * Transaction guarantees:
     *
     * 1. Agent creation
     * 2. OTP verification consumption
     *
     * happen together.
     */
    const agent =
      await this.prisma.$transaction(
        async (tx) => {
          const createdAgent =
            await tx.agent.create({
              data: {
                agentCode:
                  this.generateAgentCode(),

                vendorId:
                  vendor.id,

                fullName,

                mobile,
                normalizedMobile:
                  mobile,

                email:
                  dto.email.trim(),

                normalizedEmail:
                  email,

                aadhaarNumber,

                address,

                passwordHash,

                emailVerifiedAt:
                  new Date(),

                status:
                  'PENDING_APPROVAL',
              },
              select: {
                id: true,
                agentCode: true,
                fullName: true,
                email: true,
                mobile: true,
                status: true,
                createdAt: true,
              },
            });

          const consumed =
            await tx.agentEmailOtp.updateMany({
              where: {
                id:
                  verification.id,

                consumedAt:
                  null,
              },
              data: {
                consumedAt:
                  new Date(),
              },
            });

          if (
            consumed.count !== 1
          ) {
            throw new ConflictException(
              'Email verification has already been used',
            );
          }

          return createdAgent;
        },
      );

    return {
      registered: true,

      message:
        'Registration submitted successfully. Your account will be activated after vendor approval.',

      agent,

      vendor: {
        vendorCode:
          vendor.vendorCode,
        businessName:
          vendor.businessName,
      },
    };
  }
}