import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Fictional demo accounts: 2–3 per role so judges can log in as any role.
// These credentials are listed in the README / project document.
const PASSWORD = "Demo@1234";

const users: Omit<Prisma.UserCreateInput, "passwordHash">[] = [
  { name: "Aarav Sharma", email: "student1@demo.edu", role: "STUDENT", department: "Computer Science", verified: true, safetyTrained: true },
  { name: "Diya Patel", email: "student2@demo.edu", role: "STUDENT", department: "Mechanical", verified: true },
  { name: "Kabir Singh", email: "student3@demo.edu", role: "STUDENT", department: "Electronics & Communication" },
  { name: "Dr. Meera Nair", email: "owner1@demo.edu", role: "OWNER", department: "Electronics & Communication", verified: true, safetyTrained: true },
  { name: "Rohan Iyer", email: "owner2@demo.edu", role: "OWNER", department: "Mechanical", verified: true, safetyTrained: true },
  { name: "Prof. Anita Desai", email: "manager1@demo.edu", role: "MANAGER", department: "Lab Administration", verified: true, safetyTrained: true },
  { name: "Prof. Vikram Rao", email: "manager2@demo.edu", role: "MANAGER", department: "Lab Administration", verified: true, safetyTrained: true },
  { name: "Platform Admin", email: "admin@demo.edu", role: "ADMIN", department: "Lab Administration", verified: true, safetyTrained: true },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const user of users) {
    await db.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash },
      update: { ...user, passwordHash },
    });
  }
  console.log(`Seeded ${users.length} demo users (password: ${PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
