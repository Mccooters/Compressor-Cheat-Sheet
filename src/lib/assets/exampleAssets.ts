/**
 * STAND-IN DATA — one real asset, copied by hand from its AroFlo record, so
 * the standalone asset page can be reviewed against something real before
 * the AroFlo lookup (asset by barcode) is wired in. Replace this file with
 * that lookup; do not grow it into a second asset register.
 */

export type AssetDocument = {
  title: string;
  kind: "Commissioning" | "Certificate" | "Manual" | "Report";
  date: string;
  href: string | null;
};

export type AssetHistoryEntry = {
  date: string;
  title: string;
  reference: string;
};

export type AssetRecord = {
  id: string;
  typeLabel: string;
  status: "In service" | "Out of service" | "Decommissioned";
  manufacturer: string;
  model: string;
  serialNumber: string;
  site: string;
  location: string | null;
  commissioned: string | null;
  lastService: string | null;
  nextServiceDue: string | null;
  history: AssetHistoryEntry[];
  documents: AssetDocument[];
};

const EXAMPLES: Record<string, AssetRecord> = {
  // AroFlo asset AACPR-018, barcode AAC-CMP-0002.
  "AAC-CMP-0002": {
    id: "AAC-CMP-0002",
    typeLabel: "Rotary screw air compressor",
    status: "In service",
    manufacturer: "Chicago Pneumatic",
    model: "CPMV30PM-8.5",
    serialNumber: "COX04606",
    site: "H10 Engineering",
    location: null,
    commissioned: "11 Nov 2026",
    lastService: null,
    nextServiceDue: null,
    history: [
      {
        date: "11 Nov 2026",
        title: "Supply & Commission – CP CPMV30-8.5",
        reference: "Job 11662",
      },
    ],
    // The commissioning documents live in AroFlo and can't be linked until
    // the AroFlo connection exists.
    documents: [],
  },
};

export function findExampleAsset(id: string): AssetRecord | null {
  return EXAMPLES[id] ?? null;
}
