-- CreateTable
CREATE TABLE "CustomerFeedbackOption" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "requiresFreeText" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFeedbackOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderFeedback" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "rating" INTEGER,
    "optionCode" TEXT,
    "optionLabelSnapshot" TEXT,
    "feedbackText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackOption_code_key" ON "CustomerFeedbackOption"("code");

-- CreateIndex
CREATE INDEX "CustomerFeedbackOption_isActive_displayOrder_idx" ON "CustomerFeedbackOption"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "OrderFeedback_orderId_key" ON "OrderFeedback"("orderId");

-- CreateIndex
CREATE INDEX "OrderFeedback_createdAt_idx" ON "OrderFeedback"("createdAt");

-- AddForeignKey
ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
