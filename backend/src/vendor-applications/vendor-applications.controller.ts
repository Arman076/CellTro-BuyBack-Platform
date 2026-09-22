import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { CreateVendorApplicationDto } from './dto/create-vendor-application.dto.js';
import { SendEmailOtpDto } from './dto/send-email-otp.dto.js';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto.js';
import { VendorApplicationsService } from './vendor-applications.service.js';

@Controller('vendor-applications')
export class VendorApplicationsController {
  constructor(
    private readonly service:
      VendorApplicationsService,
  ) {}

  @Post('send-email-otp')
  @HttpCode(HttpStatus.OK)
  sendEmailOtp(
    @Body() dto: SendEmailOtpDto,
  ) {
    return this.service.sendEmailOtp(dto);
  }

  @Post('verify-email-otp')
  @HttpCode(HttpStatus.OK)
  verifyEmailOtp(
    @Body() dto: VerifyEmailOtpDto,
  ) {
    return this.service.verifyEmailOtp(dto);
  }

  @Post()
  create(
    @Body()
    dto: CreateVendorApplicationDto,
  ) {
    return this.service.createApplication(
      dto,
    );
  }
}