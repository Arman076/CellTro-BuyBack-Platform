import {
  Module,
} from '@nestjs/common';

import {
  SuperAdminDashboardController,
} from './super-admin-dashboard.controller.js';

import {
  SuperAdminDashboardService,
} from './super-admin-dashboard.service.js';

@Module({
  controllers: [
    SuperAdminDashboardController,
  ],

  providers: [
    SuperAdminDashboardService,
  ],
})
export class SuperAdminModule {}