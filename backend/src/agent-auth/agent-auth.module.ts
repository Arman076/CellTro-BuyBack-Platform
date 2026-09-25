import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { VendorEmailService } from '../vendor-security/vendor-email.service.js';

import { AgentAuthController } from './agent-auth.controller.js';
import { AgentAuthService } from './agent-auth.service.js';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    AgentAuthController,
  ],
  providers: [
    AgentAuthService,
    VendorEmailService,
  ],
  exports: [
    AgentAuthService,
  ],
})
export class AgentAuthModule {}