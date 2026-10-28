import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export const POST = handle(async (req: Request) => {
  const { email, password } = await parseBody(req, loginSchema);

  const user = await db.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, "Incorrect email or password");

  await createSession({ userId: user.id, role: user.role });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
