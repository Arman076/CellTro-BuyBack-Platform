-- CreateEnum
CREATE TYPE "QuestionnaireDeductionType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "QuestionnaireDeductionTrigger" AS ENUM ('SELECTED', 'MISSING');

-- CreateEnum
CREATE TYPE "QuestionnaireCalculationMode" AS ENUM ('MAX', 'SUM', 'SINGLE');

-- CreateEnum
CREATE TYPE "QuestionnaireRuleScope" AS ENUM ('GLOBAL', 'CATEGORY', 'BRAND', 'SERIES', 'PRODUCT', 'VARIANT');

-- DropIndex
DROP INDEX "QuestionnaireDeductionRule_optionId_productId_key";

-- AlterTable
ALTER TABLE "QuestionnaireDeductionRule" ADD COLUMN     "brandId" INTEGER,
ADD COLUMN     "categoryId" INTEGER,
ADD COLUMN     "deductionType" "QuestionnaireDeductionType" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "deductionValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scope" "QuestionnaireRuleScope" NOT NULL DEFAULT 'PRODUCT',
ADD COLUMN     "seriesId" INTEGER,
ADD COLUMN     "variantId" INTEGER,
ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "deductionPercent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "QuestionnaireOption" ADD COLUMN     "deductionTrigger" "QuestionnaireDeductionTrigger" NOT NULL DEFAULT 'SELECTED',
ADD COLUMN     "deductionType" "QuestionnaireDeductionType" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "deductionValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "issueCode" TEXT;

-- AlterTable
ALTER TABLE "QuestionnaireSection" ADD COLUMN     "calculationMode" "QuestionnaireCalculationMode" NOT NULL DEFAULT 'SUM';

-- CreateTable
CREATE TABLE "DeviceCapability" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCapability" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "capabilityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireOptionCapability" (
    "id" SERIAL NOT NULL,
    "optionId" INTEGER NOT NULL,
    "capabilityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireOptionCapability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCapability_code_key" ON "DeviceCapability"("code");

-- CreateIndex
CREATE INDEX "ProductCapability_productId_idx" ON "ProductCapability"("productId");

-- CreateIndex
CREATE INDEX "ProductCapability_capabilityId_idx" ON "ProductCapability"("capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCapability_productId_capabilityId_key" ON "ProductCapability"("productId", "capabilityId");

-- CreateIndex
CREATE INDEX "QuestionnaireOptionCapability_optionId_idx" ON "QuestionnaireOptionCapability"("optionId");

-- CreateIndex
CREATE INDEX "QuestionnaireOptionCapability_capabilityId_idx" ON "QuestionnaireOptionCapability"("capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireOptionCapability_optionId_capabilityId_key" ON "QuestionnaireOptionCapability"("optionId", "capabilityId");

-- CreateIndex
CREATE INDEX "QuestionnaireDeductionRule_scope_idx" ON "QuestionnaireDeductionRule"("scope");

-- CreateIndex
CREATE INDEX "QuestionnaireDeductionRule_categoryId_idx" ON "QuestionnaireDeductionRule"("categoryId");

-- CreateIndex
CREATE INDEX "QuestionnaireDeductionRule_brandId_idx" ON "QuestionnaireDeductionRule"("brandId");

-- CreateIndex
CREATE INDEX "QuestionnaireDeductionRule_seriesId_idx" ON "QuestionnaireDeductionRule"("seriesId");

-- CreateIndex
CREATE INDEX "QuestionnaireDeductionRule_variantId_idx" ON "QuestionnaireDeductionRule"("variantId");

-- CreateIndex
CREATE INDEX "QuestionnaireDeductionRule_optionId_scope_isActive_idx" ON "QuestionnaireDeductionRule"("optionId", "scope", "isActive");

-- CreateIndex
CREATE INDEX "QuestionnaireOption_issueCode_idx" ON "QuestionnaireOption"("issueCode");

-- AddForeignKey
ALTER TABLE "QuestionnaireDeductionRule" ADD CONSTRAINT "QuestionnaireDeductionRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireDeductionRule" ADD CONSTRAINT "QuestionnaireDeductionRule_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireDeductionRule" ADD CONSTRAINT "QuestionnaireDeductionRule_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ProductSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireDeductionRule" ADD CONSTRAINT "QuestionnaireDeductionRule_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCapability" ADD CONSTRAINT "ProductCapability_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCapability" ADD CONSTRAINT "ProductCapability_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "DeviceCapability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireOptionCapability" ADD CONSTRAINT "QuestionnaireOptionCapability_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuestionnaireOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireOptionCapability" ADD CONSTRAINT "QuestionnaireOptionCapability_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "DeviceCapability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
