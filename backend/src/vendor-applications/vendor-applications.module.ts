import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';
import { VendorCryptoService } from '../vendor-security/vendor-crypto.service.js';
import { VendorEmailService } from '../vendor-security/vendor-email.service.js';

import { VendorApplicationsController } from './vendor-applications.controller.js';
import { VendorApplicationsService } from './vendor-applications.service.js';

@Module({
  controllers: [
    VendorApplicationsController,
  ],
  providers: [
    VendorApplicationsService,
    VendorCryptoService,
    VendorEmailService,
    PrismaService,
  ],
})
export class VendorApplicationsModule {}