import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAssetByTag } from "@/lib/assets/record";
import { normaliseTag } from "@/lib/assets/tagIndex";
import type { AssetRecord } from "@/lib/assets/types";

/**
 * Asset page — where the QR sticker on a piece of equipment lands.
 *
 * This is a standalone, customer-facing page: it is not part of the Air
 * Assist technician tool, and the app's nav bar is hidden here (see
 * AppChrome). Anyone who can reach the equipment can open it, so it must
 * only ever show what is safe for a customer, contractor or auditor to see.
 *
 * The record is read live from AroFlo, which is the asset register: a tag
 * belongs to whichever AroFlo asset has it in its Barcode field. Tags with
 * no asset show a "not registered yet" state rather than a 404, since
 * stickers are printed ahead of the assets they end up on.
 */

const TYPE_LABELS: Record<string, string> = {
  CMP: "Compressor",
  DRY: "Dryer",
  RCV: "Receiver",
  FLT: "Filter",
};

export const metadata: Metadata = {
  title: "Asset record · Adaptive Air Compressors",
  robots: { index: false, follow: false },
};

const STATUS_CLASS: Record<AssetRecord["status"], string> = {
  "In service":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Decommissioned:
    "bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-slate-300",
};

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/60";
const headingClass =
  "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";
const bodyClass = "mt-2 text-sm text-slate-600 dark:text-slate-400";

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
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
  const assetId = normaliseTag(decodeURIComponent(id));
  if (!assetId) notFound();

  const result = await getAssetByTag(assetId);
  const asset = result.state === "found" ? result.asset : null;
  // The type segment of the ID is a display fallback only — once a record
  // exists, the record says what the asset is.
  const fallbackType = TYPE_LABELS[assetId.slice(4, 7)];

  return (
    <div className="mx-auto max-w-md space-y-4">
      <p className="border-b border-slate-200 pb-3 text-sm font-bold tracking-tight text-slate-900 dark:border-zinc-700 dark:text-white">
        Adaptive Air Compressors
      </p>
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

      {asset && (
        <>
          <section className={cardClass}>
            <h2 className={headingClass}>Equipment</h2>
            <dl className="mt-1 divide-y divide-slate-100 dark:divide-zinc-700">
              <Row label="Manufacturer" value={asset.manufacturer} />
              <Row label="Model" value={asset.model} />
              <Row label="Serial number" value={asset.serialNumber} />
              <Row label="Site" value={asset.site} />
            </dl>
          </section>

          <section className={cardClass}>
            <h2 className={headingClass}>Service</h2>
            <dl className="mt-1">
              <Row label="Last service" value={asset.lastService ?? "None recorded"} />
            </dl>
            {asset.history.length > 0 && (
              <ul className="mt-2 space-y-3 border-t border-slate-100 pt-3 dark:border-zinc-700">
                {asset.history.map((entry) => (
                  <li key={`${entry.reference}-${entry.title}`}>
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">
                      {entry.title}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {[entry.date, entry.reference].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={cardClass}>
            <h2 className={headingClass}>Documents</h2>
            {asset.documents.length === 0 ? (
              <p className={bodyClass}>
                No documents have been added for this asset yet.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-zinc-700">
                {asset.documents.map((doc) => (
                  <li key={doc.title}>
                    <a
                      href={doc.href ?? undefined}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                          {doc.title}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {[doc.kind, doc.date].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-orange-600 dark:text-orange-400">
                        Open
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {result.state === "unregistered" && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            This tag isn&apos;t registered yet
          </h2>
          <p className={bodyClass}>
            The tag is valid and its ID is permanent. Equipment details,
            documents and service information will appear here once the asset
            has been registered.
          </p>
        </section>
      )}

      {result.state === "unavailable" && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Asset details aren&apos;t available right now
          </h2>
          <p className={bodyClass}>
            The tag is valid, but its record couldn&apos;t be loaded. Please
            try again shortly.
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
      </p>
    </div>
  );
}
