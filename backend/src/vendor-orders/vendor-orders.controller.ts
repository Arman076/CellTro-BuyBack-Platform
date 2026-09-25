import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

import {
  VendorAuthService,
} from "../vendor-auth/vendor-auth.service.js";

import {
  AssignOrderAgentDto,
} from "./dto/assign-order-agent.dto.js";

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
    req: Request,
  ): string | undefined {
    const cookieName =
      this.vendorAuthService.getCookieName();

    const parsedCookie =
      req.cookies?.[cookieName];

    if (
      typeof parsedCookie === "string" &&
      parsedCookie.trim()
    ) {
      return parsedCookie.trim();
    }

    const rawCookie =
      req.headers.cookie;

    if (!rawCookie) {
      return undefined;
    }

    for (
      const part of
      rawCookie.split(";")
    ) {
      const separator =
        part.indexOf("=");

      if (separator < 0) {
        continue;
      }

      const name =
        part
          .slice(0, separator)
          .trim();

      if (name !== cookieName) {
        continue;
      }

      const value =
        part
          .slice(separator + 1)
          .trim();

      if (!value) {
        return undefined;
      }

      try {
        return decodeURIComponent(
          value,
        );
      } catch {
        return value;
      }
    }

    return undefined;
  }

  private async requireVendor(
    req: Request,
  ) {
    const token =
      this.getSessionToken(req);

    return this.vendorAuthService.getSession(
      token,
    );
  }

  @Get("dashboard")
  async getDashboard(
    @Req() req: Request,

    @Query("dateFilter")
    dateFilter?: string,
  ) {
    const session =
      await this.requireVendor(req);

    return this.vendorOrdersService.getDashboard(
      session.vendorId,
      {
        dateFilter,
      },
    );
  }

  /*
   * IMPORTANT:
   * Keep this static route before
   * @Get(":orderNumber").
   */
  @Get("agents")
  async getAssignableAgents(
    @Req() req: Request,
  ) {
    const session =
      await this.requireVendor(req);

    return this.vendorOrdersService.getAssignableAgents(
      session.vendorId,
    );
  }

  @Get()
  async listOrders(
    @Req() req: Request,

    @Query("search")
    search?: string,

    @Query("status")
    status?: string,

    @Query("statusGroup")
    statusGroup?: string,

    @Query("dateFilter")
    dateFilter?: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    const session =
      await this.requireVendor(req);

    return this.vendorOrdersService.listOrders(
      session.vendorId,
      {
        search,
        status,
        statusGroup,
        dateFilter,
        page,
        limit,
      },
    );
  }

  @Post(":orderNumber/agent")
  async assignAgent(
    @Req() req: Request,

    @Param("orderNumber")
    orderNumber: string,

    @Body()
    body: AssignOrderAgentDto,
  ) {
    const session =
      await this.requireVendor(req);

    return this.vendorOrdersService.assignAgent(
      session.vendorId,
      orderNumber,
      body.agentId,
    );
  }

  @Get(":orderNumber")
  async getOrder(
    @Req() req: Request,

    @Param("orderNumber")
    orderNumber: string,
  ) {
    const session =
      await this.requireVendor(req);

    return this.vendorOrdersService.getOrder(
      session.vendorId,
      orderNumber,
    );
  }
}