import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientIp, handle, parseBody } from "@/lib/api";
import { ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  clearKey,
  isBlocked,
  recordHit,
} from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export const POST = handle(async (req: Request) => {
  const { email, password } = await parseBody(req, loginSchema);

  // Repeated failures for the same email from the same address lock that pair out for a while.
  const key = `login:${clientIp(req)}|${email}`;
  const lock = isBlocked(key, LOGIN_MAX_FAILURES);
  if (lock.blocked) {
    throw new ApiError(
      429,
      `Too many failed sign-in attempts. Try again in ${Math.ceil(lock.retryAfterSec / 60)} minute(s).`,
      { "Retry-After": String(lock.retryAfterSec) },
    );
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    const failures = recordHit(key, LOGIN_WINDOW_MS);
    await audit({
      actorId: user?.id ?? null,
      action: "user.login_failed",
      targetType: "User",
      targetId: user?.id ?? "unknown",
      metadata: { knownAccount: Boolean(user) },
    });
    if (failures === LOGIN_MAX_FAILURES) {
      await audit({
        actorId: user?.id ?? null,
        action: "user.login_throttled",
        targetType: "User",
        targetId: user?.id ?? "unknown",
      });
    }
    throw new ApiError(401, "Incorrect email or password");
  }

  clearKey(key);
  await audit({ actorId: user.id, action: "user.logged_in", targetType: "User", targetId: user.id });
  await createSession({ userId: user.id, role: user.role });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
