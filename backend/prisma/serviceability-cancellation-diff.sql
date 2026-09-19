-- CreateTable
CREATE TABLE "ServiceablePincode" (
    "id" SERIAL NOT NULL,
    "pincode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceablePincode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationReasonMaster" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "audience" "CancellationActor" NOT NULL,
    "requiresFreeText" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationReasonMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceablePincode_pincode_key" ON "ServiceablePincode"("pincode");

-- CreateIndex
CREATE INDEX "ServiceablePincode_isActive_idx" ON "ServiceablePincode"("isActive");

-- CreateIndex
CREATE INDEX "ServiceablePincode_updatedAt_idx" ON "ServiceablePincode"("updatedAt");

-- CreateIndex
CREATE INDEX "CancellationReasonMaster_audience_isActive_displayOrder_idx" ON "CancellationReasonMaster"("audience", "isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationReasonMaster_audience_code_key" ON "CancellationReasonMaster"("audience", "code");
