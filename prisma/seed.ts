import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
      role: "ADMIN",
      name: "Administrator",
    },
  });

  // Create default player statuses
  const statuses = ["Regular", "VIP", "Premium", "Banned"];
  for (const name of statuses) {
    await prisma.playerStatus.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Create default game types
  const gameTypes = [
    { name: "No Limit Hold'em", description: "Texas Hold'em No Limit" },
    { name: "Pot Limit Omaha", description: "Omaha Pot Limit" },
    { name: "Mixed Game", description: "Rotating game types" },
  ];
  for (const gt of gameTypes) {
    await prisma.gameType.upsert({
      where: { name: gt.name },
      update: {},
      create: gt,
    });
  }

  console.log("Seed complete: admin/admin123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
