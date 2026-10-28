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

type SeedResource = {
  id: string;
  owner: string; // owner email
  name: string;
  category: "WORKSHOP_TOOL" | "LAB_INSTRUMENT" | "BOOKABLE_SPACE";
  location: string;
  description: string;
  conditionAtListing: string;
  status?: "ACTIVE" | "MAINTENANCE";
  allowedRoles?: ("STUDENT" | "OWNER" | "MANAGER" | "ADMIN")[];
  allowedDepartments?: string[];
  requiresVerified?: boolean;
  requiresSafetyTraining?: boolean;
  requiresEligibilityGrant?: boolean;
  requiresSupervision?: boolean;
  depositAmount?: number;
  maxBookingHours: number;
  maxConcurrentBookings?: number;
  expectedReturnCondition: string;
  hours: [startHour: number, endHour: number];
  days: number[]; // 0 = Sunday
};

const weekdays = [1, 2, 3, 4, 5];

const resources: SeedResource[] = [
  {
    id: "seed-res-3d-printer",
    owner: "owner2@demo.edu",
    name: "Prusa i3 MK4 3D Printer",
    category: "WORKSHOP_TOOL",
    location: "Mechanical Workshop, Block B",
    description: "FDM 3D printer for PLA/PETG prototypes. Bring your own sliced G-code; filament is provided for the first 100 g.",
    conditionAtListing: "Excellent, nozzle replaced Oct 2026",
    requiresVerified: true,
    maxBookingHours: 6,
    expectedReturnCondition: "Bed cleaned, no filament left loaded",
    hours: [9, 17],
    days: weekdays,
  },
  {
    id: "seed-res-soldering",
    owner: "owner1@demo.edu",
    name: "Soldering Station (Hakko FX-888D)",
    category: "WORKSHOP_TOOL",
    location: "Electronics Lab, Block C, Room 204",
    description: "Temperature-controlled soldering station with fume extractor. Suitable for through-hole and SMD work.",
    conditionAtListing: "Good, tip replaced Sept 2026",
    requiresSafetyTraining: true,
    maxBookingHours: 4,
    maxConcurrentBookings: 2,
    expectedReturnCondition: "Switched off, tip tinned, bench wiped",
    hours: [10, 18],
    days: weekdays,
  },
  {
    id: "seed-res-laser-cutter",
    owner: "owner2@demo.edu",
    name: "CO2 Laser Cutter (60 W)",
    category: "WORKSHOP_TOOL",
    location: "Fabrication Lab, Block B",
    description: "Cuts and engraves acrylic, plywood and card up to 600 x 400 mm. Requires the laser-cutter induction.",
    conditionAtListing: "Excellent, lens cleaned Oct 2026",
    requiresVerified: true,
    requiresSafetyTraining: true,
    requiresEligibilityGrant: true,
    requiresSupervision: true,
    depositAmount: 500,
    maxBookingHours: 3,
    expectedReturnCondition: "Bed cleared of offcuts, exhaust run for 2 minutes",
    hours: [10, 16],
    days: [1, 3, 5],
  },
  {
    id: "seed-res-oscilloscope",
    owner: "owner1@demo.edu",
    name: "Keysight 100 MHz Oscilloscope",
    category: "LAB_INSTRUMENT",
    location: "Electronics Lab, Block C, Room 204",
    description: "4-channel digital oscilloscope with probes and a serial-decode license. Ideal for embedded and signal projects.",
    conditionAtListing: "Excellent, calibrated Sept 2026",
    allowedDepartments: ["Electronics & Communication", "Electrical", "Computer Science"],
    requiresVerified: true,
    depositAmount: 1000,
    maxBookingHours: 4,
    expectedReturnCondition: "Probes coiled, settings reset to default",
    hours: [9, 17],
    days: weekdays,
  },
  {
    id: "seed-res-spectrum",
    owner: "owner1@demo.edu",
    name: "Spectrum Analyzer (9 kHz–3 GHz)",
    category: "LAB_INSTRUMENT",
    location: "RF Lab, Block C, Room 210",
    description: "Benchtop spectrum analyzer for RF and EMI measurements. Currently being recalibrated.",
    conditionAtListing: "Under recalibration",
    status: "MAINTENANCE",
    requiresVerified: true,
    requiresSupervision: true,
    maxBookingHours: 3,
    expectedReturnCondition: "Cables removed, input attenuation reset",
    hours: [11, 16],
    days: [2, 4],
  },
  {
    id: "seed-res-project-lab",
    owner: "owner2@demo.edu",
    name: "Project Lab 2 (12 seats)",
    category: "BOOKABLE_SPACE",
    location: "Block B, Room 112",
    description: "Group project room with whiteboards, a 55-inch display and power at every desk. Great for team sprints.",
    conditionAtListing: "Clean and tidy",
    maxBookingHours: 3,
    maxConcurrentBookings: 2,
    expectedReturnCondition: "Chairs reset, whiteboards wiped, lights off",
    hours: [8, 20],
    days: [1, 2, 3, 4, 5, 6],
  },
  {
    id: "seed-res-av-kit",
    owner: "owner1@demo.edu",
    name: "Camera & AV Kit",
    category: "BOOKABLE_SPACE",
    location: "Media Room, Block A",
    description: "Mirrorless camera, tripod, two lav mics and a portable light. Booked as a kit for demo videos and events.",
    conditionAtListing: "Good, minor scuff on tripod case",
    requiresVerified: true,
    depositAmount: 2000,
    maxBookingHours: 24,
    expectedReturnCondition: "All items packed in the case, batteries charged",
    hours: [9, 17],
    days: weekdays,
  },
];

async function seedResources() {
  const owners = new Map(
    (await db.user.findMany({ where: { role: "OWNER" }, select: { id: true, email: true } })).map(
      (u) => [u.email, u.id],
    ),
  );

  for (const r of resources) {
    const ownerId = owners.get(r.owner);
    if (!ownerId) throw new Error(`Owner ${r.owner} not found`);

    const data = {
      name: r.name,
      category: r.category,
      ownerId,
      description: r.description,
      location: r.location,
      conditionAtListing: r.conditionAtListing,
      status: r.status ?? "ACTIVE",
      allowedRoles: r.allowedRoles ?? ["STUDENT", "OWNER"],
      allowedDepartments: r.allowedDepartments ?? [],
      requiresVerified: r.requiresVerified ?? false,
      requiresSafetyTraining: r.requiresSafetyTraining ?? false,
      requiresEligibilityGrant: r.requiresEligibilityGrant ?? false,
      requiresSupervision: r.requiresSupervision ?? false,
      depositRequired: r.depositAmount !== undefined,
      depositAmount: r.depositAmount ?? null,
      maxBookingHours: r.maxBookingHours,
      maxConcurrentBookings: r.maxConcurrentBookings ?? 1,
      expectedReturnCondition: r.expectedReturnCondition,
    } as const;

    await db.resource.upsert({
      where: { id: r.id },
      create: { id: r.id, ...data },
      update: data,
    });
    await db.availabilitySlot.deleteMany({ where: { resourceId: r.id } });
    await db.availabilitySlot.createMany({
      data: r.days.map((dayOfWeek) => ({
        resourceId: r.id,
        dayOfWeek,
        startMinute: r.hours[0] * 60,
        endMinute: r.hours[1] * 60,
      })),
    });
  }

  // student1 has completed the laser-cutter induction (a per-resource eligibility grant).
  const student = await db.user.findUnique({ where: { email: "student1@demo.edu" } });
  const grantedBy = owners.get("owner2@demo.edu");
  if (student && grantedBy) {
    await db.eligibilityGrant.upsert({
      where: { userId_resourceId: { userId: student.id, resourceId: "seed-res-laser-cutter" } },
      create: {
        userId: student.id,
        resourceId: "seed-res-laser-cutter",
        grantedById: grantedBy,
        note: "Completed laser-cutter induction",
      },
      update: {},
    });
  }
  console.log(`Seeded ${resources.length} demo resources`);
}

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
  await seedResources();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
