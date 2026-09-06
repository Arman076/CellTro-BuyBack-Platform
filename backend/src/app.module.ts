import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { PrismaModule } from './prisma/prisma.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { BrandsModule } from './brands/brands.module.js';
import { ProductsModule } from './products/products.module.js';
import { ProductSeriesModule } from './product-series/product-series.module.js';
import { VariantsModule } from './variants/variants.module.js';
import { VariantAttributesModule } from './variant-attributes/variant-attributes.module.js';
import { CatalogueImportModule } from './catalogue-import/catalogue-import.module.js';
import { QuestionnaireModule } from './questionnaire/questionnaire.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { SiteSettingsModule } from './site-settings/site-settings.module.js';
import { TermsSectionsModule } from './terms-sections/terms-sections.module.js';
import { PartnerLeadsModule } from './partner-leads/partner-leads.module.js';
import { ContactLeadsModule } from './contact-leads/contact-leads.module.js';
@Module({
  imports: [
    PrismaModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    ProductSeriesModule,
    VariantsModule,
    VariantAttributesModule,
    CatalogueImportModule,
    QuestionnaireModule,
    DashboardModule,
    UploadsModule,
    SiteSettingsModule,
    TermsSectionsModule,
    PartnerLeadsModule,
    ContactLeadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}