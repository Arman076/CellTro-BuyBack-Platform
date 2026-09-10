-- CreateEnum
CREATE TYPE "QuestionnaireChildSelectionMode" AS ENUM ('SINGLE', 'MULTI');

-- AlterTable
ALTER TABLE "QuestionnaireOption" ADD COLUMN     "childPrompt" TEXT,
ADD COLUMN     "childSelectionMode" "QuestionnaireChildSelectionMode" NOT NULL DEFAULT 'MULTI',
ADD COLUMN     "maxChildSelections" INTEGER,
ADD COLUMN     "minChildSelections" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentOptionId" INTEGER,
ADD COLUMN     "requireChildSelection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showChildOptions" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "QuestionnaireOption_parentOptionId_idx" ON "QuestionnaireOption"("parentOptionId");

-- AddForeignKey
ALTER TABLE "QuestionnaireOption" ADD CONSTRAINT "QuestionnaireOption_parentOptionId_fkey" FOREIGN KEY ("parentOptionId") REFERENCES "QuestionnaireOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
