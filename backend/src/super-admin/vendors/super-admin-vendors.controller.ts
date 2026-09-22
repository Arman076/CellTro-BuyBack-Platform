import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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

  @Get(":vendorId")
  getById(
    @Param("vendorId")
    vendorId: string,
  ) {
    return this.vendorsService.getById(
      vendorId,
    );
  }

  @Post()
  create(
    @Body()
    body: {
      businessName?: unknown;
      contactName?: unknown;
      phone?: unknown;
      email?: unknown;
    },
  ) {
    return this.vendorsService.create(
      body,
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