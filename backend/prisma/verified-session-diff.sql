-- AlterTable
ALTER TABLE "EnquirySession" ADD COLUMN     "questionnaireSnapshot" JSONB,
ADD COLUMN     "verifiedSessionId" TEXT;

-- CreateTable
CREATE TABLE "CustomerVerifiedSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerVerifiedSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerVerifiedSession_tokenHash_key" ON "CustomerVerifiedSession"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerVerifiedSession_phone_expiresAt_idx" ON "CustomerVerifiedSession"("phone", "expiresAt");

-- CreateIndex
CREATE INDEX "CustomerVerifiedSession_expiresAt_revokedAt_idx" ON "CustomerVerifiedSession"("expiresAt", "revokedAt");

-- CreateIndex
CREATE INDEX "EnquirySession_verifiedSessionId_quoteViewedAt_idx" ON "EnquirySession"("verifiedSessionId", "quoteViewedAt");

-- AddForeignKey
ALTER TABLE "EnquirySession" ADD CONSTRAINT "EnquirySession_verifiedSessionId_fkey" FOREIGN KEY ("verifiedSessionId") REFERENCES "CustomerVerifiedSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
