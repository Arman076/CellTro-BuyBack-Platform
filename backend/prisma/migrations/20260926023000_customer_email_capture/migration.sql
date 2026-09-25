-- CELLTRO: Safe additive email migration
-- Does NOT drop/reset any existing table or data.

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "normalizedEmail" TEXT;

ALTER TABLE "CustomerAddress"
  ADD COLUMN IF NOT EXISTS "email" TEXT;

ALTER TABLE "OrderAddressSnapshot"
  ADD COLUMN IF NOT EXISTS "email" TEXT;

CREATE INDEX IF NOT EXISTS "Customer_normalizedEmail_idx"
  ON "Customer"("normalizedEmail");
