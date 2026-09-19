import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  AdminConfigGuard,
} from "./admin-config.guard.js";

import {
  FlowConfigService,
} from "./flow-config.service.js";

@Controller("admin/flow-config")
@UseGuards(AdminConfigGuard)
export class FlowConfigController {
  constructor(
    private readonly service:
      FlowConfigService,
  ) {}

  @Get("pincode-lookup")
  lookupPincode(
    @Query("pincode")
    pincode: string,
  ) {
    return this.service.lookupPincode(
      pincode,
    );
  }

  @Get("pincodes")
  listPincodes() {
    return this.service.listPincodes();
  }

  @Post("pincodes")
  addPincode(
    @Body()
    body: {
      pincode?: string;
    },
  ) {
    return this.service.addPincode(
      body?.pincode,
    );
  }

  @Patch("pincodes/:id")
  setPincodeStatus(
    @Param("id")
    id: string,

    @Body()
    body: {
      isActive?: boolean;
    },
  ) {
    return this.service.setPincodeStatus(
      id,
      body?.isActive,
    );
  }

  @Get("cancellation-reasons")
  listCancellationReasons(
    @Query("audience")
    audience: string,
  ) {
    return this.service.listCancellationReasons(
      audience,
    );
  }

  @Post("cancellation-reasons")
  addCancellationReason(
    @Body()
    body: any,
  ) {
    return this.service.addCancellationReason(
      body,
    );
  }

  @Patch("cancellation-reasons/:id")
  updateCancellationReason(
    @Param("id")
    id: string,

    @Body()
    body: any,
  ) {
    return this.service.updateCancellationReason(
      id,
      body,
    );
  }

  @Get("feedback-options")
  listFeedbackOptions() {
    return this.service.listFeedbackOptions();
  }

  @Post("feedback-options")
  addFeedbackOption(
    @Body()
    body: any,
  ) {
    return this.service.addFeedbackOption(
      body,
    );
  }

  @Patch("feedback-options/:id")
  updateFeedbackOption(
    @Param("id")
    id: string,

    @Body()
    body: any,
  ) {
    return this.service.updateFeedbackOption(
      id,
      body,
    );
  }
}
