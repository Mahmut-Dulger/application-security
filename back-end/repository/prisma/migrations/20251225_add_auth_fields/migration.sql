-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailVerificationToken" TEXT UNIQUE,
ADD COLUMN "emailVerificationTokenExp" TIMESTAMP(3),
ADD COLUMN "passwordResetToken" TEXT UNIQUE,
ADD COLUMN "passwordResetTokenExp" TIMESTAMP(3),
ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3),
ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mfaCode" TEXT,
ADD COLUMN "mfaCodeExp" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RememberMeToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RememberMeToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RememberMeToken_token_key" ON "RememberMeToken"("token");

-- AddForeignKey
ALTER TABLE "RememberMeToken" ADD CONSTRAINT "RememberMeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
