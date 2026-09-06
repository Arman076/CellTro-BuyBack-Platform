-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'CELLTRO',
    "tagline" TEXT DEFAULT 'Sell Smart. Sell Easy.',
    "supportPhone" TEXT,
    "whatsappNumber" TEXT,
    "supportEmail" TEXT,
    "businessEmail" TEXT,
    "officeAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "businessHours" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "linkedinUrl" TEXT,
    "youtubeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);
