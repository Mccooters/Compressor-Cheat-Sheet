import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";

/**
 * Asset-tag landing page — the destination of the QR stickers on equipment.
 *
 * Placeholder for now: the asset register doesn't exist yet (the `equipment`
 * table is a model catalogue, with no per-installation serial, site or
 * service history), so there is nothing to look a tag up against. The tags
 * are already printed and applied though, and the IDs are permanent, so this
 * answers a scan with something honest rather than a 404 or a login wall.
 *
 * Replace the body — not the route — once the asset table lands.
 */

// AAC-{3-letter type}-{4 digits}, e.g. AAC-CMP-0001.
const ASSET_ID_PATTERN = /^AAC-[A-Z]{3}-\d{4}$/;

const TYPE_LABELS: Record<string, string> = {
  CMP: "Compressor",
  DRY: "Dryer",
  RCV: "Receiver",
  FLT: "Filter",
};

export const metadata: Metadata = {
  title: "Asset tag · Air Assist",
  // Asset tags shouldn't show up in search results.
  robots: { index: false, follow: false },
};

export default async function AssetTagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // The path arrives uppercase from the QR, but may be typed in any case.
  const assetId = decodeURIComponent(id).trim().toUpperCase();

  // Validate the shape before doing anything else — a malformed tag is a
  // 404, distinct from a well-formed tag that simply isn't registered yet.
  if (!ASSET_ID_PATTERN.test(assetId)) {
    notFound();
  }

  const typeCode = assetId.slice(4, 7);
  // The type segment is a human convenience only. Once the asset register
  // exists the database is the source of truth for what this thing is —
  // never derive behaviour from the ID itself.
  const typeLabel = TYPE_LABELS[typeCode];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Asset tag"
        title={assetId}
        description={
          typeLabel
            ? `${typeLabel} · scanned from an Air Assist equipment tag`
            : "Scanned from an Air Assist equipment tag"
        }
      />

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Asset records are coming soon
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This tag is valid and the ID above is permanent. Full asset details —
          make and model, serial number, site, service history and next
          inspection due — will appear here once the asset register goes live.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          In the meantime, quote <span className="font-mono font-semibold text-slate-900 dark:text-white">{assetId}</span>{" "}
          when booking service or reporting a fault on this equipment.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/" className={buttonClass("primary")}>
          Air Assist home
        </Link>
        <Link href="/equipment" className={buttonClass("secondary")}>
          Equipment reference
        </Link>
      </div>
    </div>
  );
}
