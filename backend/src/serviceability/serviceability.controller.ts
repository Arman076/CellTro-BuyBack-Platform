import {
  Controller,
  Get,
  Query,
} from "@nestjs/common";

import {
  ServiceabilityService,
} from "./serviceability.service.js";

@Controller("serviceability")
export class ServiceabilityController {
  constructor(
    private readonly serviceabilityService:
      ServiceabilityService,
  ) {}

  @Get("check")
  check(
    @Query("pincode")
    pincode: string,
  ) {
    return this.serviceabilityService.check(
      pincode,
    );
  }
}
