import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import { AgentSessionModule } from '../agent-session/agent-session.module.js';

import { AgentDashboardController } from './agent-dashboard.controller.js';

import { AgentDashboardService } from './agent-dashboard.service.js';

@Module({
  imports: [
    PrismaModule,
    AgentSessionModule,
  ],

  controllers: [
    AgentDashboardController,
  ],

  providers: [
    AgentDashboardService,
  ],
})
export class AgentDashboardModule {}