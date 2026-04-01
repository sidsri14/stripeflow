-- AlterTable
ALTER TABLE "FailedPayment" ADD COLUMN "lockedAt" DATETIME;

-- CreateIndex
CREATE INDEX "FailedPayment_status_nextRetryAt_lockedAt_idx" ON "FailedPayment"("status", "nextRetryAt", "lockedAt");
