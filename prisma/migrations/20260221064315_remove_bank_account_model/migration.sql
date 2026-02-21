/*
  Warnings:

  - You are about to drop the column `bankAccountId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the `BankAccount` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_bankAccountId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "bankAccountId";

-- DropTable
DROP TABLE "BankAccount";
