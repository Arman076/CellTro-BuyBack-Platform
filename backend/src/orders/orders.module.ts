import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma/prisma.service.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
  exports: [OrdersService],
})
export class OrdersModule {}
