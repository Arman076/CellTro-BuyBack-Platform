import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { VendorAuthModule } from '../vendor-auth/vendor-auth.module.js';

import { VendorAgentsController } from './vendor-agents.controller.js';
import { VendorAgentsService } from './vendor-agents.service.js';

@Module({
  imports: [
    PrismaModule,
    VendorAuthModule,
  ],

  controllers: [
    VendorAgentsController,
  ],

  providers: [
    VendorAgentsService,
  ],

  exports: [
    VendorAgentsService,
  ],
})
export class VendorAgentsModule {}