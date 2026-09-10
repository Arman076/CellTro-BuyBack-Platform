import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const audiences = [
    { code: 'CUSTOMER', name: 'Customer', displayOrder: 1 },
    { code: 'AGENT', name: 'Agent', displayOrder: 2 },
    { code: 'VENDOR', name: 'Vendor', displayOrder: 3 },
  ];

  for (const audience of audiences) {
    await prisma.questionnaireAudience.upsert({
      where: { code: audience.code },
      update: {
        name: audience.name,
        displayOrder: audience.displayOrder,
        isActive: true,
      },
      create: {
        code: audience.code,
        name: audience.name,
        displayOrder: audience.displayOrder,
        isActive: true,
      },
    });
  }

  /*
   * Existing section codes are intentionally preserved.
   * OTHER_PROBLEMS is only renamed for display, so old relations remain valid.
   */
  const sections = [
    {
      code: 'SCREEN',
      name: 'Screen Condition',
      displayOrder: 1,
      calculationMode: 'MAX' as const,
    },
    {
      code: 'BODY',
      name: 'Body Condition',
      displayOrder: 2,
      calculationMode: 'MAX' as const,
    },
    {
      code: 'OTHER_PROBLEMS',
      name: 'Functional Issues',
      displayOrder: 3,
      calculationMode: 'SUM' as const,
    },
    {
      code: 'ACCESSORIES',
      name: 'Accessories',
      displayOrder: 4,
      calculationMode: 'SUM' as const,
    },
    {
      code: 'DEVICE_AGE',
      name: 'Device Age',
      displayOrder: 5,
      calculationMode: 'SINGLE' as const,
    },
  ];

  for (const section of sections) {
    await prisma.questionnaireSection.upsert({
      where: { code: section.code },
      update: {
        name: section.name,
        displayOrder: section.displayOrder,
        calculationMode: section.calculationMode,
        isActive: true,
      },
      create: {
        code: section.code,
        name: section.name,
        displayOrder: section.displayOrder,
        calculationMode: section.calculationMode,
        isActive: true,
      },
    });
  }

  const capabilities = [
    { code: 'FACE_ID', name: 'Face ID', displayOrder: 1 },
    { code: 'FINGERPRINT', name: 'Fingerprint', displayOrder: 2 },
    { code: 'TOUCH_ID', name: 'Touch ID', displayOrder: 3 },
    { code: 'S_PEN', name: 'S Pen', displayOrder: 4 },
    { code: 'FOLDABLE', name: 'Foldable / Hinge', displayOrder: 5 },
    { code: 'NFC', name: 'NFC', displayOrder: 6 },
    {
      code: 'WIRELESS_CHARGING',
      name: 'Wireless Charging',
      displayOrder: 7,
    },
  ];

  for (const capability of capabilities) {
    await prisma.deviceCapability.upsert({
      where: { code: capability.code },
      update: {
        name: capability.name,
        displayOrder: capability.displayOrder,
        isActive: true,
      },
      create: {
        code: capability.code,
        name: capability.name,
        displayOrder: capability.displayOrder,
        isActive: true,
      },
    });
  }

  /*
   * Preserve old option percentages in the new generic fields.
   */
  const legacyOptions = await prisma.questionnaireOption.findMany({
    select: {
      id: true,
      deductionPercent: true,
      deductionValue: true,
    },
  });

  for (const option of legacyOptions) {
    if (
      Number(option.deductionValue) === 0 &&
      Number(option.deductionPercent) !== 0
    ) {
      await prisma.questionnaireOption.update({
        where: { id: option.id },
        data: {
          deductionType: 'PERCENTAGE',
          deductionValue: option.deductionPercent,
          deductionTrigger: 'SELECTED',
        },
      });
    }
  }

  /*
   * Existing rules were product-specific percentage rules.
   * Convert their metadata without deleting or recreating them.
   */
  const legacyRules = await prisma.questionnaireDeductionRule.findMany({
    select: {
      id: true,
      productId: true,
      deductionPercent: true,
      deductionValue: true,
    },
  });

  for (const rule of legacyRules) {
    const oldPercent = Number(rule.deductionPercent ?? 0);

    await prisma.questionnaireDeductionRule.update({
      where: { id: rule.id },
      data: {
        scope: rule.productId ? 'PRODUCT' : 'GLOBAL',
        deductionType: 'PERCENTAGE',
        deductionValue:
          Number(rule.deductionValue) !== 0
            ? rule.deductionValue
            : oldPercent,
        isActive: true,
      },
    });
  }

  console.log(
    'Questionnaire V2 master data and legacy deduction backfill completed successfully.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
