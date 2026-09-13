-- AlterTable
ALTER TABLE "QuestionnaireQuotePolicy" ADD COLUMN     "normalMinQuoteType" "QuestionnaireDeductionType",
ADD COLUMN     "normalMinQuoteValue" DECIMAL(12,2),
ADD COLUMN     "severeMinQuoteType" "QuestionnaireDeductionType",
ADD COLUMN     "severeMinQuoteValue" DECIMAL(12,2);
