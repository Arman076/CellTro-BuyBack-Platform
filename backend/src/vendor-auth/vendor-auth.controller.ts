import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';

import type {
  Request,
  Response,
} from 'express';

import { VendorAuthService } from './vendor-auth.service.js';

@Controller('vendor-auth')
export class VendorAuthController {
  constructor(
    private readonly authService: VendorAuthService,
  ) {}

  // ============================================================
  // SESSION COOKIE
  // ============================================================

  private getSessionToken(
    req: Request,
  ): string | undefined {
    const cookieName =
      this.authService.getCookieName();

    /*
     * Primary:
     * cookie-parser.
     */
    const parsedToken =
      req.cookies?.[
        cookieName
      ];

    if (
      typeof parsedToken ===
        'string' &&
      parsedToken
    ) {
      return parsedToken;
    }

    /*
     * Safe fallback:
     * parse raw Cookie header.
     *
     * This also makes authentication
     * resilient if cookie-parser is
     * unavailable for any reason.
     */
    const cookieHeader =
      req.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    const cookies =
      cookieHeader.split(';');

    for (
      const cookie of cookies
    ) {
      const separatorIndex =
        cookie.indexOf('=');

      if (
        separatorIndex === -1
      ) {
        continue;
      }

      const name =
        cookie
          .slice(
            0,
            separatorIndex,
          )
          .trim();

      if (
        name !== cookieName
      ) {
        continue;
      }

      const value =
        cookie
          .slice(
            separatorIndex + 1,
          )
          .trim();

      if (!value) {
        return undefined;
      }

      try {
        return decodeURIComponent(
          value,
        );
      } catch {
        return value;
      }
    }

    return undefined;
  }

  private isLocalRequest(
    req: Request,
  ): boolean {
    const hostname =
      req.hostname
        ?.toLowerCase();

    return (
      hostname ===
        'localhost' ||
      hostname ===
        '127.0.0.1' ||
      hostname ===
        '::1'
    );
  }

  private setSessionCookie(
    req: Request,
    res: Response,
    token: string,
  ): void {
    /*
     * IMPORTANT:
     *
     * Local development runs on HTTP.
     * A Secure cookie must therefore
     * not be forced on localhost.
     */
    const secure =
      process.env.NODE_ENV ===
        'production' &&
      !this.isLocalRequest(req);

    res.cookie(
      this.authService.getCookieName(),
      token,
      {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge:
          this.authService.getCookieMaxAge(),
      },
    );
  }

  private clearSessionCookie(
    req: Request,
    res: Response,
  ): void {
    const secure =
      process.env.NODE_ENV ===
        'production' &&
      !this.isLocalRequest(req);

    res.clearCookie(
      this.authService.getCookieName(),
      {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
      },
    );
  }

  // ============================================================
  // LOGIN
  // ============================================================

  @Post('login')
  async login(
    @Req()
    req: Request,

    @Body()
    body: {
      identifier?: string;
      email?: string;
      password?: string;
    },

    @Res({
      passthrough: true,
    })
    res: Response,
  ) {
    const identifier =
      body.identifier?.trim() ||
      body.email?.trim();

    if (!identifier) {
      throw new BadRequestException(
        'Please enter your registered email address or Vendor ID.',
      );
    }

    if (!body.password) {
      throw new BadRequestException(
        'Please enter your password.',
      );
    }

    const result =
      await this.authService.login(
        identifier,
        body.password,
      );

    /*
     * Store ONLY raw session token
     * inside HttpOnly cookie.
     *
     * DB already contains SHA-256 hash.
     */
    this.setSessionCookie(
      req,
      res,
      result.sessionToken,
    );

    return {
      authenticated: true,

      mustChangePassword:
        result.mustChangePassword,

      user:
        result.user,

      vendor:
        result.vendor,
    };
  }

  // ============================================================
  // CURRENT SESSION
  // ============================================================

  @Get('me')
  async me(
    @Req()
    req: Request,
  ) {
    const token =
      this.getSessionToken(
        req,
      );

    const session =
      await this.authService.getSession(
        token,
      );

    return {
      authenticated: true,

      mustChangePassword:
        session.mustChangePassword,

      user:
        session.user,

      vendor:
        session.vendor,
    };
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  @Post('logout')
  async logout(
    @Req()
    req: Request,

    @Res({
      passthrough: true,
    })
    res: Response,
  ) {
    const token =
      this.getSessionToken(
        req,
      );

    await this.authService.logout(
      token,
    );

    this.clearSessionCookie(
      req,
      res,
    );

    return {
      success: true,
      message:
        'Logged out successfully.',
    };
  }

  // ============================================================
  // CHANGE PASSWORD
  // ============================================================

  @Post('change-password')
  async changePassword(
    @Req()
    req: Request,

    @Body()
    body: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    },

    @Res({
      passthrough: true,
    })
    res: Response,
  ) {
    if (
      !body.currentPassword
    ) {
      throw new BadRequestException(
        'Please enter your current password.',
      );
    }

    if (
      !body.newPassword
    ) {
      throw new BadRequestException(
        'Please enter a new password.',
      );
    }

    if (
      !body.confirmPassword
    ) {
      throw new BadRequestException(
        'Please confirm your new password.',
      );
    }

    const result =
      await this.authService.changePassword(
        this.getSessionToken(
          req,
        ),
        body.currentPassword,
        body.newPassword,
        body.confirmPassword,
      );

    /*
     * changePassword revokes previous
     * sessions and creates a fresh one.
     */
    this.setSessionCookie(
      req,
      res,
      result.sessionToken,
    );

    return {
      success: true,
      message:
        result.message,
    };
  }

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  @Post('forgot-password')
  async forgotPassword(
    @Body()
    body: {
      email?: string;
      mobile?: string;
    },
  ) {
    const email =
      body.email?.trim();

    const mobile =
      body.mobile?.trim();

    if (!email) {
      throw new BadRequestException(
        'Please enter your registered email address.',
      );
    }

    if (!mobile) {
      throw new BadRequestException(
        'Please enter your registered mobile number.',
      );
    }

    return this.authService.forgotPassword(
      email,
      mobile,
    );
  }

  // ============================================================
  // VERIFY RESET OTP
  // ============================================================

  @Post('verify-reset-otp')
  async verifyResetOtp(
    @Body()
    body: {
      challengeId?: string;
      email?: string;
      otp?: string;
    },
  ) {
    const challengeId =
      body.challengeId?.trim();

    const email =
      body.email?.trim();

    const otp =
      body.otp?.trim();

    if (!challengeId) {
      throw new BadRequestException(
        'Password reset request is invalid. Please request a new OTP.',
      );
    }

    if (!email) {
      throw new BadRequestException(
        'Email address is required.',
      );
    }

    if (!otp) {
      throw new BadRequestException(
        'Please enter the OTP sent to your email.',
      );
    }

    if (
      !/^\d{6}$/.test(
        otp,
      )
    ) {
      throw new BadRequestException(
        'Please enter a valid 6-digit OTP.',
      );
    }

    return this.authService.verifyResetOtp(
      challengeId,
      email,
      otp,
    );
  }

  // ============================================================
  // RESET PASSWORD
  // ============================================================

  @Post('reset-password')
  async resetPassword(
    @Body()
    body: {
      challengeId?: string;
      resetToken?: string;
      newPassword?: string;
      confirmPassword?: string;
    },
  ) {
    const challengeId =
      body.challengeId?.trim();

    const resetToken =
      body.resetToken?.trim();

    if (
      !challengeId ||
      !resetToken
    ) {
      throw new BadRequestException(
        'Password reset session has expired. Please request a new OTP.',
      );
    }

    if (
      !body.newPassword
    ) {
      throw new BadRequestException(
        'Please enter a new password.',
      );
    }

    if (
      !body.confirmPassword
    ) {
      throw new BadRequestException(
        'Please confirm your new password.',
      );
    }

    return this.authService.resetPassword(
      challengeId,
      resetToken,
      body.newPassword,
      body.confirmPassword,
    );
  }
}