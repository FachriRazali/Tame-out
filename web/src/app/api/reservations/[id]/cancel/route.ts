import { NextRequest, NextResponse } from "next/server";
import { cancelReservation, getReservation } from "@/lib/store";
import { getVerifiedSession } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

function notFound() {
  // The same answer whether the reservation doesn't exist or isn't yours, so
  // ids can't be probed to find out which reservations exist.
  return NextResponse.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "Reservation not found",
        status: 404,
      },
    },
    { status: 404 },
  );
}

// POST /api/reservations/:id/cancel
//
// Allowed for exactly two kinds of caller:
//   1. staff of THE CAFE the reservation belongs to (cashier / merchant / admin), or the super admin;
//   2. the signed-in customer who made the reservation (the "My reservations" page).
// A guest has no account, so a guest asks the cafe's cashier to cancel.
// Everyone else gets a plain 404.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return notFound();
  const reservation = await getReservation(id);
  if (!reservation) return notFound();

  const user = await getVerifiedSession(req);

  let allowed = false;
  if (user) {
    if (user.role === "super_admin") allowed = true;
    else if (
      (user.role === "cashier" ||
        user.role === "merchant" ||
        user.role === "admin") &&
      user.cafeId === reservation.cafeId
    ) {
      allowed = true;
    } else if (reservation.userId != null && user.id === reservation.userId)
      allowed = true;
  }
  if (!allowed) return notFound();

  try {
    const cancelled = await cancelReservation(id);
    return NextResponse.json({ reservation: cancelled });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    if (message === "INVALID_STATE") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_STATE",
            message:
              "This reservation is already cancelled, completed or checked in, so it can't be cancelled.",
            status: 409,
          },
        },
        { status: 409 },
      );
    }
    if (message === "NOT_FOUND") return notFound();
    throw e;
  }
}
