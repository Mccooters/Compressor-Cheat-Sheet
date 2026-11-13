import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findExampleAsset, type AssetRecord } from "@/lib/assets/exampleAssets";

/**
 * Asset page — where the QR sticker on a piece of equipment lands.
 *
 * This is a standalone, customer-facing page: it is not part of the Air
 * Assist technician tool, and the app's nav bar is hidden here (see
 * AppChrome). Anyone who can reach the equipment can open it, so it must
 * only ever show what is safe for a customer, contractor or auditor to see.
 *
 * The record currently comes from example data. Tags with no record show a
 * "not registered yet" state rather than a 404, since stickers are printed
 * ahead of the assets they end up on.
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
  title: "Asset record",
  robots: { index: false, follow: false },
};

const STATUS_CLASS: Record<AssetRecord["status"], string> = {
  "In service":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  "Out of service":
    "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  Decommissioned:
    "bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-slate-300",
};

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/60";
const headingClass =
  "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // The path arrives uppercase from the QR, but may be typed in any case.
  const assetId = decodeURIComponent(id).trim().toUpperCase();
  if (!ASSET_ID_PATTERN.test(assetId)) notFound();

  const asset = findExampleAsset(assetId);
  // The type segment of the ID is a display fallback only — once a record
  // exists, the record says what the asset is.
  const fallbackType = TYPE_LABELS[assetId.slice(4, 7)];

  return (
    <div className="mx-auto max-w-md space-y-4">
      <header className="space-y-2 pt-2">
        <p className={headingClass}>Asset record</p>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {assetId}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base text-slate-700 dark:text-slate-300">
            {asset?.typeLabel ?? fallbackType ?? "Equipment"}
          </span>
          {asset && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[asset.status]}`}
            >
              {asset.status}
            </span>
          )}
        </div>
      </header>

      {asset ? (
        <>
          <section className={cardClass}>
            <h2 className={headingClass}>Equipment</h2>
            <dl className="mt-1 divide-y divide-slate-100 dark:divide-zinc-700">
              <Row label="Manufacturer" value={asset.manufacturer} />
              <Row label="Model" value={asset.model} />
              <Row label="Serial number" value={asset.serialNumber} />
              <Row label="Site" value={asset.site} />
              <Row label="Location" value={asset.location} />
              <Row label="Commissioned" value={asset.commissioned} />
            </dl>
          </section>

          <section className={cardClass}>
            <h2 className={headingClass}>Service</h2>
            <dl className="mt-1 divide-y divide-slate-100 dark:divide-zinc-700">
              <Row label="Last service" value={asset.lastService ?? "—"} />
              <Row label="Next service due" value={asset.nextServiceDue ?? "—"} />
            </dl>
          </section>

          <section className={cardClass}>
            <h2 className={headingClass}>Documents</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-zinc-700">
              {asset.documents.map((doc) => {
                const body = (
                  <>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                        {doc.title}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {doc.kind} · {doc.date}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {doc.href ? "Open" : "PDF"}
                    </span>
                  </>
                );
                return (
                  <li key={doc.title}>
                    {doc.href ? (
                      <a
                        href={doc.href}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        {body}
                      </a>
                    ) : (
                      <div className="flex items-center justify-between gap-3 py-3">
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            This tag isn&apos;t registered yet
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The tag is valid and its ID is permanent. Equipment details,
            documents and service information will appear here once the asset
            has been registered.
          </p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <a
          href={`mailto:?subject=${encodeURIComponent(`Service request — ${assetId}`)}`}
          className="rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-orange-600 dark:bg-orange-400 dark:hover:bg-orange-300"
        >
          Request service
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(`Fault report — ${assetId}`)}`}
          className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:border-orange-400 dark:border-zinc-700 dark:text-slate-300"
        >
          Report a fault
        </a>
      </div>

      <p className="pb-4 text-center text-xs text-slate-500 dark:text-slate-500">
        Quote <span className="font-mono font-semibold">{assetId}</span> when
        booking service or reporting a fault.
        {asset && " Example data shown."}
      </p>
    </div>
  );
}
