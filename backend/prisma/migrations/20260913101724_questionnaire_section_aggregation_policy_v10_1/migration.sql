-- CreateTable
CREATE TABLE "QuestionnaireAggregationPolicy" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "scope" "QuestionnaireRuleScope" NOT NULL DEFAULT 'GLOBAL',
    "productId" INTEGER,
    "calculationMode" "QuestionnaireCalculationMode" NOT NULL,
    "capType" "QuestionnaireDeductionType",
    "capValue" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireAggregationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireAggregationPolicy_key_key" ON "QuestionnaireAggregationPolicy"("key");

-- CreateIndex
CREATE INDEX "QuestionnaireAggregationPolicy_level_targetId_idx" ON "QuestionnaireAggregationPolicy"("level", "targetId");

-- CreateIndex
CREATE INDEX "QuestionnaireAggregationPolicy_scope_productId_idx" ON "QuestionnaireAggregationPolicy"("scope", "productId");
