import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, publicUserSelect } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { signupSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  const data = await parseBody(req, signupSchema);

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 10),
      department: data.department,
      role: data.role,
    },
    select: publicUserSelect,
  });

  await audit({
    actorId: user.id,
    action: "user.signed_up",
    targetType: "User",
    targetId: user.id,
    metadata: { role: user.role },
  });
  await createSession({ userId: user.id, role: user.role });

  return NextResponse.json({ user }, { status: 201 });
});
