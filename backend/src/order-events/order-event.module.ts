import {
  Module,
} from '@nestjs/common';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  OrderEventService,
} from './order-event.service.js';

@Module({
  imports: [
    PrismaModule,
  ],

  providers: [
    OrderEventService,
  ],

  exports: [
    OrderEventService,
  ],
})
export class OrderEventModule {}