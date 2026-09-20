import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";

import {
  SuperAdminCustomersService,
} from "./super-admin-customers.service.js";

@Controller("super-admin/customers")
export class SuperAdminCustomersController {
  constructor(
    private readonly customersService:
      SuperAdminCustomersService,
  ) {}

  @Get()
  getCustomers(
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
    return this.customersService.getCustomers({
      search,
      from,
      to,
      page,
      limit,
    });
  }

  @Get(":customerId")
  getCustomerDetails(
    @Param("customerId")
    customerId: string,
  ) {
    return this.customersService.getCustomerDetails(
      customerId,
    );
  }
}