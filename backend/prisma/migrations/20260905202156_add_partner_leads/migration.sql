-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('BUYBACK_VENDOR', 'PICKUP_PARTNER', 'BUSINESS_PARTNER');

-- CreateEnum
CREATE TYPE "PartnerLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PartnerLead" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "businessName" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "partnerType" "PartnerType" NOT NULL,
    "city" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "businessAddress" TEXT,
    "gstNumber" TEXT,
    "message" TEXT,
    "status" "PartnerLeadStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerLead_status_idx" ON "PartnerLead"("status");

-- CreateIndex
CREATE INDEX "PartnerLead_partnerType_idx" ON "PartnerLead"("partnerType");

-- CreateIndex
CREATE INDEX "PartnerLead_mobile_idx" ON "PartnerLead"("mobile");

-- CreateIndex
CREATE INDEX "PartnerLead_pincode_idx" ON "PartnerLead"("pincode");

-- CreateIndex
CREATE INDEX "PartnerLead_createdAt_idx" ON "PartnerLead"("createdAt");
