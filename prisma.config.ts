import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// `prisma generate` only builds the client and never connects, so it must work during
// `npm install` on a fresh checkout (e.g. a Vercel build) before any database URL exists.
// Every command that does touch the database (migrate, db seed) still requires DATABASE_URL.
const generating = process.argv.includes("generate");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: generating
      ? (process.env.DATABASE_URL ?? "postgresql://unused:unused@localhost:5432/unused")
      : env("DATABASE_URL"),
  },
});
