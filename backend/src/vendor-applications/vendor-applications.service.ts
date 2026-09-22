import {
  BadRequestException,
  ConflictException,
  Injectable,
  HttpException,
//   TooManyRequestsException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma/prisma.service.js';
import { VendorCryptoService } from '../vendor-security/vendor-crypto.service.js';
import { VendorEmailService } from '../vendor-security/vendor-email.service.js';

import { CreateVendorApplicationDto } from './dto/create-vendor-application.dto.js';
import { SendEmailOtpDto } from './dto/send-email-otp.dto.js';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto.js';

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class VendorApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: VendorCryptoService,
    private readonly emailService: VendorEmailService,
  ) {}

  async sendEmailOtp(dto: SendEmailOtpDto) {
    const email =
      this.crypto.normalizeEmail(dto.email);

    const existingApplication =
      await this.prisma.vendorApplication.findFirst({
        where: {
          normalizedEmail: email,
          status: {
            in: [
              'PENDING',
              'UNDER_REVIEW',
              'APPROVED',
            ],
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (existingApplication) {
      throw new ConflictException(
        'An application already exists for this email address',
      );
    }

    const latestOtp =
      await this.prisma.vendorEmailOtp.findFirst({
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
        const remainingSeconds = Math.ceil(
          (nextAllowedAt - Date.now()) /
            1000,
        );

        throw new HttpException(
          `Please wait ${remainingSeconds} seconds before requesting another code`,
          429,      
        );
      }
    }

    const challengeId = randomUUID();

    const otp =
      this.crypto.generateOtp();

    const otpHash =
      this.crypto.hashOtp(
        challengeId,
        email,
        otp,
      );

    const expiresAt = new Date(
      Date.now() +
        OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    const challenge =
  await this.prisma.vendorEmailOtp.create({
    data: {
      id: challengeId,
      emailNormalized: email,
      otpHash,
      expiresAt,
    },
    select: {
      id: true,
    },
  });

try {
  await this.emailService.sendSignupOtp(
    email,
    otp,
  );
} catch (error) {
  await this.prisma.vendorEmailOtp
    .delete({
      where: {
        id: challenge.id,
      },
    })
    .catch(() => undefined);

  throw error;
}

return {
  challengeId: challenge.id,
  expiresInSeconds:
    OTP_EXPIRY_MINUTES * 60,
  resendAfterSeconds:
    OTP_RESEND_SECONDS,
};
}

  async verifyEmailOtp(
    dto: VerifyEmailOtpDto,
  ) {
    const email =
      this.crypto.normalizeEmail(dto.email);

    const challenge =
      await this.prisma.vendorEmailOtp.findUnique({
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
        },
      });

    if (
      !challenge ||
      challenge.emailNormalized !== email
    ) {
      throw new BadRequestException(
        'Invalid or expired verification code',
      );
    }

    if (
      challenge.consumedAt ||
      challenge.verifiedAt
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
        429
      );
    }

    const submittedHash =
      this.crypto.hashOtp(
        challenge.id,
        email,
        dto.otp,
      );

    if (
      submittedHash !==
      challenge.otpHash
    ) {
      await this.prisma.vendorEmailOtp.update({
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
      this.crypto.generateVerificationToken();

    const verificationTokenHash =
      this.crypto.hashToken(
        verificationToken,
      );

    await this.prisma.vendorEmailOtp.update({
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

  async createApplication(
    dto: CreateVendorApplicationDto,
  ) {
    const email =
      this.crypto.normalizeEmail(dto.email);

    const mobile =
      this.crypto.normalizeMobile(dto.mobile);

    const aadhaar =
      this.crypto.normalizeAadhaar(
        dto.aadhaar,
      );

    const pan = dto.pan
      ? this.crypto.normalizePan(dto.pan)
      : null;

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      throw new BadRequestException(
        'Invalid mobile number',
      );
    }

    if (!/^\d{12}$/.test(aadhaar)) {
      throw new BadRequestException(
        'Invalid Aadhaar number',
      );
    }

    const tokenHash =
      this.crypto.hashToken(
        dto.verificationToken,
      );

    return this.prisma.$transaction(
      async (tx) => {
        const challenge =
          await tx.vendorEmailOtp.findUnique({
            where: {
              id: dto.challengeId,
            },
            select: {
              id: true,
              emailNormalized: true,
              verifiedAt: true,
              verificationTokenHash: true,
              consumedAt: true,
              expiresAt: true,
            },
          });

        if (
          !challenge ||
          challenge.emailNormalized !== email ||
          !challenge.verifiedAt ||
          challenge.consumedAt ||
          !challenge.verificationTokenHash ||
          challenge.verificationTokenHash !==
            tokenHash
        ) {
          throw new BadRequestException(
            'Email verification is invalid or has already been used',
          );
        }

        /*
         * The OTP challenge expires after 10 minutes.
         * Submission must also happen within that
         * verification window.
         */
        if (
          challenge.expiresAt.getTime() <
          Date.now()
        ) {
          throw new BadRequestException(
            'Email verification has expired',
          );
        }

        const existing =
          await tx.vendorApplication.findFirst({
            where: {
              OR: [
                {
                  normalizedEmail: email,
                },
                {
                  normalizedMobile: mobile,
                },
              ],
              status: {
                in: [
                  'PENDING',
                  'UNDER_REVIEW',
                  'APPROVED',
                ],
              },
            },
            select: {
              id: true,
            },
          });

        if (existing) {
          throw new ConflictException(
            'An active application already exists with these details',
          );
        }

        const aadhaarFingerprint =
          this.crypto.fingerprint(
            'AADHAAR',
            aadhaar,
          );

        const panFingerprint = pan
          ? this.crypto.fingerprint(
              'PAN',
              pan,
            )
          : null;

        const existingIdentity =
          await tx.vendorApplication.findFirst({
            where: {
              status: {
                in: [
                  'PENDING',
                  'UNDER_REVIEW',
                  'APPROVED',
                ],
              },
              OR: [
                {
                  aadhaarFingerprint,
                },
                ...(panFingerprint
                  ? [
                      {
                        panFingerprint,
                      },
                    ]
                  : []),
              ],
            },
            select: {
              id: true,
            },
          });

        if (existingIdentity) {
          throw new ConflictException(
            'An active application already exists with these identity details',
          );
        }

        const application =
          await tx.vendorApplication.create({
            data: {
              businessName:
                dto.businessName.trim(),
              contactName:
                dto.contactName.trim(),

              email: dto.email.trim(),
              normalizedEmail: email,

              mobile,
              normalizedMobile: mobile,

              emailVerifiedAt:
                challenge.verifiedAt,

              panEncrypted: pan
                ? this.crypto.encryptSensitive(
                    pan,
                  )
                : null,

              panFingerprint,
              panLast4: pan
                ? pan.slice(-4)
                : null,

              aadhaarEncrypted:
                this.crypto.encryptSensitive(
                  aadhaar,
                ),

              aadhaarFingerprint,
              aadhaarLast4:
                aadhaar.slice(-4),

              status: 'PENDING',
            },
            select: {
              id: true,
              businessName: true,
              status: true,
              submittedAt: true,
            },
          });

        await tx.vendorEmailOtp.update({
          where: {
            id: challenge.id,
          },
          data: {
            consumedAt: new Date(),
          },
        });

        return {
          applicationId:
            application.id,
          businessName:
            application.businessName,
          status:
            application.status,
          submittedAt:
            application.submittedAt,
        };
      },
    );
  }
}