import { z } from "zod";

export const DEPARTMENTS = [
  "Computer Science",
  "Electronics & Communication",
  "Mechanical",
  "Electrical",
  "Civil",
  "Chemical",
  "Lab Administration",
] as const;

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));
const name = z.string().trim().min(2, "Name is too short").max(80);
const department = z.string().trim().min(2, "Pick a department").max(80);

export const signupSchema = z.object({
  name,
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  department,
  // Only these roles can be self-selected; Manager/Admin are assigned by an Admin.
  role: z.enum(["STUDENT", "OWNER"]).default("STUDENT"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const profileSchema = z.object({ name, department });

export const verificationSchema = z
  .object({ verified: z.boolean(), safetyTrained: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const roleSchema = z.object({
  role: z.enum(["STUDENT", "OWNER", "MANAGER", "ADMIN"]),
});

export const eligibilitySchema = z.object({
  userId: z.string().min(1),
  resourceId: z.string().min(1),
  note: z.string().trim().max(200).optional(),
});

export const CATEGORIES = ["WORKSHOP_TOOL", "LAB_INSTRUMENT", "BOOKABLE_SPACE"] as const;
export const RESOURCE_STATUSES = ["ACTIVE", "MAINTENANCE", "RETIRED"] as const;

const slotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((s) => s.endMinute > s.startMinute, "Slot must end after it starts");

const blackoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  reason: z.string().trim().max(200).optional(),
});

export const resourceSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(100),
    category: z.enum(CATEGORIES),
    description: z.string().trim().min(10, "Describe the resource in a few words").max(2000),
    location: z.string().trim().min(2, "Enter a location").max(120),
    photos: z.array(z.url()).max(6).default([]),
    conditionAtListing: z.string().trim().max(500).optional(),
    status: z.enum(RESOURCE_STATUSES).default("ACTIVE"),

    allowedRoles: z.array(z.enum(["STUDENT", "OWNER", "MANAGER", "ADMIN"])).default([]),
    allowedDepartments: z.array(z.string().trim().min(1)).default([]),
    requiresVerified: z.boolean().default(false),
    requiresSafetyTraining: z.boolean().default(false),
    requiresEligibilityGrant: z.boolean().default(false),
    requiresSupervision: z.boolean().default(false),
    depositRequired: z.boolean().default(false),
    depositAmount: z.number().int().min(1).max(1_000_000).optional(),

    maxBookingHours: z.number().int().min(1).max(168).default(4),
    maxConcurrentBookings: z.number().int().min(1).max(50).default(1),
    expectedReturnCondition: z.string().trim().min(2).max(300),

    slots: z.array(slotSchema).max(50).default([]),
    blackouts: z.array(blackoutSchema).max(100).default([]),
  })
  .refine((r) => !r.depositRequired || r.depositAmount, {
    path: ["depositAmount"],
    message: "Enter the deposit amount",
  });

export type ResourceInput = z.infer<typeof resourceSchema>;

export const MIN_PURPOSE_LENGTH = 10;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Invalid date");
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

// A draft may be saved with a short purpose; submitting enforces the minimum.
export const bookingUpdateSchema = z.object({
  startDate: dateString,
  startTime: timeString,
  endDate: dateString,
  endTime: timeString,
  purpose: z.string().trim().max(500).default(""),
});

export const decisionSchema = z
  .object({
    action: z.enum(["approve", "reject", "waitlist", "cancel"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(
    (d) => !["reject", "cancel"].includes(d.action) || (d.reason?.length ?? 0) >= 5,
    { path: ["reason"], message: "Give a reason (at least 5 characters) so the requester knows why" },
  );

export const bookingCreateSchema =bookingUpdateSchema.extend({
  resourceId: z.string().min(1),
});
