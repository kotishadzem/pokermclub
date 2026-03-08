-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "chipBreakdown" JSONB;

-- AlterTable
ALTER TABLE "ExpenseType" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;
