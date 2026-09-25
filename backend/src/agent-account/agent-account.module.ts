import { Module } from '@nestjs/common';

import { AgentSessionModule } from '../agent-session/agent-session.module.js';

import { AgentAccountController } from './agent-account.controller.js';

@Module({
  imports: [
    AgentSessionModule,
  ],

  controllers: [
    AgentAccountController,
  ],
})
export class AgentAccountModule {}