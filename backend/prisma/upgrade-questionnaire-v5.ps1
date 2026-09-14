$ErrorActionPreference = "Stop"

$SchemaPath = "D:\First-react-app\backend\prisma\schema.prisma"
$BackendPath = "D:\First-react-app\backend"

if (-not (Test-Path $SchemaPath)) {
  throw "Prisma schema not found: $SchemaPath"
}

$content = [System.IO.File]::ReadAllText($SchemaPath)
$content = $content.TrimStart([char]0xFEFF)

if ($content -match 'model\s+SellOrder\s*\{') {
  Write-Host "Checkout/order models already exist. Skipping schema append." -ForegroundColor Yellow
}
else {
$models = @'

// ============================================================
// CELLTRO CHECKOUT / PICKUP / ORDER TRACKING V1
// ============================================================

enum CustomerAddressType {
  HOME
  OFFICE
  OTHER
}

enum PayoutMethod {
  CASH
  UPI
}

enum SellOrderStatus {
  PICKUP_REQUESTED
  PICKUP_CONFIRMED
  PICKUP_STARTED
  INSPECTION_COMPLETED
  PAYMENT_COMPLETED
  COMPLETED
  CANCELLED
}

model Customer {
  id    Int    @id @default(autoincrement())
  phone String @unique
  addresses CustomerAddress[]
  orders    SellOrder[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([phone])
}

model CustomerAddress {
  id Int @id @default(autoincrement())
  customerId Int
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  fullName String
  house    String
  street   String
  locality String
  landmark String?
  pincode  String
  city     String
  state    String
  type     CustomerAddressType
  isActive Boolean @default(true)
  orderSnapshots OrderAddressSnapshot[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([customerId])
  @@index([pincode])
  @@index([isActive])
}

model PickupSlotTemplate {
  id Int @id @default(autoincrement())
  code      String @unique
  label     String
  startTime String
  endTime   String
  displayOrder Int     @default(0)
  isActive     Boolean @default(true)
  orders SellOrder[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([isActive, displayOrder])
}

model SellOrder {
  id          String @id @default(cuid())
  orderNumber String @unique
  customerId Int
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Restrict)
  productId Int
  variantId Int
  productName  String
  productImage String?
  variantLabel String
  basePrice      Decimal @db.Decimal(12, 2)
  totalDeduction Decimal @db.Decimal(12, 2)
  finalPrice     Decimal @db.Decimal(12, 2)
  questionnaireSnapshot Json?
  status SellOrderStatus @default(PICKUP_REQUESTED)
  pickupDate   DateTime @db.Date
  pickupSlotId Int
  pickupSlot   PickupSlotTemplate @relation(fields: [pickupSlotId], references: [id], onDelete: Restrict)
  payoutMethod    PayoutMethod
  payoutUpiMobile String?
  addressSnapshot OrderAddressSnapshot?
  statusHistory   OrderStatusHistory[]
  reschedules     OrderRescheduleHistory[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([customerId])
  @@index([orderNumber])
  @@index([status])
  @@index([pickupDate])
  @@index([pickupSlotId])
  @@index([createdAt])
}

model OrderAddressSnapshot {
  id Int @id @default(autoincrement())
  orderId String @unique
  order   SellOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  sourceAddressId Int?
  sourceAddress   CustomerAddress? @relation(fields: [sourceAddressId], references: [id], onDelete: SetNull)
  fullName String
  phone    String
  house    String
  street   String
  locality String
  landmark String?
  pincode  String
  city     String
  state    String
  type     CustomerAddressType
  createdAt DateTime @default(now())
  @@index([sourceAddressId])
  @@index([pincode])
}

model OrderStatusHistory {
  id Int @id @default(autoincrement())
  orderId String
  order   SellOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status SellOrderStatus
  note   String?
  createdAt DateTime @default(now())
  @@index([orderId, createdAt])
  @@index([status])
}

model OrderRescheduleHistory {
  id Int @id @default(autoincrement())
  orderId String
  order   SellOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  oldPickupDate DateTime @db.Date
  newPickupDate DateTime @db.Date
  oldSlotLabel String
  newSlotLabel String
  createdAt DateTime @default(now())
  @@index([orderId, createdAt])
}
'@

  $content = $content.TrimEnd() + "`r`n" + $models + "`r`n"

  [System.IO.File]::WriteAllText(
    $SchemaPath,
    $content,
    [System.Text.UTF8Encoding]::new($false)
  )
}

Set-Location $BackendPath

Write-Host "Formatting Prisma schema..." -ForegroundColor Cyan
npx prisma format
if ($LASTEXITCODE -ne 0) { throw "prisma format failed" }

Write-Host "Validating Prisma schema..." -ForegroundColor Cyan
npx prisma validate
if ($LASTEXITCODE -ne 0) { throw "prisma validate failed" }

Write-Host "Creating NON-DESTRUCTIVE checkout/order migration..." -ForegroundColor Cyan
npx prisma migrate dev --name checkout_orders_tracking_v1
if ($LASTEXITCODE -ne 0) { throw "prisma migrate dev failed" }

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

Write-Host "Checkout/order schema V1 installed. No reset used." -ForegroundColor Green
