import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import { AgentSessionGuard } from './agent-session.guard.js';
import { AgentSessionService } from './agent-session.service.js';

@Module({
  imports: [
    PrismaModule,
  ],

  providers: [
    AgentSessionService,
    AgentSessionGuard,
  ],

  exports: [
    AgentSessionService,
    AgentSessionGuard,
  ],
})
export class AgentSessionModule {}