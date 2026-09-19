import {
  Module,
} from "@nestjs/common";

import {
  AdminConfigGuard,
} from "./admin-config.guard.js";

import {
  FlowConfigController,
} from "./flow-config.controller.js";

import {
  FlowConfigService,
} from "./flow-config.service.js";

@Module({
  controllers: [
    FlowConfigController,
  ],

  providers: [
    AdminConfigGuard,
    FlowConfigService,
  ],
})
export class FlowConfigModule {}
