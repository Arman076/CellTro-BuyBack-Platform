import { Module } from "@nestjs/common";

import {
  SuperAdminDashboardController,
} from "./super-admin-dashboard.controller.js";

import {
  SuperAdminDashboardService,
} from "./super-admin-dashboard.service.js";

import {
  SuperAdminOrdersController,
} from "./super-admin-orders.controller.js";

import {
  SuperAdminOrdersService,
} from "./super-admin-orders.service.js";

import {
  SuperAdminEnquiriesController,
} from "./super-admin-enquiries.controller.js";

import {
  SuperAdminEnquiriesService,
} from "./super-admin-enquiries.service.js";

import {
  SuperAdminCustomersController,
} from "./super-admin-customers.controller.js";

import {
  SuperAdminCustomersService,
} from "./super-admin-customers.service.js";

@Module({
  controllers: [
    SuperAdminDashboardController,
    SuperAdminOrdersController,
    SuperAdminEnquiriesController,
    SuperAdminCustomersController,
  ],

  providers: [
    SuperAdminDashboardService,
    SuperAdminOrdersService,
    SuperAdminEnquiriesService,
    SuperAdminCustomersService,
  ],
})
export class SuperAdminModule {}