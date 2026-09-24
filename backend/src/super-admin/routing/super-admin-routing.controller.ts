import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import {
  SuperAdminRoutingService,
} from "./super-admin-routing.service.js";

@Controller("super-admin/routing")
export class SuperAdminRoutingController {
  constructor(
    private readonly routingService:
      SuperAdminRoutingService,
  ) {}

  @Get("summary")
  summary() {
    return this.routingService.summary();
  }

  @Get("service-areas")
  listServiceAreas(
    @Query("search")
    search?: string,

    @Query("coverage")
    coverage?: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    return this.routingService
      .listServiceAreas({
        search,
        coverage,
        page,
        limit,
      });
  }

  @Get("service-areas/:pincodeId/vendors")
  getServiceAreaVendors(
    @Param("pincodeId")
    pincodeId: string,
  ) {
    return this.routingService
      .getServiceAreaVendors(
        pincodeId,
      );
  }

  @Get("service-areas/:pincodeId/eligible-vendors")
  listEligibleVendors(
    @Param("pincodeId")
    pincodeId: string,

    @Query("search")
    search?: string,
  ) {
    return this.routingService
      .listEligibleVendors(
        pincodeId,
        search,
      );
  }

  @Get("orders")
  listOrders(
    @Query("search")
    search?: string,

    @Query("assignment")
    assignment?: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    return this.routingService
      .listOrders({
        search,
        assignment,
        page,
        limit,
      });
  }

  @Get("orders/:orderNumber/history")
  getOrderHistory(
    @Param("orderNumber")
    orderNumber: string,
  ) {
    return this.routingService
      .getOrderHistory(
        orderNumber,
      );
  }

  @Get("orders/:orderNumber")
  getOrder(
    @Param("orderNumber")
    orderNumber: string,
  ) {
    return this.routingService
      .getOrder(
        orderNumber,
      );
  }

  @Post("orders/:orderNumber/assign")
  assignOrder(
    @Param("orderNumber")
    orderNumber: string,

    @Body()
    body: {
      vendorId?: unknown;
    },
  ) {
    return this.routingService
      .assignOrder(
        orderNumber,
        body,
      );
  }

  @Post("orders/:orderNumber/reroute")
  rerouteOrder(
    @Param("orderNumber")
    orderNumber: string,

    @Body()
    body: {
      vendorId?: unknown;
    },
  ) {
    return this.routingService
      .rerouteOrder(
        orderNumber,
        body,
      );
  }
}