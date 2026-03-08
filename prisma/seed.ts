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

  // Default currencies
  const currencies = [
    { code: "GEL", name: "Georgian Lari", symbol: "GEL", exchangeRate: 1, isBase: true },
    { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 2.7, isBase: false },
    { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 2.9, isBase: false },
    { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: 3.4, isBase: false },
  ];
  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  // Default settings
  await prisma.setting.upsert({
    where: { key: "currency" },
    update: {},
    create: { key: "currency", value: "GEL" },
  });

  console.log("Seed complete: admin/admin123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
