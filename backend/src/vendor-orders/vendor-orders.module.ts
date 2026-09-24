import {
  Module,
} from "@nestjs/common";

import {
  PrismaModule,
} from "../prisma/prisma.module.js";

import {
  VendorAuthModule,
} from "../vendor-auth/vendor-auth.module.js";

import {
  VendorOrdersController,
} from "./vendor-orders.controller.js";

import {
  VendorOrdersService,
} from "./vendor-orders.service.js";

@Module({
  imports: [
    PrismaModule,
    VendorAuthModule,
  ],

  controllers: [
    VendorOrdersController,
  ],

  providers: [
    VendorOrdersService,
  ],

  exports: [
    VendorOrdersService,
  ],
})
export class VendorOrdersModule {}