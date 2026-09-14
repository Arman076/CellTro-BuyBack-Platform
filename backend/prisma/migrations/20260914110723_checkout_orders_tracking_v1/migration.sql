-- CreateEnum
CREATE TYPE "CustomerAddressType" AS ENUM ('HOME', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('CASH', 'UPI');

-- CreateEnum
CREATE TYPE "SellOrderStatus" AS ENUM ('PICKUP_REQUESTED', 'PICKUP_CONFIRMED', 'PICKUP_STARTED', 'INSPECTION_COMPLETED', 'PAYMENT_COMPLETED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "house" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "landmark" TEXT,
    "pincode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "type" "CustomerAddressType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupSlotTemplate" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupSlotTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT,
    "variantLabel" TEXT NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "totalDeduction" DECIMAL(12,2) NOT NULL,
    "finalPrice" DECIMAL(12,2) NOT NULL,
    "questionnaireSnapshot" JSONB,
    "status" "SellOrderStatus" NOT NULL DEFAULT 'PICKUP_REQUESTED',
    "pickupDate" DATE NOT NULL,
    "pickupSlotId" INTEGER NOT NULL,
    "payoutMethod" "PayoutMethod" NOT NULL,
    "payoutUpiMobile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAddressSnapshot" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "sourceAddressId" INTEGER,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "house" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "landmark" TEXT,
    "pincode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "type" "CustomerAddressType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAddressSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "SellOrderStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderRescheduleHistory" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "oldPickupDate" DATE NOT NULL,
    "newPickupDate" DATE NOT NULL,
    "oldSlotLabel" TEXT NOT NULL,
    "newSlotLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRescheduleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "CustomerAddress_customerId_idx" ON "CustomerAddress"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAddress_pincode_idx" ON "CustomerAddress"("pincode");

-- CreateIndex
CREATE INDEX "CustomerAddress_isActive_idx" ON "CustomerAddress"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PickupSlotTemplate_code_key" ON "PickupSlotTemplate"("code");

-- CreateIndex
CREATE INDEX "PickupSlotTemplate_isActive_displayOrder_idx" ON "PickupSlotTemplate"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SellOrder_orderNumber_key" ON "SellOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "SellOrder_customerId_idx" ON "SellOrder"("customerId");

-- CreateIndex
CREATE INDEX "SellOrder_orderNumber_idx" ON "SellOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "SellOrder_status_idx" ON "SellOrder"("status");

-- CreateIndex
CREATE INDEX "SellOrder_pickupDate_idx" ON "SellOrder"("pickupDate");

-- CreateIndex
CREATE INDEX "SellOrder_pickupSlotId_idx" ON "SellOrder"("pickupSlotId");

-- CreateIndex
CREATE INDEX "SellOrder_createdAt_idx" ON "SellOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAddressSnapshot_orderId_key" ON "OrderAddressSnapshot"("orderId");

-- CreateIndex
CREATE INDEX "OrderAddressSnapshot_sourceAddressId_idx" ON "OrderAddressSnapshot"("sourceAddressId");

-- CreateIndex
CREATE INDEX "OrderAddressSnapshot_pincode_idx" ON "OrderAddressSnapshot"("pincode");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_status_idx" ON "OrderStatusHistory"("status");

-- CreateIndex
CREATE INDEX "OrderRescheduleHistory_orderId_createdAt_idx" ON "OrderRescheduleHistory"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellOrder" ADD CONSTRAINT "SellOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellOrder" ADD CONSTRAINT "SellOrder_pickupSlotId_fkey" FOREIGN KEY ("pickupSlotId") REFERENCES "PickupSlotTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAddressSnapshot" ADD CONSTRAINT "OrderAddressSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAddressSnapshot" ADD CONSTRAINT "OrderAddressSnapshot_sourceAddressId_fkey" FOREIGN KEY ("sourceAddressId") REFERENCES "CustomerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRescheduleHistory" ADD CONSTRAINT "OrderRescheduleHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
