-- CreateEnum
CREATE TYPE "QuestionnaireAnswerType" AS ENUM ('YES_NO', 'SINGLE_SELECT', 'MULTI_SELECT');

-- AlterTable
ALTER TABLE "VariantAttributeOption" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "QuestionnaireAudience" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireSection" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireItem" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerType" "QuestionnaireAnswerType" NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applyToAllProducts" BOOLEAN NOT NULL DEFAULT true,
    "sectionId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireOption" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "deductionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "itemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireItemAudience" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "audienceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireItemAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireItemProduct" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireItemProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireCondition" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "dependsOnOptionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireAudience_code_key" ON "QuestionnaireAudience"("code");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireSection_code_key" ON "QuestionnaireSection"("code");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireItem_code_key" ON "QuestionnaireItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireOption_itemId_value_key" ON "QuestionnaireOption"("itemId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireItemAudience_itemId_audienceId_key" ON "QuestionnaireItemAudience"("itemId", "audienceId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireItemProduct_itemId_productId_key" ON "QuestionnaireItemProduct"("itemId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireCondition_itemId_dependsOnOptionId_key" ON "QuestionnaireCondition"("itemId", "dependsOnOptionId");

-- AddForeignKey
ALTER TABLE "QuestionnaireItem" ADD CONSTRAINT "QuestionnaireItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "QuestionnaireSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireItem" ADD CONSTRAINT "QuestionnaireItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireOption" ADD CONSTRAINT "QuestionnaireOption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "QuestionnaireItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireItemAudience" ADD CONSTRAINT "QuestionnaireItemAudience_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "QuestionnaireItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireItemAudience" ADD CONSTRAINT "QuestionnaireItemAudience_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "QuestionnaireAudience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireItemProduct" ADD CONSTRAINT "QuestionnaireItemProduct_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "QuestionnaireItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireItemProduct" ADD CONSTRAINT "QuestionnaireItemProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireCondition" ADD CONSTRAINT "QuestionnaireCondition_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "QuestionnaireItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireCondition" ADD CONSTRAINT "QuestionnaireCondition_dependsOnOptionId_fkey" FOREIGN KEY ("dependsOnOptionId") REFERENCES "QuestionnaireOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
