import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import { PartnerLeadsController } from './partner-leads.controller.js';
import { PartnerLeadsService } from './partner-leads.service.js';

@Module({
  imports: [PrismaModule],

  controllers: [
    PartnerLeadsController,
  ],

  providers: [
    PartnerLeadsService,
  ],
})
export class PartnerLeadsModule {}