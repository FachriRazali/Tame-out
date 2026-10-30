import { query } from "@/lib/db";

// Brute-force protection for POST /api/auth/login.
//
// Only FAILED attempts are recorded. A login is refused (HTTP 429) while, in
// the last 15 minutes, there were
//   - 5 or more failures for the same email from the same IP address, or
//   - 20 or more failures from the same IP address (any email), or
//   - 15 or more failures for the same email (from anywhere — a distributed guess)
// The email-only limit is deliberately higher than the pair limit, so a
// stranger who keeps typing a wrong password for someone's email can't easily
// lock that person out from their own device.
//
// Attempts live in the login_attempts table (database/migrations/
// 2026-10-30-login-attempts.sql). Until that table exists the same rules run
// from an in-memory list instead — weaker on serverless (every instance has
// its own memory) but never breaks login.
const WINDOW_MS = 15 * 60_000;
const MAX_PER_PAIR = 5;
const MAX_PER_IP = 20;
const MAX_PER_EMAIL = 15;

export interface ThrottleVerdict {
  allowed: boolean;
  retryAfterSec: number;
}

// ---- in-memory fallback ---------------------------------------------------
const memory: { email: string; ip: string; at: number }[] = [];

function memoryVerdict(email: string, ip: string): ThrottleVerdict {
  const cutoff = Date.now() - WINDOW_MS;
  while (memory.length && memory[0].at < cutoff) memory.shift();
  const pair = memory.filter((m) => m.email === email && m.ip === ip);
  const byIp = memory.filter((m) => m.ip === ip);
  const byEmail = memory.filter((m) => m.email === email);
  return verdict(pair, byIp, byEmail);
}

function verdict(
  pair: { at: number }[],
  byIp: { at: number }[],
  byEmail: { at: number }[],
): ThrottleVerdict {
  const blockedUntil: number[] = [];
  const check = (list: { at: number }[], max: number) => {
    if (list.length >= max) {
      const sorted = [...list].sort((a, b) => a.at - b.at);
      // The block lifts when enough old failures have aged out of the window.
      blockedUntil.push(sorted[list.length - max].at + WINDOW_MS);
    }
  };
  check(pair, MAX_PER_PAIR);
  check(byIp, MAX_PER_IP);
  check(byEmail, MAX_PER_EMAIL);
  if (blockedUntil.length === 0) return { allowed: true, retryAfterSec: 0 };
  return {
    allowed: false,
    retryAfterSec: Math.max(
      1,
      Math.ceil((Math.max(...blockedUntil) - Date.now()) / 1000),
    ),
  };
}

function isMissingTable(err: any): boolean {
  return err?.code === "42P01";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function checkLoginAllowed(
  email: string,
  ip: string,
): Promise<ThrottleVerdict> {
  try {
    const rows = await query<{ email: string; ip: string; at: string }>(
      `SELECT email, ip, extract(epoch from created_at) * 1000 AS at
       FROM login_attempts
       WHERE created_at > now() - interval '15 minutes' AND (email = $1 OR ip = $2)`,
      [email, ip],
    );
    const parsed = rows.map((r) => ({
      email: r.email,
      ip: r.ip,
      at: Number(r.at),
    }));
    return verdict(
      parsed.filter((r) => r.email === email && r.ip === ip),
      parsed.filter((r) => r.ip === ip),
      parsed.filter((r) => r.email === email),
    );
  } catch (err) {
    if (isMissingTable(err)) return memoryVerdict(email, ip);
    // Never lock everyone out because the throttle itself failed.
    console.error("login throttle check failed", err);
    return memoryVerdict(email, ip);
  }
}

export async function recordLoginFailure(
  email: string,
  ip: string,
): Promise<void> {
  memory.push({ email, ip, at: Date.now() });
  try {
    await query(`INSERT INTO login_attempts (email, ip) VALUES ($1, $2)`, [
      email,
      ip,
    ]);
    // Housekeeping: old rows are useless after the window.
    await query(
      `DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'`,
    );
  } catch (err) {
    if (!isMissingTable(err))
      console.error("login throttle record failed", err);
  }
}

// A successful login forgives that email+IP pair's earlier typos.
export async function clearLoginFailures(
  email: string,
  ip: string,
): Promise<void> {
  for (let i = memory.length - 1; i >= 0; i--)
    if (memory[i].email === email && memory[i].ip === ip) memory.splice(i, 1);
  try {
    await query(`DELETE FROM login_attempts WHERE email = $1 AND ip = $2`, [
      email,
      ip,
    ]);
  } catch (err) {
    if (!isMissingTable(err)) console.error("login throttle clear failed", err);
  }
}
