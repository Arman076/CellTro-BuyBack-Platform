import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { VendorEmailService } from '../vendor-security/vendor-email.service.js';

import { VendorAuthController } from './vendor-auth.controller.js';
import { VendorAuthService } from './vendor-auth.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [VendorAuthController],
  providers: [
    VendorAuthService,
    VendorEmailService,
  ],
  exports: [VendorAuthService],
})
export class VendorAuthModule {}