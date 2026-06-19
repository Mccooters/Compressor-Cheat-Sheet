import { db } from "@/db";

export async function listAllDocumentLinks() {
  return db.query.documentLink.findMany({
    columns: { id: true, title: true, equipmentId: true, docType: true },
  });
}
