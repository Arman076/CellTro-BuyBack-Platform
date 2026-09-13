-- CreateEnum
CREATE TYPE "QuestionnaireIssueSeverity" AS ENUM ('NORMAL', 'SEVERE');

-- AlterTable
ALTER TABLE "QuestionnaireOption" ADD COLUMN     "agentRejectAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "applicabilityScope" "QuestionnaireRuleScope" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN     "applicabilityTargetId" INTEGER,
ADD COLUMN     "severity" "QuestionnaireIssueSeverity" NOT NULL DEFAULT 'NORMAL';

-- CreateTable
CREATE TABLE "QuestionnaireQuotePolicy" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "scope" "QuestionnaireRuleScope" NOT NULL DEFAULT 'GLOBAL',
    "productId" INTEGER,
    "normalMinQuotePercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "severeMinQuotePercent" DECIMAL(5,2) NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireQuotePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireQuotePolicy_key_key" ON "QuestionnaireQuotePolicy"("key");

-- CreateIndex
CREATE INDEX "QuestionnaireQuotePolicy_scope_idx" ON "QuestionnaireQuotePolicy"("scope");

-- CreateIndex
CREATE INDEX "QuestionnaireQuotePolicy_productId_idx" ON "QuestionnaireQuotePolicy"("productId");

-- CreateIndex
CREATE INDEX "QuestionnaireQuotePolicy_isActive_idx" ON "QuestionnaireQuotePolicy"("isActive");

-- CreateIndex
CREATE INDEX "QuestionnaireOption_applicabilityScope_applicabilityTargetI_idx" ON "QuestionnaireOption"("applicabilityScope", "applicabilityTargetId");
