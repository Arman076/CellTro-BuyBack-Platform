import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { OrdersService } from "./orders.service.js";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("pickup-slots")
  getPickupSlots() {
    return this.ordersService.getPickupSlots();
  }

  @Get("customer-addresses")
  getCustomerAddresses(@Query("phone") phone: string) {
    return this.ordersService.getCustomerAddresses(phone);
  }

  @Post("customer-addresses")
  createCustomerAddress(@Body() body: any) {
    return this.ordersService.createCustomerAddress(body);
  }

  @Patch("customer-addresses/:id")
  updateCustomerAddress(@Param("id") id: string, @Body() body: any) {
    return this.ordersService.updateCustomerAddress(Number(id), body);
  }

  @Delete("customer-addresses/:id")
  deleteCustomerAddress(@Param("id") id: string, @Body() body: any) {
    return this.ordersService.deleteCustomerAddress(Number(id), body?.phone);
  }

  @Post()
  createOrder(@Body() body: any) {
    return this.ordersService.createOrder(body);
  }

  @Get(":orderNumber")
  getOrder(@Param("orderNumber") orderNumber: string) {
    return this.ordersService.getOrder(orderNumber);
  }

  @Patch(":orderNumber/reschedule")
  reschedule(
    @Param("orderNumber") orderNumber: string,
    @Body() body: any,
  ) {
    return this.ordersService.rescheduleOrder(orderNumber, body);
  }

  @Patch(":orderNumber/cancel")
  cancel(@Param("orderNumber") orderNumber: string) {
    return this.ordersService.cancelOrder(orderNumber);
  }
}
