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
  AgentOrdersController,
} from './agent-orders.controller.js';

import {
  AgentOrdersService,
} from './agent-orders.service.js';

@Module({
  imports: [
    PrismaModule,
    AgentSessionModule,
  ],

  controllers: [
    AgentOrdersController,
  ],

  providers: [
    AgentOrdersService,
  ],
})
export class AgentOrdersModule {}