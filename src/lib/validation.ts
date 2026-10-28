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
