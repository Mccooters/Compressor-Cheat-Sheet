export type AssetDocument = {
  title: string;
  kind: string;
  date: string;
  href: string | null;
};

export type AssetHistoryEntry = {
  date: string | null;
  title: string;
  reference: string;
};

/** What the public asset page shows. Everything here is visible to anyone who scans the tag. */
export type AssetRecord = {
  id: string;
  typeLabel: string;
  status: "In service" | "Decommissioned";
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  site: string | null;
  lastService: string | null;
  history: AssetHistoryEntry[];
  documents: AssetDocument[];
};
