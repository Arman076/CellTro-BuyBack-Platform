import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'crypto';

import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma/prisma.service.js';
import { VendorEmailService } from '../vendor-security/vendor-email.service.js';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,72}$/;

const RESET_OTP_ATTEMPTS = 5;

@Injectable()
export class VendorAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: VendorEmailService,
  ) {}

  // ============================================================
  // NORMALIZATION
  // ============================================================

  private normalizeEmail(
    value: string,
  ): string {
    return value
      .trim()
      .toLowerCase();
  }

  private normalizeMobile(
    value: string,
  ): string {
    return value
      .replace(/\D/g, '')
      .slice(-10);
  }

  // ============================================================
  // HASHING
  // ============================================================

  private hashToken(
    token: string,
  ): string {
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
      process.env
        .VENDOR_OTP_HMAC_SECRET;

    if (!secret) {
      throw new Error(
        'VENDOR_OTP_HMAC_SECRET is not configured',
      );
    }

    return createHmac(
      'sha256',
      secret,
    )
      .update(
        `PASSWORD_RESET:${challengeId}:${email}:${otp}`,
      )
      .digest('hex');
  }

  private safeHashEquals(
    first: string,
    second: string,
  ): boolean {
    const firstBuffer =
      Buffer.from(
        first,
        'utf8',
      );

    const secondBuffer =
      Buffer.from(
        second,
        'utf8',
      );

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

  // ============================================================
  // PASSWORD HELPERS
  // ============================================================

  private validatePassword(
    password: string,
  ): void {
    if (
      !PASSWORD_REGEX.test(
        password,
      )
    ) {
      throw new BadRequestException(
        'Password must be 10-72 characters and include uppercase, lowercase, number and special character.',
      );
    }
  }

  /**
   * Prevents malformed / legacy values from being passed
   * directly to argon2.verify().
   *
   * Valid PHC Argon2 hashes start with:
   * $argon2id$
   * $argon2i$
   * $argon2d$
   */
  private isArgon2Hash(
    value:
      | string
      | null
      | undefined,
  ): value is string {
    if (!value) {
      return false;
    }

    return (
      value.startsWith(
        '$argon2id$',
      ) ||
      value.startsWith(
        '$argon2i$',
      ) ||
      value.startsWith(
        '$argon2d$',
      )
    );
  }

  /**
   * Authentication code must never crash because
   * a legacy/corrupted password hash exists.
   */
  private async verifyPasswordSafely(
    passwordHash:
      | string
      | null
      | undefined,
    password: string,
  ): Promise<boolean> {
    if (
      !this.isArgon2Hash(
        passwordHash,
      )
    ) {
      return false;
    }

    try {
      return await argon2.verify(
        passwordHash,
        password,
      );
    } catch {
      return false;
    }
  }

  private async createPasswordHash(
    password: string,
  ): Promise<string> {
    return argon2.hash(
      password,
      {
        type: argon2.argon2id,
      },
    );
  }

  // ============================================================
  // ENV / SESSION SETTINGS
  // ============================================================

  private sessionIdleMinutes(): number {
    return Number(
      process.env
        .VENDOR_SESSION_IDLE_MINUTES ??
        30,
    );
  }

  private sessionAbsoluteHours(): number {
    return Number(
      process.env
        .VENDOR_SESSION_ABSOLUTE_HOURS ??
        8,
    );
  }

  private resetOtpExpiryMinutes(): number {
    return Number(
      process.env
        .VENDOR_RESET_OTP_EXPIRY_MINUTES ??
        10,
    );
  }

  private resetOtpResendSeconds(): number {
    return Number(
      process.env
        .VENDOR_RESET_OTP_RESEND_SECONDS ??
        60,
    );
  }

  getCookieName(): string {
    return (
      process.env
        .VENDOR_SESSION_COOKIE_NAME ??
      'celltro_vendor_session'
    );
  }

  getCookieMaxAge(): number {
    return (
      this.sessionAbsoluteHours() *
      60 *
      60 *
      1000
    );
  }

  // ============================================================
  // LOGIN
  //
  // Supports:
  // 1. Registered email
  // 2. Vendor ID / vendorCode
  //
  // Username is NOT used.
  // ============================================================

  async login(
    identifierInput: string,
    password: string,
  ) {
    const identifier =
      identifierInput.trim();

    if (!identifier) {
      throw new BadRequestException(
        'Please enter your registered email address or Vendor ID.',
      );
    }

    if (!password) {
      throw new BadRequestException(
        'Please enter your password.',
      );
    }

    const isEmail =
      identifier.includes('@');

    const user =
      isEmail
        ? await this.prisma.vendorUser.findUnique(
            {
              where: {
                normalizedEmail:
                  this.normalizeEmail(
                    identifier,
                  ),
              },

              include: {
                memberships: {
                  include: {
                    vendor: true,
                  },

                  take: 1,
                },
              },
            },
          )
        : await this.prisma.vendorUser.findFirst(
            {
              where: {
                memberships: {
                  some: {
                    vendor: {
                      vendorCode: {
                        equals:
                          identifier,

                        mode:
                          'insensitive',
                      },
                    },
                  },
                },
              },

              include: {
                memberships: {
                  where: {
                    vendor: {
                      vendorCode: {
                        equals:
                          identifier,

                        mode:
                          'insensitive',
                      },
                    },
                  },

                  include: {
                    vendor: true,
                  },

                  take: 1,
                },
              },
            },
          );

    if (!user) {
      throw new UnauthorizedException(
        isEmail
          ? 'Email address or password is incorrect.'
          : 'Vendor ID or password is incorrect.',
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Your password is not configured. Please use Forgot Password to create a new password.',
      );
    }

    /**
     * IMPORTANT:
     * Old/broken vendor records may contain plain text
     * or another invalid value inside passwordHash.
     *
     * Never pass that value directly to argon2.verify().
     */
    if (
      !this.isArgon2Hash(
        user.passwordHash,
      )
    ) {
      throw new UnauthorizedException(
        'Your password needs to be reset. Please use Forgot Password to create a new password.',
      );
    }

    const passwordValid =
      await this.verifyPasswordSafely(
        user.passwordHash,
        password,
      );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Incorrect password. Please check your password and try again.',
      );
    }

    const membership =
      user.memberships[0];

    if (!membership) {
      throw new UnauthorizedException(
        'No vendor account is linked with this login.',
      );
    }

    const vendor =
      membership.vendor;

    if (
      user.status ===
      'SUSPENDED'
    ) {
      throw new UnauthorizedException(
        'Your vendor account is suspended. Please contact Celltro support.',
      );
    }

    if (
      vendor.status !==
      'ACTIVE'
    ) {
      throw new UnauthorizedException(
        'Your vendor account is currently inactive.',
      );
    }

    /**
     * Approved first-login users can be
     * PENDING_ACTIVATION only while they
     * are required to change password.
     */
    if (
      user.status ===
        'PENDING_ACTIVATION' &&
      !user.mustChangePassword
    ) {
      throw new UnauthorizedException(
        'Your vendor account is not activated yet.',
      );
    }

    if (
      user.mustChangePassword &&
      user.temporaryPasswordExpiresAt &&
      user
        .temporaryPasswordExpiresAt <=
        new Date()
    ) {
      throw new UnauthorizedException(
        'Your temporary password has expired. Please use Forgot Password to create a new password.',
      );
    }

    const rawSessionToken =
      randomBytes(32).toString(
        'base64url',
      );

    const tokenHash =
      this.hashToken(
        rawSessionToken,
      );

    const expiresAt =
      new Date(
        Date.now() +
          this.getCookieMaxAge(),
      );

    await this.prisma.vendorSession.create(
      {
        data: {
          userId: user.id,
          vendorId:
            vendor.id,
          tokenHash,
          expiresAt,
        },
      },
    );

    return {
      sessionToken:
        rawSessionToken,

      expiresAt,

      mustChangePassword:
        user.mustChangePassword,

      user: {
        email: user.email,
        role:
          membership.role,
      },

      vendor: {
        vendorCode:
          vendor.vendorCode,

        businessName:
          vendor.businessName,
      },
    };
  }

  // ============================================================
  // GET CURRENT SESSION
  // ============================================================

  async getSession(
    rawToken?: string,
  ) {
    if (!rawToken) {
      throw new UnauthorizedException(
        'Authentication required',
      );
    }

    const tokenHash =
      this.hashToken(
        rawToken,
      );

    const session =
      await this.prisma.vendorSession.findUnique(
        {
          where: {
            tokenHash,
          },

          include: {
            user: true,
            vendor: true,
          },
        },
      );

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <=
        new Date()
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
      await this.prisma.vendorSession.update(
        {
          where: {
            id: session.id,
          },

          data: {
            revokedAt:
              new Date(),
          },
        },
      );

      throw new UnauthorizedException(
        'Session expired',
      );
    }

    if (
      session.user.status ===
        'SUSPENDED' ||
      session.vendor.status !==
        'ACTIVE'
    ) {
      await this.prisma.vendorSession.update(
        {
          where: {
            id: session.id,
          },

          data: {
            revokedAt:
              new Date(),
          },
        },
      );

      throw new UnauthorizedException(
        'Vendor account is unavailable',
      );
    }

    /**
     * Avoid DB write on every request.
     * lastSeenAt is updated at most once
     * every five minutes.
     */
    const fiveMinutes =
      5 * 60 * 1000;

    if (
      Date.now() -
        session.lastSeenAt.getTime() >
      fiveMinutes
    ) {
      await this.prisma.vendorSession.update(
        {
          where: {
            id: session.id,
          },

          data: {
            lastSeenAt:
              new Date(),
          },
        },
      );
    }

    const membership =
      await this.prisma.vendorMembership.findUnique(
        {
          where: {
            vendorId_userId: {
              vendorId:
                session.vendorId,

              userId:
                session.userId,
            },
          },
        },
      );

    if (!membership) {
      throw new UnauthorizedException(
        'Vendor access is unavailable',
      );
    }

    return {
      sessionId:
        session.id,

      userId:
        session.userId,

      vendorId:
        session.vendorId,

      mustChangePassword:
        session.user
          .mustChangePassword,

      user: {
        email:
          session.user.email,

        role:
          membership.role,
      },

      vendor: {
        vendorCode:
          session.vendor
            .vendorCode,

        businessName:
          session.vendor
            .businessName,
      },
    };
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  async logout(
    rawToken?: string,
  ): Promise<void> {
    if (!rawToken) {
      return;
    }

    const tokenHash =
      this.hashToken(
        rawToken,
      );

    await this.prisma.vendorSession.updateMany(
      {
        where: {
          tokenHash,
          revokedAt: null,
        },

        data: {
          revokedAt:
            new Date(),
        },
      },
    );
  }

  // ============================================================
  // CHANGE PASSWORD
  // ============================================================

  async changePassword(
    rawToken:
      | string
      | undefined,

    currentPassword: string,

    newPassword: string,

    confirmPassword: string,
  ) {
    if (
      newPassword !==
      confirmPassword
    ) {
      throw new BadRequestException(
        'New password and confirm password do not match.',
      );
    }

    this.validatePassword(
      newPassword,
    );

    const session =
      await this.getSession(
        rawToken,
      );

    const user =
      await this.prisma.vendorUser.findUnique(
        {
          where: {
            id:
              session.userId,
          },
        },
      );

    if (
      !user ||
      !user.passwordHash
    ) {
      throw new UnauthorizedException(
        'Vendor account is unavailable.',
      );
    }

    /**
     * A malformed legacy hash cannot be securely
     * verified as a current password.
     *
     * User must recover through OTP reset.
     */
    if (
      !this.isArgon2Hash(
        user.passwordHash,
      )
    ) {
      throw new BadRequestException(
        'Your current password needs to be reset. Please use Forgot Password.',
      );
    }

    const currentValid =
      await this.verifyPasswordSafely(
        user.passwordHash,
        currentPassword,
      );

    if (!currentValid) {
      throw new BadRequestException(
        'Current password is incorrect.',
      );
    }

    const samePassword =
      await this.verifyPasswordSafely(
        user.passwordHash,
        newPassword,
      );

    if (samePassword) {
      throw new BadRequestException(
        'New password must be different from your current password.',
      );
    }

    const newHash =
      await this.createPasswordHash(
        newPassword,
      );

    const newSessionToken =
      randomBytes(32).toString(
        'base64url',
      );

    const newTokenHash =
      this.hashToken(
        newSessionToken,
      );

    const expiresAt =
      new Date(
        Date.now() +
          this.getCookieMaxAge(),
      );

    await this.prisma.$transaction(
      async (tx) => {
        await tx.vendorUser.update(
          {
            where: {
              id:
                user.id,
            },

            data: {
              passwordHash:
                newHash,

              mustChangePassword:
                false,

              temporaryPasswordExpiresAt:
                null,

              status:
                'ACTIVE',
            },
          },
        );

        /**
         * Revoke every existing session
         * before creating a fresh session.
         */
        await tx.vendorSession.updateMany(
          {
            where: {
              userId:
                user.id,

              revokedAt:
                null,
            },

            data: {
              revokedAt:
                new Date(),
            },
          },
        );

        await tx.vendorSession.create(
          {
            data: {
              userId:
                user.id,

              vendorId:
                session.vendorId,

              tokenHash:
                newTokenHash,

              expiresAt,
            },
          },
        );
      },
    );

    return {
      sessionToken:
        newSessionToken,

      expiresAt,

      message:
        'Password changed successfully.',
    };
  }

  // ============================================================
  // FORGOT PASSWORD
  //
  // Requirement:
  //
  // wrong email:
  // "Kindly enter your registered email address."
  //
  // correct email + wrong mobile:
  // "Kindly enter the correct registered mobile number."
  //
  // correct both:
  // OTP goes to email.
  // ============================================================

  async forgotPassword(
    emailInput: string,
    mobileInput: string,
  ) {
    const email =
      this.normalizeEmail(
        emailInput,
      );

    const mobile =
      this.normalizeMobile(
        mobileInput,
      );

    if (!email) {
      throw new BadRequestException(
        'Kindly enter your registered email address.',
      );
    }

    if (!mobile) {
      throw new BadRequestException(
        'Kindly enter your registered mobile number.',
      );
    }

    if (
      !/^\d{10}$/.test(
        mobile,
      )
    ) {
      throw new BadRequestException(
        'Kindly enter a valid 10-digit mobile number.',
      );
    }

    /**
     * Email is checked separately because the
     * product requirement wants a specific
     * email-vs-mobile error message.
     */
    const user =
      await this.prisma.vendorUser.findUnique(
        {
          where: {
            normalizedEmail:
              email,
          },

          include: {
            memberships: {
              include: {
                vendor: true,
              },

              take: 1,
            },
          },
        },
      );

    if (!user) {
      throw new BadRequestException(
        'Kindly enter your registered email address.',
      );
    }

    const membership =
      user.memberships[0];

    if (!membership) {
      throw new BadRequestException(
        'No vendor account is linked with this email address.',
      );
    }

    if (
      user.status ===
      'SUSPENDED'
    ) {
      throw new BadRequestException(
        'Your vendor account is suspended. Please contact Celltro support.',
      );
    }

    if (
      membership.vendor.status !==
      'ACTIVE'
    ) {
      throw new BadRequestException(
        'Your vendor account is currently inactive.',
      );
    }

    const registeredMobile =
      this.normalizeMobile(
        membership.vendor.phone,
      );

    if (
      registeredMobile !==
      mobile
    ) {
      throw new BadRequestException(
        'Kindly enter the correct registered mobile number.',
      );
    }

    /**
     * OTP resend cooldown.
     */
    const latest =
      await this.prisma.vendorEmailOtp.findFirst(
        {
          where: {
            emailNormalized:
              email,

            purpose:
              'PASSWORD_RESET',
          },

          orderBy: {
            createdAt:
              'desc',
          },
        },
      );

    if (latest) {
      const resendAt =
        latest.createdAt.getTime() +
        this.resetOtpResendSeconds() *
          1000;

      if (
        Date.now() <
        resendAt
      ) {
        const remainingSeconds =
          Math.ceil(
            (
              resendAt -
              Date.now()
            ) / 1000,
          );

        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
        );
      }
    }

    const challengeId =
      randomUUID();

    const otp =
      String(
        randomInt(
          100000,
          1000000,
        ),
      );

    const otpHash =
      this.hashOtp(
        challengeId,
        email,
        otp,
      );

    const expiresAt =
      new Date(
        Date.now() +
          this.resetOtpExpiryMinutes() *
            60 *
            1000,
      );

    await this.prisma.vendorEmailOtp.create(
      {
        data: {
          id:
            challengeId,

          emailNormalized:
            email,

          otpHash,

          purpose:
            'PASSWORD_RESET',

          expiresAt,
        },
      },
    );

    try {
      /**
       * Existing mail service is reused here.
       * Later you can rename this to
       * sendPasswordResetOtp().
       */
      await this.emailService.sendSignupOtp(
        user.email,
        otp,
      );
    } catch (error) {
      /**
       * Don't leave a usable OTP challenge
       * if email delivery failed.
       */
      await this.prisma.vendorEmailOtp
        .delete({
          where: {
            id:
              challengeId,
          },
        })
        .catch(
          () => undefined,
        );

      throw error;
    }

    return {
      success: true,

      message:
        'OTP has been sent to your registered email address.',

      challengeId,

      expiresInSeconds:
        this.resetOtpExpiryMinutes() *
        60,

      resendAfterSeconds:
        this.resetOtpResendSeconds(),
    };
  }

  // ============================================================
  // VERIFY RESET OTP
  // ============================================================

  async verifyResetOtp(
    challengeId: string,
    emailInput: string,
    otpInput: string,
  ) {
    const email =
      this.normalizeEmail(
        emailInput,
      );

    const otp =
      otpInput
        .replace(/\D/g, '')
        .slice(0, 6);

    if (
      !/^\d{6}$/.test(
        otp,
      )
    ) {
      throw new BadRequestException(
        'Please enter a valid 6-digit OTP.',
      );
    }

    const challenge =
      await this.prisma.vendorEmailOtp.findUnique(
        {
          where: {
            id:
              challengeId,
          },
        },
      );

    if (
      !challenge ||
      challenge.purpose !==
        'PASSWORD_RESET' ||
      challenge.emailNormalized !==
        email ||
      challenge.consumedAt
    ) {
      throw new BadRequestException(
        'Password reset request is invalid. Please request a new OTP.',
      );
    }

    if (
      challenge.expiresAt <=
      new Date()
    ) {
      throw new BadRequestException(
        'OTP has expired. Please request a new OTP.',
      );
    }

    if (
      challenge.verifiedAt
    ) {
      throw new BadRequestException(
        'This OTP has already been verified.',
      );
    }

    if (
      challenge.attempts >=
      RESET_OTP_ATTEMPTS
    ) {
      throw new BadRequestException(
        'Too many incorrect OTP attempts. Please request a new OTP.',
      );
    }

    const expectedHash =
      this.hashOtp(
        challenge.id,
        email,
        otp,
      );

    const otpValid =
      this.safeHashEquals(
        expectedHash,
        challenge.otpHash,
      );

    if (!otpValid) {
      const updated =
        await this.prisma.vendorEmailOtp.update(
          {
            where: {
              id:
                challenge.id,
            },

            data: {
              attempts: {
                increment: 1,
              },
            },
          },
        );

      const attemptsLeft =
        Math.max(
          0,
          RESET_OTP_ATTEMPTS -
            updated.attempts,
        );

      if (
        attemptsLeft === 0
      ) {
        throw new BadRequestException(
          'Too many incorrect OTP attempts. Please request a new OTP.',
        );
      }

      throw new BadRequestException(
        `The OTP you entered is incorrect. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
      );
    }

    /**
     * Raw reset token is returned to frontend.
     * Only SHA-256 hash is stored.
     */
    const resetToken =
      randomBytes(32).toString(
        'base64url',
      );

    await this.prisma.vendorEmailOtp.update(
      {
        where: {
          id:
            challenge.id,
        },

        data: {
          verifiedAt:
            new Date(),

          verificationTokenHash:
            this.hashToken(
              resetToken,
            ),

          /**
           * User gets fresh 10 minutes after
           * successful OTP verification.
           */
          expiresAt:
            new Date(
              Date.now() +
                10 *
                  60 *
                  1000,
            ),
        },
      },
    );

    return {
      verified: true,
      resetToken,
    };
  }

  // ============================================================
  // RESET PASSWORD
  //
  // IMPORTANT:
  // OTP + resetToken already establish account ownership.
  //
  // A malformed legacy passwordHash must therefore NEVER
  // prevent the account from being recovered.
  // ============================================================

  async resetPassword(
    challengeId: string,
    resetToken: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (
      newPassword !==
      confirmPassword
    ) {
      throw new BadRequestException(
        'New password and confirm password do not match.',
      );
    }

    this.validatePassword(
      newPassword,
    );

    const challenge =
      await this.prisma.vendorEmailOtp.findUnique(
        {
          where: {
            id:
              challengeId,
          },
        },
      );

    if (
      !challenge ||
      challenge.purpose !==
        'PASSWORD_RESET' ||
      !challenge.verifiedAt ||
      !challenge
        .verificationTokenHash ||
      challenge.consumedAt
    ) {
      throw new BadRequestException(
        'Password reset session is invalid or expired.',
      );
    }

    if (
      challenge.expiresAt <=
      new Date()
    ) {
      throw new BadRequestException(
        'Password reset session has expired. Please request a new OTP.',
      );
    }

    const suppliedResetTokenHash =
      this.hashToken(
        resetToken,
      );

    if (
      !this.safeHashEquals(
        suppliedResetTokenHash,
        challenge
          .verificationTokenHash,
      )
    ) {
      throw new BadRequestException(
        'Password reset session is invalid or expired.',
      );
    }

    const user =
      await this.prisma.vendorUser.findUnique(
        {
          where: {
            normalizedEmail:
              challenge
                .emailNormalized,
          },

          include: {
            memberships: {
              include: {
                vendor: true,
              },

              take: 1,
            },
          },
        },
      );

    if (!user) {
      throw new BadRequestException(
        'Password reset session is invalid or expired.',
      );
    }

    if (
      user.status ===
      'SUSPENDED'
    ) {
      throw new BadRequestException(
        'Your vendor account is suspended. Please contact Celltro support.',
      );
    }

    const membership =
      user.memberships[0];

    if (!membership) {
      throw new BadRequestException(
        'Vendor account is unavailable.',
      );
    }

    if (
      membership.vendor.status !==
      'ACTIVE'
    ) {
      throw new BadRequestException(
        'Your vendor account is currently inactive.',
      );
    }

    /**
     * Compare with old password ONLY if the old
     * value is actually a valid Argon2 hash.
     *
     * This is the exact fix for:
     *
     * TypeError:
     * pchstr must contain a $ as first char
     *
     * Legacy malformed values are deliberately
     * skipped so OTP recovery can repair them.
     */
    if (
      this.isArgon2Hash(
        user.passwordHash,
      )
    ) {
      const samePassword =
        await this.verifyPasswordSafely(
          user.passwordHash,
          newPassword,
        );

      if (samePassword) {
        throw new BadRequestException(
          'New password must be different from your current password.',
        );
      }
    }

    /**
     * From this point onward the account gets a
     * proper Argon2id password hash.
     */
    const passwordHash =
      await this.createPasswordHash(
        newPassword,
      );

    await this.prisma.$transaction(
      async (tx) => {
        /**
         * Atomically consume reset challenge.
         * Prevents reset token reuse / race.
         */
        const consumed =
          await tx.vendorEmailOtp.updateMany(
            {
              where: {
                id:
                  challenge.id,

                consumedAt:
                  null,

                verifiedAt: {
                  not: null,
                },
              },

              data: {
                consumedAt:
                  new Date(),
              },
            },
          );

        if (
          consumed.count !== 1
        ) {
          throw new BadRequestException(
            'Password reset session is invalid or has already been used.',
          );
        }

        /**
         * Never convert a suspended user to ACTIVE.
         * Suspended users were rejected above.
         *
         * PENDING_ACTIVATION + approved vendor can
         * complete activation through verified reset.
         */
        await tx.vendorUser.update(
          {
            where: {
              id:
                user.id,
            },

            data: {
              passwordHash,

              mustChangePassword:
                false,

              temporaryPasswordExpiresAt:
                null,

              status:
                'ACTIVE',
            },
          },
        );

        /**
         * Password reset invalidates every
         * currently active browser session.
         */
        await tx.vendorSession.updateMany(
          {
            where: {
              userId:
                user.id,

              revokedAt:
                null,
            },

            data: {
              revokedAt:
                new Date(),
            },
          },
        );
      },
    );

    return {
      success: true,

      message:
        'Password reset successfully. Please sign in with your new password.',
    };
  }
}