-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" SERIAL NOT NULL,
    "vendorCode" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorServiceArea" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "serviceablePincodeId" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendorCode_key" ON "Vendor"("vendorCode");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE INDEX "Vendor_businessName_idx" ON "Vendor"("businessName");

-- CreateIndex
CREATE INDEX "Vendor_phone_idx" ON "Vendor"("phone");

-- CreateIndex
CREATE INDEX "Vendor_createdAt_idx" ON "Vendor"("createdAt");

-- CreateIndex
CREATE INDEX "VendorServiceArea_serviceablePincodeId_isActive_priority_idx" ON "VendorServiceArea"("serviceablePincodeId", "isActive", "priority");

-- CreateIndex
CREATE INDEX "VendorServiceArea_vendorId_isActive_idx" ON "VendorServiceArea"("vendorId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VendorServiceArea_vendorId_serviceablePincodeId_key" ON "VendorServiceArea"("vendorId", "serviceablePincodeId");

-- AddForeignKey
ALTER TABLE "VendorServiceArea" ADD CONSTRAINT "VendorServiceArea_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorServiceArea" ADD CONSTRAINT "VendorServiceArea_serviceablePincodeId_fkey" FOREIGN KEY ("serviceablePincodeId") REFERENCES "ServiceablePincode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
