-- CreateEnum
CREATE TYPE "OrderVendorAssignmentSource" AS ENUM ('AUTO', 'MANUAL', 'REROUTE');

-- CreateEnum
CREATE TYPE "OrderVendorAssignmentReason" AS ENUM ('PINCODE_PRIORITY', 'MANUAL_ADMIN', 'REROUTE');

-- CreateEnum
CREATE TYPE "OrderVendorUnassignmentReason" AS ENUM ('MANUAL', 'VENDOR_INACTIVE', 'VENDOR_SUSPENDED', 'SERVICE_AREA_REMOVED', 'REROUTED');

-- AlterTable
ALTER TABLE "SellOrder" ADD COLUMN     "currentVendorId" INTEGER;

-- CreateTable
CREATE TABLE "OrderVendorAssignment" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "source" "OrderVendorAssignmentSource" NOT NULL,
    "reason" "OrderVendorAssignmentReason" NOT NULL,
    "prioritySnapshot" INTEGER,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "unassignmentReason" "OrderVendorUnassignmentReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderVendorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderVendorAssignment_orderId_assignedAt_idx" ON "OrderVendorAssignment"("orderId", "assignedAt");

-- CreateIndex
CREATE INDEX "OrderVendorAssignment_vendorId_unassignedAt_assignedAt_idx" ON "OrderVendorAssignment"("vendorId", "unassignedAt", "assignedAt");

-- CreateIndex
CREATE INDEX "SellOrder_currentVendorId_status_createdAt_idx" ON "SellOrder"("currentVendorId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "SellOrder" ADD CONSTRAINT "SellOrder_currentVendorId_fkey" FOREIGN KEY ("currentVendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVendorAssignment" ADD CONSTRAINT "OrderVendorAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SellOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVendorAssignment" ADD CONSTRAINT "OrderVendorAssignment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
