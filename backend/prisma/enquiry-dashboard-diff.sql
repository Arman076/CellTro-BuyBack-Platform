-- CreateEnum
CREATE TYPE "CancellationActor" AS ENUM ('CUSTOMER', 'AGENT', 'VENDOR', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "EnquirySession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "productId" INTEGER,
    "variantId" INTEGER,
    "questionnaireCompletedAt" TIMESTAMP(3),
    "otpSentAt" TIMESTAMP(3),
    "otpVerifiedAt" TIMESTAMP(3),
    "quoteViewedAt" TIMESTAMP(3),
    "quoteAmount" DECIMAL(12,2),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnquirySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderCancellation" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "actor" "CancellationActor" NOT NULL,
    "reasonCode" TEXT,
    "reasonText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnquirySession_sessionId_key" ON "EnquirySession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "EnquirySession_orderId_key" ON "EnquirySession"("orderId");

-- CreateIndex
CREATE INDEX "EnquirySession_phone_idx" ON "EnquirySession"("phone");

-- CreateIndex
CREATE INDEX "EnquirySession_questionnaireCompletedAt_idx" ON "EnquirySession"("questionnaireCompletedAt");

-- CreateIndex
CREATE INDEX "EnquirySession_otpVerifiedAt_idx" ON "EnquirySession"("otpVerifiedAt");

-- CreateIndex
CREATE INDEX "EnquirySession_quoteViewedAt_orderId_idx" ON "EnquirySession"("quoteViewedAt", "orderId");

-- CreateIndex
CREATE INDEX "EnquirySession_createdAt_idx" ON "EnquirySession"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCancellation_orderId_key" ON "OrderCancellation"("orderId");

-- CreateIndex
CREATE INDEX "OrderCancellation_createdAt_idx" ON "OrderCancellation"("createdAt");

-- CreateIndex
CREATE INDEX "OrderCancellation_actor_createdAt_idx" ON "OrderCancellation"("actor", "createdAt");

-- AddForeignKey
ALTER TABLE "EnquirySession" ADD CONSTRAINT "EnquirySession_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquirySession" ADD CONSTRAINT "EnquirySession_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquirySession" ADD CONSTRAINT "EnquirySession_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SellOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCancellation" ADD CONSTRAINT "OrderCancellation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
