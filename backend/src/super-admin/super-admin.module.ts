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
import {
  SuperAdminVendorsController,
} from "./vendors/super-admin-vendors.controller.js";
import {
  SuperAdminVendorsService,
} from "./vendors/super-admin-vendors.service.js";

import {
  SuperAdminVendorApplicationsController,
} from "./vendor-applications/super-admin-vendor-applications.controller.js";

import {
  SuperAdminVendorApplicationsService,
} from "./vendor-applications/super-admin-vendor-applications.service.js";

import {
  VendorEmailService,
} from "../vendor-security/vendor-email.service.js";

import { SuperAdminRoutingController } from "./routing/super-admin-routing.controller.js";
import { SuperAdminRoutingService } from "./routing/super-admin-routing.service.js";

@Module({
  controllers: [
    SuperAdminDashboardController,
    SuperAdminOrdersController,
    SuperAdminEnquiriesController,
    SuperAdminCustomersController,
    SuperAdminVendorsController,
    SuperAdminVendorApplicationsController,
    SuperAdminRoutingController,
  ],

  providers: [
    SuperAdminDashboardService,
    SuperAdminOrdersService,
    SuperAdminEnquiriesService,
    SuperAdminCustomersService,
    SuperAdminVendorsService,
    SuperAdminVendorApplicationsService,
    SuperAdminRoutingService,
    VendorEmailService,
  ],
})
export class SuperAdminModule {}