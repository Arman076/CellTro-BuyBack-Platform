-- AlterTable
ALTER TABLE "EnquirySession" ADD COLUMN     "identityVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "EnquirySession_identityVerifiedAt_idx" ON "EnquirySession"("identityVerifiedAt");
