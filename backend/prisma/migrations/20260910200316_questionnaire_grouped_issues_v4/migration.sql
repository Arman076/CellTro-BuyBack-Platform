-- AlterTable
ALTER TABLE "QuestionnaireOption" ADD COLUMN     "issueGroupId" INTEGER;

-- CreateTable
CREATE TABLE "QuestionnaireIssueGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentOptionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireIssueGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionnaireIssueGroup_parentOptionId_idx" ON "QuestionnaireIssueGroup"("parentOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireIssueGroup_parentOptionId_name_key" ON "QuestionnaireIssueGroup"("parentOptionId", "name");

-- CreateIndex
CREATE INDEX "QuestionnaireOption_issueGroupId_idx" ON "QuestionnaireOption"("issueGroupId");

-- AddForeignKey
ALTER TABLE "QuestionnaireOption" ADD CONSTRAINT "QuestionnaireOption_issueGroupId_fkey" FOREIGN KEY ("issueGroupId") REFERENCES "QuestionnaireIssueGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireIssueGroup" ADD CONSTRAINT "QuestionnaireIssueGroup_parentOptionId_fkey" FOREIGN KEY ("parentOptionId") REFERENCES "QuestionnaireOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
