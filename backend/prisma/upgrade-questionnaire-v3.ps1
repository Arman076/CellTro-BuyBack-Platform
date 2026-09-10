$ErrorActionPreference = "Stop"

$SchemaPath = "D:\First-react-app\backend\prisma\schema.prisma"
$BackupPath = "D:\First-react-app\backend\prisma\schema.before-questionnaire-v3.prisma"

if (!(Test-Path $SchemaPath)) {
  throw "schema.prisma not found at $SchemaPath"
}

Copy-Item $SchemaPath $BackupPath -Force
Write-Host "Backup created: $BackupPath" -ForegroundColor Green

$content = Get-Content $SchemaPath -Raw

# 1) Add child selection enum once.
if ($content -notmatch 'enum\s+QuestionnaireChildSelectionMode') {
  $marker = 'enum QuestionnaireAnswerType {'
  $enum = @'
enum QuestionnaireChildSelectionMode {
  SINGLE
  MULTI
}

'@
  $content = $content.Replace($marker, $enum + $marker)
}

# 2) Add branch fields to QuestionnaireOption once.
if ($content -notmatch 'parentOptionId\s+Int\?') {
  $pattern = '(model QuestionnaireOption \{[\s\S]*?)(\r?\n\s*displayOrder\s+Int)'
  $insert = @'

  // Branching / sub-option configuration
  parentOptionId Int?
  parentOption   QuestionnaireOption?  @relation("QuestionnaireOptionChildren", fields: [parentOptionId], references: [id], onDelete: Cascade)
  childOptions   QuestionnaireOption[] @relation("QuestionnaireOptionChildren")

  showChildOptions      Boolean @default(false)
  childPrompt           String?
  requireChildSelection Boolean @default(false)
  minChildSelections    Int     @default(0)
  maxChildSelections    Int?
  childSelectionMode    QuestionnaireChildSelectionMode @default(MULTI)

'@
  $content = [regex]::Replace(
    $content,
    $pattern,
    ('$1' + $insert + '$2'),
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

# 3) Add parent index once.
if ($content -notmatch '@@index\(\[parentOptionId\]\)') {
  $pattern = '(model QuestionnaireOption \{[\s\S]*?@@unique\(\[itemId,\s*value\]\))'
  $replacement = '$1' + "`r`n  @@index([parentOptionId])"
  $content = [regex]::Replace(
    $content,
    $pattern,
    $replacement,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

Set-Content $SchemaPath $content -Encoding UTF8
Write-Host "Questionnaire V3 schema fields added." -ForegroundColor Green

Set-Location "D:\First-react-app\backend"

npx prisma format
npx prisma validate

Write-Host ""
Write-Host "Schema validated. Now creating migration..." -ForegroundColor Cyan
npx prisma migrate dev --name questionnaire_branch_options_v3
npx prisma generate

Write-Host ""
Write-Host "V3 schema upgrade completed. NO database reset was used." -ForegroundColor Green
