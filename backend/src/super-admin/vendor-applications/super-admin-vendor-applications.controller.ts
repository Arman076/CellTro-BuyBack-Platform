import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import {
  SuperAdminVendorApplicationsService,
} from "./super-admin-vendor-applications.service.js";

@Controller(
  "super-admin/vendor-applications",
)
export class SuperAdminVendorApplicationsController {
  constructor(
    private readonly service:
      SuperAdminVendorApplicationsService,
  ) {}

  @Get()
  list(
    @Query("status")
    status?: string,

    @Query("search")
    search?: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    return this.service.list({
      status,
      search,
      page,
      limit,
    });
  }

  @Get(":applicationId")
  getById(
    @Param("applicationId")
    applicationId: string,
  ) {
    return this.service.getById(
      applicationId,
    );
  }

  @Post(":applicationId/approve")
  approve(
    @Param("applicationId")
    applicationId: string,
  ) {
    return this.service.approve(
      applicationId,
    );
  }

  @Post(
    ":applicationId/resend-credentials",
  )
  resendCredentials(
    @Param("applicationId")
    applicationId: string,
  ) {
    return this.service.resendCredentials(
      applicationId,
    );
  }

  @Post(":applicationId/reject")
  reject(
    @Param("applicationId")
    applicationId: string,

    @Body()
    body: {
      reason?: unknown;
    },
  ) {
    return this.service.reject(
      applicationId,
      body.reason,
    );
  }
}