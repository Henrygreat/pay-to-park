import { PrismaClient, PassType, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed tariffs
  const tariffs = [
    {
      passType: PassType.DAILY,
      name: "Daily Pass",
      priceAmount: 500, // £5.00 in pence
      currency: "gbp",
      durationMinutes: 24 * 60, // 24 hours
      isActive: true,
      isRecommended: false,
    },
    {
      passType: PassType.WEEKLY,
      name: "Weekly Pass",
      priceAmount: 2500, // £25.00 in pence
      currency: "gbp",
      durationMinutes: 7 * 24 * 60, // 7 days
      isActive: true,
      isRecommended: false,
    },
    {
      passType: PassType.MONTHLY,
      name: "Monthly Pass",
      priceAmount: 8000, // £80.00 in pence
      currency: "gbp",
      durationMinutes: 30 * 24 * 60, // 30 days
      isActive: true,
      isRecommended: true,
    },
  ];

  for (const tariff of tariffs) {
    await prisma.tariff.upsert({
      where: { passType: tariff.passType },
      update: tariff,
      create: tariff,
    });
    console.log(`Tariff created/updated: ${tariff.name} - £${tariff.priceAmount / 100}`);
  }

  // Seed default admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      role: AdminRole.ADMIN,
    },
  });
  console.log("Default admin user created: admin / admin123");

  // Seed enforcement user
  const enforcementPassword = await bcrypt.hash("enforce123", 12);
  await prisma.adminUser.upsert({
    where: { username: "enforcement" },
    update: {},
    create: {
      username: "enforcement",
      passwordHash: enforcementPassword,
      role: AdminRole.ENFORCEMENT,
    },
  });
  console.log("Default enforcement user created: enforcement / enforce123");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
