/**
 * EXAMPLE DATA ONLY — a stand-in for the real asset register so the
 * standalone asset page can be designed against something concrete.
 * Every value here is invented. Replace this lookup with the real source
 * (AroFlo asset by barcode, or an asset table) before it goes live.
 */

export type AssetDocument = {
  title: string;
  kind: "Commissioning" | "Certificate" | "Manual" | "Report";
  date: string;
  href: string | null;
};

export type AssetRecord = {
  id: string;
  typeLabel: string;
  status: "In service" | "Out of service" | "Decommissioned";
  manufacturer: string;
  model: string;
  serialNumber: string;
  site: string;
  location: string;
  commissioned: string;
  lastService: string | null;
  nextServiceDue: string | null;
  documents: AssetDocument[];
};

const EXAMPLES: Record<string, AssetRecord> = {
  "AAC-CMP-0001": {
    id: "AAC-CMP-0001",
    typeLabel: "Rotary screw compressor",
    status: "In service",
    manufacturer: "Example Manufacturer",
    model: "RS 22 VSD",
    serialNumber: "EX-000000",
    site: "Example Customer Pty Ltd",
    location: "Plant room 1",
    commissioned: "12 Nov 2026",
    lastService: "12 Nov 2026",
    nextServiceDue: "12 May 2027",
    documents: [
      { title: "Commissioning report", kind: "Commissioning", date: "12 Nov 2026", href: null },
      { title: "Pressure vessel registration", kind: "Certificate", date: "12 Nov 2026", href: null },
      { title: "Electrical test certificate", kind: "Certificate", date: "12 Nov 2026", href: null },
      { title: "Operation & maintenance manual", kind: "Manual", date: "2026", href: null },
    ],
  },
};

export function findExampleAsset(id: string): AssetRecord | null {
  return EXAMPLES[id] ?? null;
}
