import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import { ContactLeadsController } from './contact-leads.controller.js';
import { ContactLeadsService } from './contact-leads.service.js';

@Module({
  imports: [PrismaModule],

  controllers: [
    ContactLeadsController,
  ],

  providers: [
    ContactLeadsService,
  ],
})
export class ContactLeadsModule {}