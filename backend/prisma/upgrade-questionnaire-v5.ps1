$ErrorActionPreference = "Stop"

$SchemaPath = "D:\First-react-app\backend\prisma\schema.prisma"

if (-not (Test-Path $SchemaPath)) {
  throw "Prisma schema not found: $SchemaPath"
}

$content = [System.IO.File]::ReadAllText($SchemaPath)
$content = $content.TrimStart([char]0xFEFF)

if ($content -notmatch 'enum\s+QuestionnaireCalculationMode\s*\{') {
  throw "QuestionnaireCalculationMode enum is missing. Install the earlier questionnaire migrations first."
}

if ($content -notmatch 'enum\s+QuestionnaireDeductionType\s*\{') {
  throw "QuestionnaireDeductionType enum is missing. Install the earlier questionnaire migrations first."
}

if ($content -notmatch 'enum\s+QuestionnaireRuleScope\s*\{') {
  throw "QuestionnaireRuleScope enum is missing. Install the earlier questionnaire migrations first."
}

if ($content -notmatch 'model\s+QuestionnaireAggregationPolicy\s*\{') {
  $model = @'

model QuestionnaireAggregationPolicy {
  id Int @id @default(autoincrement())

  key      String @unique
  level    String
  targetId Int

  scope     QuestionnaireRuleScope @default(GLOBAL)
  productId Int?

  calculationMode QuestionnaireCalculationMode
  capType         QuestionnaireDeductionType?
  capValue        Decimal? @db.Decimal(12, 2)

  isActive Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([level, targetId])
  @@index([scope, productId])
}
'@
  $content = $content.TrimEnd() + "`r`n" + $model + "`r`n"
}

[System.IO.File]::WriteAllText(
  $SchemaPath,
  $content,
  [System.Text.UTF8Encoding]::new($false)
)

Set-Location "D:\First-react-app\backend"

Write-Host "Formatting Prisma schema..." -ForegroundColor Cyan
npx prisma format
if ($LASTEXITCODE -ne 0) { throw "prisma format failed" }

Write-Host "Validating Prisma schema..." -ForegroundColor Cyan
npx prisma validate
if ($LASTEXITCODE -ne 0) { throw "prisma validate failed" }

Write-Host "Creating non-destructive V10 migration..." -ForegroundColor Cyan
npx prisma migrate dev --name questionnaire_section_aggregation_policy_v10_1
if ($LASTEXITCODE -ne 0) { throw "prisma migrate dev failed" }

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

Write-Host "V10.1 section aggregation-policy migration completed. No reset used." -ForegroundColor Green
