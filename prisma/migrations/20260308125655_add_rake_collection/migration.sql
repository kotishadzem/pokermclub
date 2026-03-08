-- CreateTable
CREATE TABLE "RakeCollection" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RakeCollection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RakeCollection" ADD CONSTRAINT "RakeCollection_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RakeCollection" ADD CONSTRAINT "RakeCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
