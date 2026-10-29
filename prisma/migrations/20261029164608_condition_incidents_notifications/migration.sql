-- CreateEnum
CREATE TYPE "ConditionRating" AS ENUM ('GOOD', 'MINOR_ISSUES', 'DAMAGED');

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "actorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "overdueFlaggedAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ConditionReport" ADD COLUMN     "condition" "ConditionRating" NOT NULL DEFAULT 'GOOD';

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "photos" TEXT[],
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT,
ADD COLUMN     "suspensionDays" INTEGER;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'info';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "ConditionPhoto" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConditionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- AddForeignKey
ALTER TABLE "ConditionPhoto" ADD CONSTRAINT "ConditionPhoto_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
