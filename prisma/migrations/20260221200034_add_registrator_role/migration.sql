-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'REGISTRATOR';

-- CreateTable
CREATE TABLE "RoomVisit" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOut" TIMESTAMP(3),

    CONSTRAINT "RoomVisit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoomVisit" ADD CONSTRAINT "RoomVisit_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomVisit" ADD CONSTRAINT "RoomVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
