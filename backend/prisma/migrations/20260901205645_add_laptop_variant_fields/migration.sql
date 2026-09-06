/*
  Warnings:

  - A unique constraint covering the columns `[productId,processor,ram,storageType,storage]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ProductVariant_productId_ram_storage_key";

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "processor" TEXT,
ADD COLUMN     "storageType" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_processor_ram_storageType_storage_key" ON "ProductVariant"("productId", "processor", "ram", "storageType", "storage");
