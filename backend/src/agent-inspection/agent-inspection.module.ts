import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AgentSessionModule } from '../agent-session/agent-session.module.js';

import { AgentInspectionController } from './agent-inspection.controller.js';
import { AgentInspectionService } from './agent-inspection.service.js';

@Module({
  imports: [
    PrismaModule,
    AgentSessionModule,
  ],
  controllers: [
    AgentInspectionController,
  ],
  providers: [
    AgentInspectionService,
  ],
  exports: [
    AgentInspectionService,
  ],
})
export class AgentInspectionModule {}