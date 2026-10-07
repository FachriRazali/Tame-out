import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Merchant/cashier/admin areas require a real login now (see /login) instead
// of the customer-page PIN toggle this replaced. Guest/customer browsing at
// "/" and "/cafe/*" stays open to everyone.
//
// merchant/admin/cashier are all-in-one staff roles now — any one of them can
// reach both the floor builder and the POS (see staffAuth.ts's ALL_STAFF_ROLES
// and the per-route role checks), so this gate stays permissive on all three;
// "merchant" is kept as a selectable role rather than removed, it's just no
// longer the only one that can open /merchant.
// super_admin is included on /merchant and /pos too, not just /admin — the
// global staff nav (GlobalStaffNav.tsx) links there for a super_admin
// session as well, defaulting to the platform's first cafe.
const RULES: {
  prefix: string;
  roles: Array<"super_admin" | "admin" | "merchant" | "cashier" | "customer">;
}[] = [
  {
    prefix: "/merchant",
    roles: ["merchant", "cashier", "admin", "super_admin"],
  },
  { prefix: "/pos", roles: ["cashier", "merchant", "admin", "super_admin"] },
  { prefix: "/admin", roles: ["super_admin"] },
];

export async function middleware(req: NextRequest) {
  const rule = RULES.find((r) => req.nextUrl.pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  const user = await getSession(req);
  if (!user || !rule.roles.includes(user.role)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/merchant/:path*", "/pos/:path*", "/admin/:path*"],
};
