import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from "@nestjs/common";

import type {
  Request,
  Response,
} from "express";

import {
  OrdersService,
} from "./orders.service.js";

const CUSTOMER_SESSION_COOKIE =
  "celltro_customer_session";

@Controller("orders")
export class OrdersController {
  constructor(
    private readonly ordersService:
      OrdersService,
  ) {}

  private readCustomerSessionCookie(
    request: Request,
  ) {
    const cookieHeader =
      String(
        request.headers.cookie ??
          "",
      );

    for (
      const part of cookieHeader.split(
        ";",
      )
    ) {
      const [
        rawName,
        ...rawValueParts
      ] =
        part
          .trim()
          .split("=");

      if (
        rawName ===
        CUSTOMER_SESSION_COOKIE
      ) {
        return decodeURIComponent(
          rawValueParts.join("="),
        ).trim();
      }
    }

    return "";
  }

  @Get("pickup-slots")
  getPickupSlots() {
    return this.ordersService.getPickupSlots();
  }

  @Get("cancellation-reasons")
  getCancellationReasons() {
    return this.ordersService.getCustomerCancellationReasons();
  }

  @Get("customer-addresses")
  getCustomerAddresses(
    @Req()
    request: Request,
  ) {
    return this.ordersService.getCustomerAddresses(
      this.readCustomerSessionCookie(
        request,
      ),
    );
  }

  @Post("customer-addresses")
  createCustomerAddress(
    @Req()
    request: Request,

    @Body()
    body: any,
  ) {
    return this.ordersService.createCustomerAddress(
      this.readCustomerSessionCookie(
        request,
      ),
      body,
    );
  }

  @Patch("customer-addresses/:id")
  updateCustomerAddress(
    @Req()
    request: Request,

    @Param("id")
    id: string,

    @Body()
    body: any,
  ) {
    return this.ordersService.updateCustomerAddress(
      this.readCustomerSessionCookie(
        request,
      ),
      Number(id),
      body,
    );
  }

  @Delete("customer-addresses/:id")
  deleteCustomerAddress(
    @Req()
    request: Request,

    @Param("id")
    id: string,
  ) {
    return this.ordersService.deleteCustomerAddress(
      this.readCustomerSessionCookie(
        request,
      ),
      Number(id),
    );
  }

  @Post()
  createOrder(
    @Req()
    request: Request,

    @Body()
    body: any,
  ) {
    return this.ordersService.createOrder(
      this.readCustomerSessionCookie(
        request,
      ),
      body,
    );
  }

  @Get("feedback-options")
  getFeedbackOptions() {
    return this.ordersService.getCustomerFeedbackOptions();
  }

  @Post(":orderNumber/feedback")
  submitFeedback(
    @Req()
    request: Request,

    @Param("orderNumber")
    orderNumber: string,

    @Body()
    body: {
      rating?: number;
      optionCode?: string;
      feedbackText?: string;
    },
  ) {
    return this.ordersService.submitCustomerFeedback(
      this.readCustomerSessionCookie(
        request,
      ),
      orderNumber,
      body,
    );
  }

  @Get("my-orders")
  getMyOrders(
    @Req()
    request: Request,
  ) {
    return this.ordersService.getCustomerOrderHistory(
      this.readCustomerSessionCookie(
        request,
      ),
    );
  }

  @Get(":orderNumber/pdf")
  async downloadOrderPdf(
    @Req()
    request: Request,

    @Param("orderNumber")
    orderNumber: string,

    @Res()
    response: Response,
  ) {
    const bytes =
      await this.ordersService.generateCustomerOrderPdf(
        this.readCustomerSessionCookie(
          request,
        ),
        orderNumber,
      );

    const safeOrderNumber =
      String(
        orderNumber,
      ).replace(
        /[^A-Za-z0-9_-]/g,
        "_",
      );

    response.setHeader(
      "Content-Type",
      "application/pdf",
    );

    response.setHeader(
      "Content-Disposition",
      `attachment; filename="celltro-order-${safeOrderNumber}.pdf"`,
    );

    response.setHeader(
      "Cache-Control",
      "private, no-store",
    );

    response.end(
      Buffer.from(
        bytes,
      ),
    );
  }

  @Get(":orderNumber")
  getOrder(
    @Req()
    request: Request,

    @Param("orderNumber")
    orderNumber: string,
  ) {
    return this.ordersService.getOrder(
      this.readCustomerSessionCookie(
        request,
      ),
      orderNumber,
    );
  }

  @Patch(":orderNumber/reschedule")
  reschedule(
    @Req()
    request: Request,

    @Param("orderNumber")
    orderNumber: string,

    @Body()
    body: any,
  ) {
    return this.ordersService.rescheduleOrder(
      this.readCustomerSessionCookie(
        request,
      ),
      orderNumber,
      body,
    );
  }

  @Patch(":orderNumber/cancel")
  cancel(
    @Req()
    request: Request,

    @Param("orderNumber")
    orderNumber: string,

    @Body()
    body: {
      reasonCode?: string;
      reasonText?: string;
    },
  ) {
    return this.ordersService.cancelOrder(
      this.readCustomerSessionCookie(
        request,
      ),
      orderNumber,
      body,
    );
  }
}
