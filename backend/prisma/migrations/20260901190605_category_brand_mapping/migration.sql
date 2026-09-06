/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Brand` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,ram,storage]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_categoryId_fkey";

-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "categoryId";

-- CreateTable
CREATE TABLE "CategoryBrand" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryBrand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryBrand_categoryId_brandId_key" ON "CategoryBrand"("categoryId", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_ram_storage_key" ON "ProductVariant"("productId", "ram", "storage");

-- AddForeignKey
ALTER TABLE "CategoryBrand" ADD CONSTRAINT "CategoryBrand_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryBrand" ADD CONSTRAINT "CategoryBrand_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
