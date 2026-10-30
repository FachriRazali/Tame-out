import { NextRequest, NextResponse } from "next/server";
import {
  clearMenuDocument,
  getMenuDocument,
  setMenuDocument,
} from "@/lib/store";
import { assertCafeMatch, requireStaffSession } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// The menu PDF / photo is stored INSIDE the database as a base64 data: URL
// (cafes.menu_document_url, a TEXT column). This app runs on Vercel, whose
// serverless filesystem is read-only, so the old "write the file to
// ./uploads" approach failed there with a 500. Vercel also caps a request
// body at ~4.5MB, so a document is limited to ~3MB here (images are
// downscaled in the browser first, see src/lib/readImage.ts).
const DATA_URL =
  /^data:(application\/pdf|image\/png|image\/jpeg|image\/webp);base64,([A-Za-z0-9+/=]+)$/;
const MAX_DATA_URL_CHARS = 4_300_000; // ~3.2MB of file bytes

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message, status } }, { status });
}

// GET — public. Streams the stored document so <iframe>/<img> can show it.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const doc = await getMenuDocument(Number(params.id));
  if (!doc) return fail(404, "NOT_FOUND", "No menu document.");
  const match = DATA_URL.exec(doc.url);
  if (!match) {
    // Legacy value (an http(s) link, or an old /api/uploads/... path).
    return NextResponse.redirect(new URL(doc.url, _req.url));
  }
  return new NextResponse(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-cache",
    },
  });
}

// POST { documentUrl: "data:...;base64,..." } (or multipart "file", kept for
// older clients) — cafe staff of THIS cafe, or super admin.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const gate = await requireStaffSession(req, {
    roles: ["cashier", "merchant", "admin"],
  });
  if (gate instanceof NextResponse) return gate;
  const cafeId = Number(params.id);
  const denied = assertCafeMatch(gate.user, cafeId);
  if (denied) return denied;

  let dataUrl: string | undefined;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return fail(400, "INVALID_BODY", "file is required");
    dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  } else {
    const body = await req.json().catch(() => ({}));
    dataUrl =
      typeof body.documentUrl === "string" ? body.documentUrl : undefined;
  }

  const match = dataUrl ? DATA_URL.exec(dataUrl) : null;
  if (!dataUrl || !match)
    return fail(
      400,
      "UNSUPPORTED_TYPE",
      "Only PDF, PNG, JPG or WEBP files are accepted.",
    );
  if (dataUrl.length > MAX_DATA_URL_CHARS)
    return fail(
      413,
      "TOO_LARGE",
      "File is larger than 3MB. Compress it or upload a photo instead.",
    );

  const type: "pdf" | "image" =
    match[1] === "application/pdf" ? "pdf" : "image";
  await setMenuDocument(cafeId, dataUrl, type);
  return NextResponse.json({
    menuDocumentUrl: `/api/cafes/${cafeId}/menu-document?v=${Date.now()}`,
    menuDocumentType: type,
  });
}

// DELETE — remove the menu document.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const gate = await requireStaffSession(req, {
    roles: ["cashier", "merchant", "admin"],
  });
  if (gate instanceof NextResponse) return gate;
  const cafeId = Number(params.id);
  const denied = assertCafeMatch(gate.user, cafeId);
  if (denied) return denied;
  await clearMenuDocument(cafeId);
  return NextResponse.json({ ok: true });
}
