import {
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service.js';
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto.js';

@Controller('site-settings')
export class SiteSettingsController {
  constructor(
    private readonly siteSettingsService: SiteSettingsService,
  ) {}

  @Get('public')
  getPublicSettings() {
    return this.siteSettingsService.getPublicSettings();
  }

  @Get()
  getAdminSettings() {
    return this.siteSettingsService.getAdminSettings();
  }

  @Patch()
  updateSettings(
    @Body() dto: UpdateSiteSettingDto,
  ) {
    return this.siteSettingsService.updateSettings(dto);
  }
}