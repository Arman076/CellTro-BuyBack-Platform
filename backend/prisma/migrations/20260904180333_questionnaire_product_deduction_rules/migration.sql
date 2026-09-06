-- CreateTable
CREATE TABLE "QuestionnaireDeductionRule" (
    "id" SERIAL NOT NULL,
    "optionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "deductionPercent" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireDeductionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionnaireDeductionRule_productId_idx" ON "QuestionnaireDeductionRule"("productId");

-- CreateIndex
CREATE INDEX "QuestionnaireDeductionRule_optionId_idx" ON "QuestionnaireDeductionRule"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireDeductionRule_optionId_productId_key" ON "QuestionnaireDeductionRule"("optionId", "productId");

-- AddForeignKey
ALTER TABLE "QuestionnaireDeductionRule" ADD CONSTRAINT "QuestionnaireDeductionRule_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuestionnaireOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireDeductionRule" ADD CONSTRAINT "QuestionnaireDeductionRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
