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
    {
      code: 'CUSTOMER',
      name: 'Customer',
      displayOrder: 1,
    },
    {
      code: 'AGENT',
      name: 'Agent',
      displayOrder: 2,
    },
    {
      code: 'VENDOR',
      name: 'Vendor',
      displayOrder: 3,
    },
  ];

  for (const audience of audiences) {
    await prisma.questionnaireAudience.upsert({
      where: {
        code: audience.code,
      },
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

  const sections = [
    {
      code: 'ACCESSORIES',
      name: 'Accessories',
      displayOrder: 1,
    },
    {
      code: 'SCREEN',
      name: 'Screen Condition',
      displayOrder: 2,
    },
    {
      code: 'BODY',
      name: 'Body Condition',
      displayOrder: 3,
    },
    {
      code: 'OTHER_PROBLEMS',
      name: 'Other Problems',
      displayOrder: 4,
    },
    {
      code: 'DEVICE_AGE',
      name: 'Device Age',
      displayOrder: 5,
    },
  ];

  for (const section of sections) {
    await prisma.questionnaireSection.upsert({
      where: {
        code: section.code,
      },
      update: {
        name: section.name,
        displayOrder: section.displayOrder,
        isActive: true,
      },
      create: {
        code: section.code,
        name: section.name,
        displayOrder: section.displayOrder,
        isActive: true,
      },
    });
  }

  console.log('Questionnaire master data seeded successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });