import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserForLogin, touchLastLogin } from "@/lib/store";
import {
  createSessionCookieValue,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";
import { passwordFingerprint } from "@/lib/staffAuth";
import {
  checkLoginAllowed,
  clearLoginFailures,
  normalizeEmail,
  recordLoginFailure,
} from "@/lib/loginThrottle";

export const dynamic = "force-dynamic";

// A real bcrypt hash of a random string. When the email doesn't exist we still
// run one bcrypt comparison against it, so "unknown email" and "wrong
// password" take the same time and can't be told apart by timing.
const DUMMY_HASH =
  "$2a$10$1Oh1a.5Y45GLFz47uCxQkO8Fveu56YzFrLNWDaJAriiEFLfALLR76";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "Email and password are required",
          status: 400,
        },
      },
      { status: 400 },
    );
  }

  const key = normalizeEmail(email);
  const ip = clientIp(req);

  const verdict = await checkLoginAllowed(key, ip);
  if (!verdict.allowed) {
    const minutes = Math.max(1, Math.ceil(verdict.retryAfterSec / 60));
    return NextResponse.json(
      {
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message: `Too many failed login attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          status: 429,
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(verdict.retryAfterSec) },
      },
    );
  }

  const user = await findUserForLogin(email);
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !user.passwordHash || !ok) {
    await recordLoginFailure(key, ip);
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect.",
          status: 401,
        },
      },
      { status: 401 },
    );
  }

  await clearLoginFailures(key, ip);
  await touchLastLogin(user.id);
  // merchant/admin/cashier are all scoped to exactly one cafe — only
  // super_admin and customer sessions carry no cafeId.
  const isCafeScopedRole =
    user.role === "merchant" ||
    user.role === "admin" ||
    user.role === "cashier";
  const sessionUser = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    ...(isCafeScopedRole && user.cafeId ? { cafeId: user.cafeId } : {}),
  };

  let cookieValue: string;
  try {
    cookieValue = await createSessionCookieValue({
      ...sessionUser,
      pv: passwordFingerprint(user.passwordHash),
    });
  } catch (e) {
    console.error("Cannot create a session:", e);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_MISCONFIGURED",
          message:
            "Login is unavailable: the server has no SESSION_SECRET configured. Contact the site owner.",
          status: 500,
        },
      },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ user: sessionUser });
  res.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
