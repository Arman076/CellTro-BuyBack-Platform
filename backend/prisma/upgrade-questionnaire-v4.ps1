$ErrorActionPreference = "Stop"

$SchemaPath = "D:\First-react-app\backend\prisma\schema.prisma"
$BackupPath = "D:\First-react-app\backend\prisma\schema.before-questionnaire-v4.prisma"

if (!(Test-Path $SchemaPath)) {
  throw "schema.prisma not found: $SchemaPath"
}

Copy-Item $SchemaPath $BackupPath -Force
Write-Host "Backup created: $BackupPath" -ForegroundColor Green

$content = [System.IO.File]::ReadAllText($SchemaPath)
$content = $content.TrimStart([char]0xFEFF)

# Add issueGroupId relation fields to QuestionnaireOption.
if ($content -notmatch '\bissueGroupId\s+Int\?') {
  $pattern = '(model QuestionnaireOption\s*\{[\s\S]*?childOptions\s+QuestionnaireOption\[\]\s+@relation\("QuestionnaireOptionChildren"\))'
  $insert = @'

  // Optional visual grouping for child issues (Physical Issues, Technical Issues, etc.)
  issueGroupId Int?
  issueGroup   QuestionnaireIssueGroup? @relation("QuestionnaireIssueGroupChildren", fields: [issueGroupId], references: [id], onDelete: SetNull)
  issueGroups  QuestionnaireIssueGroup[] @relation("QuestionnaireIssueGroupParent")
'@

  $next = [regex]::Replace(
    $content,
    $pattern,
    ('$1' + $insert),
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if ($next -eq $content) {
    throw "Could not locate QuestionnaireOption.childOptions. Confirm V3 migration exists."
  }

  $content = $next
}

# Add issueGroupId index.
if ($content -notmatch '@@index\(\[issueGroupId\]\)') {
  $pattern = '(model QuestionnaireOption\s*\{[\s\S]*?@@index\(\[parentOptionId\]\))'
  $next = [regex]::Replace(
    $content,
    $pattern,
    ('$1' + "`r`n  @@index([issueGroupId])"),
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if ($next -eq $content) {
    throw "Could not add issueGroupId index."
  }

  $content = $next
}

# Add QuestionnaireIssueGroup model before QuestionnaireItemAudience.
if ($content -notmatch 'model\s+QuestionnaireIssueGroup\s*\{') {
  $marker = 'model QuestionnaireItemAudience {'
  if (-not $content.Contains($marker)) {
    throw "Could not locate QuestionnaireItemAudience model."
  }

  $model = @'
model QuestionnaireIssueGroup {
  id           Int     @id @default(autoincrement())
  name         String
  displayOrder Int     @default(0)
  isActive     Boolean @default(true)

  parentOptionId Int
  parentOption   QuestionnaireOption @relation("QuestionnaireIssueGroupParent", fields: [parentOptionId], references: [id], onDelete: Cascade)

  childOptions QuestionnaireOption[] @relation("QuestionnaireIssueGroupChildren")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([parentOptionId])
  @@unique([parentOptionId, name])
}

'@

  $content = $content.Replace($marker, $model + $marker)
}

# Write UTF-8 WITHOUT BOM.
[System.IO.File]::WriteAllText(
  $SchemaPath,
  $content,
  [System.Text.UTF8Encoding]::new($false)
)

Set-Location "D:\First-react-app\backend"

Write-Host "Formatting and validating Prisma schema..." -ForegroundColor Cyan
npx prisma format
if ($LASTEXITCODE -ne 0) { throw "prisma format failed" }

npx prisma validate
if ($LASTEXITCODE -ne 0) { throw "prisma validate failed" }

Write-Host "Creating NON-DESTRUCTIVE V4 migration..." -ForegroundColor Cyan
npx prisma migrate dev --name questionnaire_grouped_issues_v4
if ($LASTEXITCODE -ne 0) { throw "prisma migrate dev failed" }

npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

Write-Host ""
Write-Host "Questionnaire V4 grouped issues installed successfully. NO reset used." -ForegroundColor Green
