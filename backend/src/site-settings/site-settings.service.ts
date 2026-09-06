import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma/prisma.service.js';
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto.js';

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateSettings() {
    const existing = await this.prisma.siteSetting.findFirst({
      orderBy: {
        id: 'asc',
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.siteSetting.create({
      data: {
        companyName: 'CELLTRO',
        tagline: 'Sell Smart. Sell Easy.',
      },
    });
  }

  async getPublicSettings() {
    const settings = await this.getOrCreateSettings();

    return {
      companyName: settings.companyName,
      tagline: settings.tagline,

      supportPhone: settings.supportPhone,
      whatsappNumber: settings.whatsappNumber,
      supportEmail: settings.supportEmail,
      businessEmail: settings.businessEmail,

      officeAddress: settings.officeAddress,
      city: settings.city,
      state: settings.state,
      pincode: settings.pincode,

      businessHours: settings.businessHours,

      facebookUrl: settings.facebookUrl,
      instagramUrl: settings.instagramUrl,
      linkedinUrl: settings.linkedinUrl,
      youtubeUrl: settings.youtubeUrl,
    };
  }

  async getAdminSettings() {
    return this.getOrCreateSettings();
  }

  async updateSettings(dto: UpdateSiteSettingDto) {
    const settings = await this.getOrCreateSettings();

    return this.prisma.siteSetting.update({
      where: {
        id: settings.id,
      },
      data: {
        ...dto,
      },
    });
  }
}