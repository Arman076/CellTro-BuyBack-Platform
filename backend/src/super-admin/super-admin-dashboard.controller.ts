import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import {
  SuperAdminDashboardService,
} from './super-admin-dashboard.service.js';

@Controller('super-admin')
export class SuperAdminDashboardController {
  constructor(
    private readonly dashboardService:
      SuperAdminDashboardService,
  ) {}

  @Get('ping')
  ping() {
    return {
      ok: true,
      module: 'super-admin',
      message: 'Super Admin API is working',
    };
  }

  @Get('dashboard')
  getDashboard(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getDashboard(
      {
        from,
        to,
      },
    );
  }
}