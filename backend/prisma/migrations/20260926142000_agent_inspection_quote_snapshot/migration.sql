-- AlterTable
ALTER TABLE "AgentOrderInspection" ADD COLUMN     "quoteBasePrice" DECIMAL(12,2),
ADD COLUMN     "quoteFinalPrice" DECIMAL(12,2),
ADD COLUMN     "quoteGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "quoteHash" TEXT,
ADD COLUMN     "quoteRawDeduction" DECIMAL(12,2),
ADD COLUMN     "quoteSnapshot" JSONB,
ADD COLUMN     "quoteTotalDeduction" DECIMAL(12,2);

-- CreateIndex
CREATE UNIQUE INDEX "AgentOrderInspection_quoteHash_key" ON "AgentOrderInspection"("quoteHash");

-- CreateIndex
CREATE INDEX "AgentOrderInspection_vendorId_quoteGeneratedAt_idx" ON "AgentOrderInspection"("vendorId", "quoteGeneratedAt");

