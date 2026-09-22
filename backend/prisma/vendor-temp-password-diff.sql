-- AlterTable
ALTER TABLE "VendorUser" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temporaryPasswordExpiresAt" TIMESTAMP(3);
