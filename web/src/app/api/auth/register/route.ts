import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { registerCustomer, touchLastLogin } from "@/lib/store";
import {
  createSessionCookieValue,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";
import { passwordFingerprint } from "@/lib/staffAuth";
import {
  checkLoginAllowed,
  normalizeEmail,
  recordLoginFailure,
} from "@/lib/loginThrottle";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt silently ignores everything past 72 bytes

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function fail(
  code: string,
  message: string,
  status: number,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    { error: { code, message, status } },
    { status, headers },
  );
}

// POST /api/auth/register   body: { fullName, email, password, whatsapp? }
//
// Creates a CUSTOMER account and signs it in. There is no way to pick a role
// here — staff accounts are only created by the super admin — so a sign-up can
// never produce a login that reaches the cashier, merchant or admin pages.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const whatsapp = String(body.whatsapp ?? "").trim();

  if (fullName.length < 2 || fullName.length > 80)
    return fail(
      "INVALID_NAME",
      "Please enter your full name (2–80 characters).",
      400,
    );
  if (email.length > 254 || !EMAIL_RE.test(email))
    return fail("INVALID_EMAIL", "Please enter a valid email address.", 400);
  if (password.length < MIN_PASSWORD)
    return fail(
      "WEAK_PASSWORD",
      `Password must be at least ${MIN_PASSWORD} characters.`,
      400,
    );
  if (Buffer.byteLength(password) > MAX_PASSWORD)
    return fail(
      "WEAK_PASSWORD",
      "Password is too long (max 72 characters).",
      400,
    );
  if (whatsapp && !/^\+?[0-9][0-9\s-]{6,18}$/.test(whatsapp)) {
    return fail(
      "INVALID_WHATSAPP",
      "WhatsApp number looks wrong. Use digits only, e.g. +62 812 3456 7890.",
      400,
    );
  }

  // Sign-up spam guard: at most 5 sign-up attempts per IP address per 15 minutes
  // (same limiter the login form uses, under its own per-IP key).
  const ip = clientIp(req);
  const key = `register:${ip}`;
  const verdict = await checkLoginAllowed(key, ip);
  if (!verdict.allowed) {
    const minutes = Math.max(1, Math.ceil(verdict.retryAfterSec / 60));
    return fail(
      "TOO_MANY_ATTEMPTS",
      `Too many sign-up attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      429,
      { "Retry-After": String(verdict.retryAfterSec) },
    );
  }
  await recordLoginFailure(key, ip);

  const passwordHash = await bcrypt.hash(password, 10);
  let created;
  try {
    created = await registerCustomer({
      fullName,
      email: normalizeEmail(email),
      passwordHash,
      whatsapp,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_TAKEN") {
      return fail(
        "EMAIL_TAKEN",
        "An account with this email already exists. Try signing in instead.",
        409,
      );
    }
    throw e;
  }
  await touchLastLogin(created.id);

  const sessionUser = {
    id: created.id,
    fullName: created.fullName,
    email: created.email,
    role: "customer" as const,
  };
  let cookieValue: string;
  try {
    cookieValue = await createSessionCookieValue({
      ...sessionUser,
      pv: passwordFingerprint(created.passwordHash),
    });
  } catch (e) {
    console.error("Cannot create a session:", e);
    // The account exists, it just can't be signed in automatically.
    return fail(
      "SERVER_MISCONFIGURED",
      "Your account was created, but sign-in is unavailable right now (the server has no SESSION_SECRET). Contact the site owner.",
      500,
    );
  }

  const res = NextResponse.json({ user: sessionUser }, { status: 201 });
  res.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
