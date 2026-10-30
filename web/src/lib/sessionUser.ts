// One shared "who is signed in?" request. Several components on the same page
// (header chip, staff shortcut, reservation form, menu editor…) each need the
// answer; calling this instead of fetch("/api/auth/me") makes everything that
// asks at the same moment share ONE network call. Nothing is cached once the
// call finishes, so a login/logout is always reflected on the next ask.
export interface SessionUser {
  id: number;
  fullName: string;
  email: string;
  role: "super_admin" | "admin" | "merchant" | "cashier" | "customer";
  cafeId?: number;
}

let inflight: Promise<SessionUser | null> | null = null;

export function fetchSessionUser(): Promise<SessionUser | null> {
  if (!inflight) {
    inflight = fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => (d?.user ?? null) as SessionUser | null)
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
