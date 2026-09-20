import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";

import {
  SuperAdminOrdersService,
} from "./super-admin-orders.service.js";

@Controller("super-admin/orders")
export class SuperAdminOrdersController {
  constructor(
    private readonly ordersService:
      SuperAdminOrdersService,
  ) {}

  @Get()
  getOrders(
    @Query("search")
    search?: string,

    @Query("status")
    status?: string,

    @Query("statusGroup")
    statusGroup?: string,

    @Query("from")
    from?: string,

    @Query("to")
    to?: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    return this.ordersService.getOrders({
      search,
      status,
      statusGroup,
      from,
      to,
      page,
      limit,
    });
  }

  @Get(":orderNumber")
  getOrderDetails(
    @Param("orderNumber")
    orderNumber: string,
  ) {
    return this.ordersService.getOrderDetails(
      orderNumber,
    );
  }
}