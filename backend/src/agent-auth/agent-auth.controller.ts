import {
  Body,
  Controller,
  Post,
  Req,
  Res,
} from '@nestjs/common';

import type {
  Request,
  Response,
} from 'express';

import { AgentAuthService } from './agent-auth.service.js';

import {
  SendAgentEmailOtpDto,
  VerifyAgentEmailOtpDto,
} from './dto/agent-email-otp.dto.js';

import { AgentRegistrationDto } from './dto/agent-registration.dto.js';
import { AgentLoginDto } from './dto/agent-login.dto.js';

@Controller('agent-auth')
export class AgentAuthController {
  constructor(
    private readonly agentAuthService:
      AgentAuthService,
  ) {}
  private setSessionCookie(
  req: Request,
  res: Response,
  token: string,
): void {
  const hostname =
    req.hostname?.toLowerCase();

  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  const secure =
    process.env.NODE_ENV ===
      'production' &&
    !isLocal;

  res.cookie(
    this.agentAuthService.getCookieName(),
    token,
    {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge:
        this.agentAuthService.getCookieMaxAge(),
    },
  );
}

  @Post('send-email-otp')
  sendEmailOtp(
    @Body()
    dto: SendAgentEmailOtpDto,
  ) {
    return this.agentAuthService
      .sendEmailOtp(dto);
  }

  @Post('verify-email-otp')
  verifyEmailOtp(
    @Body()
    dto: VerifyAgentEmailOtpDto,
  ) {
    return this.agentAuthService
      .verifyEmailOtp(dto);
  }

  @Post('register')
  register(
    @Body()
    dto: AgentRegistrationDto,
  ) {
    return this.agentAuthService
      .register(dto);
  }
  @Post('login')
async login(
  @Req()
  req: Request,

  @Body()
  dto: AgentLoginDto,

  @Res({
    passthrough: true,
  })
  res: Response,
) {
  const result =
    await this.agentAuthService.login(
      dto,
    );

  this.setSessionCookie(
    req,
    res,
    result.sessionToken,
  );

  return {
    authenticated: true,
    agent: result.agent,
  };
}
}

