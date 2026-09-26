-- CreateEnum
CREATE TYPE "AgentQuoteDecision" AS ENUM ('ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "AgentOrderInspection" ADD COLUMN     "quoteDecision" "AgentQuoteDecision",
ADD COLUMN     "quoteDecisionAt" TIMESTAMP(3),
ADD COLUMN     "quoteDecisionChallengeId" TEXT;

-- CreateIndex
CREATE INDEX "AgentOrderInspection_quoteDecision_quoteDecisionAt_idx" ON "AgentOrderInspection"("quoteDecision", "quoteDecisionAt");

-- CreateIndex
CREATE INDEX "AgentOrderInspection_quoteDecisionChallengeId_idx" ON "AgentOrderInspection"("quoteDecisionChallengeId");

