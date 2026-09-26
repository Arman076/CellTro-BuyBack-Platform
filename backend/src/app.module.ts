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
import { OrdersModule } from "./orders/orders.module.js";
import { ServiceabilityModule } from "./serviceability/serviceability.module.js";
import {
  SuperAdminModule,
} from './super-admin/super-admin.module.js';
import { FlowConfigModule } from "./flow-config/flow-config.module.js";
import { VendorApplicationsModule } from './vendor-applications/vendor-applications.module.js';
import { VendorAuthModule } from './vendor-auth/vendor-auth.module.js';
import { VendorOrdersModule } from './vendor-orders/vendor-orders.module.js';
import { AgentAuthModule } from './agent-auth/agent-auth.module.js';
import { VendorAgentsModule } from './vendor-agents/vendor-agents.module.js';
import { AgentAccountModule } from './agent-account/agent-account.module.js';
import { AgentDashboardModule } from './agent-dashboard/agent-dashboard.module.js';
import {
  AgentOrdersModule,
} from './agent-orders/agent-orders.module.js';
import {
  AgentOrderVerificationModule,
} from './agent-order-verification/agent-order-verification.module.js';
import { AgentInspectionModule } from './agent-inspection/agent-inspection.module.js';

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
    OrdersModule,
    ServiceabilityModule,
    SuperAdminModule,
    FlowConfigModule,
    VendorApplicationsModule,
    VendorAuthModule,
    VendorOrdersModule,
    AgentAuthModule,
    VendorAgentsModule,
    AgentAccountModule,
    AgentDashboardModule,
    AgentOrdersModule,
    AgentOrderVerificationModule,
    AgentInspectionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}