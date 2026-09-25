-- CreateEnum
CREATE TYPE "OrderVerificationPurpose" AS ENUM ('INSPECTION_START', 'QUOTE_ACCEPT', 'QUOTE_REJECT');

-- CreateEnum
CREATE TYPE "OrderVerificationChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "OrderVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'LOCKED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('ORDER_CREATED', 'VENDOR_ASSIGNED', 'VENDOR_UNASSIGNED', 'AGENT_ASSIGNED', 'AGENT_UNASSIGNED', 'VERIFICATION_SENT', 'VERIFICATION_VERIFIED', 'INSPECTION_STARTED', 'INSPECTION_COMPLETED', 'QUOTE_GENERATED', 'CUSTOMER_ACCEPTED', 'CUSTOMER_REJECTED', 'PAYMENT_COMPLETED', 'ORDER_COMPLETED', 'ORDER_CANCELLED');

-- CreateEnum
CREATE TYPE "OrderEventActorType" AS ENUM ('SYSTEM', 'CUSTOMER', 'VENDOR', 'AGENT', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "OrderVerificationChallenge" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" "OrderVerificationPurpose" NOT NULL,
    "channel" "OrderVerificationChannel" NOT NULL,
    "otpHash" TEXT,
    "destinationMasked" TEXT NOT NULL,
    "destinationFingerprint" TEXT NOT NULL,
    "contextHash" TEXT,
    "status" "OrderVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderVerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" "OrderEventType" NOT NULL,
    "actorType" "OrderEventActorType" NOT NULL,
    "agentId" INTEGER,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderVerificationChallenge_orderId_purpose_status_createdAt_idx" ON "OrderVerificationChallenge"("orderId", "purpose", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderVerificationChallenge_expiresAt_status_idx" ON "OrderVerificationChallenge"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_idempotencyKey_key" ON "OrderEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_eventType_createdAt_idx" ON "OrderEvent"("orderId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "OrderEvent_agentId_createdAt_idx" ON "OrderEvent"("agentId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderVerificationChallenge" ADD CONSTRAINT "OrderVerificationChallenge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

