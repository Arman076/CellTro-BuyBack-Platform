import {
  Controller,
  Get,
  Param,
  Query,
  Req,
} from "@nestjs/common";

import type {
  Request,
} from "express";

import {
  VendorAuthService,
} from "../vendor-auth/vendor-auth.service.js";

import {
  VendorOrdersService,
} from "./vendor-orders.service.js";

@Controller("vendor-orders")
export class VendorOrdersController {
  constructor(
    private readonly vendorOrdersService:
      VendorOrdersService,

    private readonly vendorAuthService:
      VendorAuthService,
  ) {}

  private getSessionToken(
    request: Request,
  ): string | undefined {
    const cookieName =
      this.vendorAuthService.getCookieName();

    const parsedToken =
      request.cookies?.[cookieName];

    if (
      typeof parsedToken === "string" &&
      parsedToken
    ) {
      return parsedToken;
    }

    const cookieHeader =
      request.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    for (
      const cookie of cookieHeader.split(";")
    ) {
      const separatorIndex =
        cookie.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const name = cookie
        .slice(0, separatorIndex)
        .trim();

      if (name !== cookieName) {
        continue;
      }

      const value = cookie
        .slice(separatorIndex + 1)
        .trim();

      if (!value) {
        return undefined;
      }

      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }

    return undefined;
  }

  private async requireVendor(
    request: Request,
  ) {
    return this.vendorAuthService.getSession(
      this.getSessionToken(request),
    );
  }

  @Get("dashboard")
  async getDashboard(
    @Req()
    request: Request,

    @Query("dateFilter")
    dateFilter?: string,
  ) {
    const session =
      await this.requireVendor(request);

    return this.vendorOrdersService.getDashboard(
      session.vendorId,
      {
        dateFilter,
      },
    );
  }

  @Get()
  async listOrders(
    @Req()
    request: Request,

    @Query("search")
    search?: string,

    @Query("status")
    status?: string,

    @Query("dateFilter")
    dateFilter?: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    const session =
      await this.requireVendor(request);

    return this.vendorOrdersService.listOrders(
      session.vendorId,
      {
        search,
        status,
        dateFilter,
        page,
        limit,
      },
    );
  }

  @Get(":orderNumber")
  async getOrder(
    @Req()
    request: Request,

    @Param("orderNumber")
    orderNumber: string,
  ) {
    const session =
      await this.requireVendor(request);

    return this.vendorOrdersService.getOrder(
      session.vendorId,
      orderNumber,
    );
  }
}