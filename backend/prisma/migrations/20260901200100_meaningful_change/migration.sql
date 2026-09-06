/*
  Warnings:

  - A unique constraint covering the columns `[categoryId,brandId,slug]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Product_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Product_categoryId_brandId_slug_key" ON "Product"("categoryId", "brandId", "slug");
