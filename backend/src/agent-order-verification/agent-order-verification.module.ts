import {
  Module,
} from '@nestjs/common';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  AgentSessionModule,
} from '../agent-session/agent-session.module.js';

import {
  OtpModule,
} from '../otp/otp.module.js';

import {
  OrderEventModule,
} from '../order-events/order-event.module.js';

import {
  VendorEmailService,
} from '../vendor-security/vendor-email.service.js';

import {
  AgentOrderVerificationController,
} from './agent-order-verification.controller.js';

import {
  AgentOrderVerificationService,
} from './agent-order-verification.service.js';

@Module({
  imports: [
    PrismaModule,
    AgentSessionModule,
    OtpModule,
    OrderEventModule,
  ],

  controllers: [
    AgentOrderVerificationController,
  ],

  providers: [
    AgentOrderVerificationService,
    VendorEmailService,
  ],

  exports: [
    AgentOrderVerificationService,
  ],
})
export class AgentOrderVerificationModule {}