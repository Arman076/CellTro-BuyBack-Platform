import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from "@nestjs/common";

import {
  SuperAdminVendorsService,
} from "./super-admin-vendors.service.js";

@Controller("super-admin/vendors")
export class SuperAdminVendorsController {
  constructor(
    private readonly vendorsService:
      SuperAdminVendorsService,
  ) {}

  @Get()
  list(
    @Query("search")
    search?: string,

    @Query("status")
    status?: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    return this.vendorsService.list({
      search,
      status,
      page,
      limit,
    });
  }

  @Get(":vendorId/kpis")
  getKpis(
    @Param("vendorId")
    vendorId: string,
  ) {
    return this.vendorsService.getKpis(
      vendorId,
    );
  }

  @Get(":vendorId/orders")
  getOrders(
    @Param("vendorId")
    vendorId: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,

    @Query("status")
    status?: string,

    @Query("search")
    search?: string,
  ) {
    return this.vendorsService.getOrders(
      vendorId,
      {
        page,
        limit,
        status,
        search,
      },
    );
  }

  @Get(":vendorId/service-areas")
  getServiceAreas(
    @Param("vendorId")
    vendorId: string,

    @Query("search")
    search?: string,
  ) {
    return this.vendorsService
      .getAvailableServiceAreas(
        vendorId,
        search,
      );
  }

  @Get(":vendorId")
  getById(
    @Param("vendorId")
    vendorId: string,
  ) {
    return this.vendorsService.getById(
      vendorId,
    );
  }

  @Patch(":vendorId")
  update(
    @Param("vendorId")
    vendorId: string,

    @Body()
    body: {
      businessName?: unknown;
      contactName?: unknown;
      phone?: unknown;
      email?: unknown;
    },
  ) {
    return this.vendorsService.update(
      vendorId,
      body,
    );
  }

  @Patch(":vendorId/status")
  setStatus(
    @Param("vendorId")
    vendorId: string,

    @Body("status")
    status: unknown,
  ) {
    return this.vendorsService.setStatus(
      vendorId,
      status,
    );
  }

  @Patch(":vendorId/service-areas")
  replaceServiceAreas(
    @Param("vendorId")
    vendorId: string,

    @Body()
    body: {
      areas?: unknown;
    },
  ) {
    return this.vendorsService
      .replaceServiceAreas(
        vendorId,
        body,
      );
  }
}