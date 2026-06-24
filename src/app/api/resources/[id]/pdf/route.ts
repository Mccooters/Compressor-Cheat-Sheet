import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { resource } from "@/db/schema";
import { getDriveItemAsPdf } from "@/lib/graph/sharepoint";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await db.query.resource.findFirst({
    where: eq(resource.id, id),
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Manual links have no driveId/itemId to convert — send straight to the
  // original URL, same as before this route existed.
  if (doc.source !== "graph" || !doc.sharepointDriveId || !doc.sharepointItemId) {
    return NextResponse.redirect(doc.webUrl);
  }

  try {
    const pdf = await getDriveItemAsPdf(
      doc.sharepointDriveId,
      doc.sharepointItemId
    );
    const baseName = (doc.fileName ?? doc.title)
      .replace(/\.[^./]+$/, "")
      .replace(/[\r\n"]/g, "");

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${baseName}.pdf"; filename*=UTF-8''${encodeURIComponent(baseName)}.pdf`,
      },
    });
  } catch (err) {
    // Conversion failing (unsupported format, expired session, etc.)
    // shouldn't break the link entirely — fall back to the original file.
    console.error("Failed to convert resource to PDF:", err);
    return NextResponse.redirect(doc.webUrl);
  }
}
