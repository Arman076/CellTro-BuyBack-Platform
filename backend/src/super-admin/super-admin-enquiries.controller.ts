import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";

import {
  SuperAdminEnquiriesService,
} from "./super-admin-enquiries.service.js";

@Controller("super-admin/enquiries")
export class SuperAdminEnquiriesController {
  constructor(
    private readonly enquiriesService:
      SuperAdminEnquiriesService,
  ) {}

  @Get()
  getEnquiries(
    @Query("search")
    search?: string,

    @Query("from")
    from?: string,

    @Query("to")
    to?: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    return this.enquiriesService.getEnquiries({
      search,
      from,
      to,
      page,
      limit,
    });
  }

  @Get(":id")
  getEnquiryDetails(
    @Param("id")
    id: string,
  ) {
    return this.enquiriesService.getEnquiryDetails(
      id,
    );
  }
}