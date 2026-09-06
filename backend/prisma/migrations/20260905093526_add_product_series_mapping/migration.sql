-- CreateIndex
CREATE INDEX "Product_seriesId_idx" ON "Product"("seriesId");

-- CreateIndex
CREATE INDEX "ProductSeries_categoryId_idx" ON "ProductSeries"("categoryId");

-- CreateIndex
CREATE INDEX "ProductSeries_brandId_idx" ON "ProductSeries"("brandId");
