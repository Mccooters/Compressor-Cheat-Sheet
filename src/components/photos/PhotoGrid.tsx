"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";

export type GridFile = {
  id: string;
  name: string;
  kind: "image" | "video" | "document";
  when: string | null;
  size: string | null;
  thumbUrl: string | null;
};
export type GridSection = { key: string; title: string; files: GridFile[] };

const KIND_LABEL = { image: "Photo", video: "Video", document: "PDF" } as const;

const originalHref = (id: string) => `/api/photos/${id}`;
const viewHref = (id: string) => `/api/photos/${id}?view=1`;

/**
 * Photos as a grid of thumbnails. Click one to see it large; tick several
 * to download them together. Each file downloads under the descriptive name
 * the app gave it ("11662 Supply & Commission - … - 2026-11-13 11.31.00.jpg").
 */
export function PhotoGrid({ sections }: { sections: GridSection[] }) {
  const files = useMemo(() => sections.flatMap((section) => section.files), [sections]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const openIndex = openId ? files.findIndex((file) => file.id === openId) : -1;
  const open = openIndex >= 0 ? files[openIndex] : null;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const step = useCallback(
    (by: number) => {
      if (openIndex < 0) return;
      const next = files[openIndex + by];
      if (next) setOpenId(next.id);
    },
    [files, openIndex]
  );

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // One after another, a moment apart: browsers drop downloads started all
  // at once. The first time, the browser asks to allow several downloads.
  async function downloadSelected() {
    setDownloading(true);
    try {
      for (const file of files.filter((candidate) => selected.has(candidate.id))) {
        const link = document.createElement("a");
        link.href = originalHref(file.id);
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    } finally {
      setDownloading(false);
    }
  }

  if (files.length === 0) return null;

  return (
    <div className="space-y-8">
      {selected.size > 0 && (
        <div
          role="status"
          className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 shadow-sm dark:border-orange-500/40 dark:bg-zinc-900"
        >
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {selected.size} selected
          </span>
          <span className="flex items-center gap-2">
            <button type="button" onClick={downloadSelected} disabled={downloading} className={buttonClass("primary")}>
              {downloading ? "Downloading…" : "Download"}
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className={buttonClass("secondary")}>
              Clear
            </button>
          </span>
        </div>
      )}

      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          {section.title && (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {section.title}
                <span className="ml-2 font-normal normal-case tracking-normal">{section.files.length}</span>
              </h2>
              <button
                type="button"
                className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
                onClick={() =>
                  setSelected((current) => {
                    const next = new Set(current);
                    const all = section.files.every((file) => next.has(file.id));
                    for (const file of section.files) {
                      if (all) next.delete(file.id);
                      else next.add(file.id);
                    }
                    return next;
                  })
                }
              >
                {section.files.every((file) => selected.has(file.id)) ? "Deselect these" : "Select these"}
              </button>
            </div>
          )}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {section.files.map((file) => {
              const isSelected = selected.has(file.id);
              return (
                <li key={file.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenId(file.id)}
                    aria-label={`Open ${file.name}`}
                    className={`block aspect-square w-full overflow-hidden rounded-xl border bg-slate-100 transition hover:border-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:bg-zinc-800 ${
                      isSelected
                        ? "border-orange-500 ring-2 ring-orange-500"
                        : "border-slate-200 dark:border-zinc-700"
                    }`}
                  >
                    {file.thumbUrl ? (
                      // Addresses come from SharePoint, signed and short-lived: not something next/image can optimise.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.thumbUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center p-2 text-center text-xs text-slate-500 dark:text-slate-400">
                        {file.name}
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 rounded-b-xl bg-black/60 px-2 py-1 text-left text-xs text-white">
                      <span className="truncate">{file.when ?? file.name}</span>
                      {file.kind !== "image" && (
                        <span className="shrink-0 rounded bg-white/20 px-1 font-semibold">{KIND_LABEL[file.kind]}</span>
                      )}
                    </span>
                  </button>
                  <label className="absolute left-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-black/50">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(file.id)}
                      aria-label={`Select ${file.name}`}
                      className="h-4 w-4 accent-orange-500"
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <dialog
        ref={dialog}
        onClose={() => setOpenId(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-1);
          if (event.key === "ArrowRight") step(1);
        }}
        aria-label={open?.name ?? "Photo"}
        className="m-auto w-[min(96vw,72rem)] max-w-none rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-black/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      >
        {open && (
          <div className="flex max-h-[92vh] flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
              {open.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={open.id}
                  src={viewHref(open.id)}
                  alt={open.name}
                  className="max-h-[72vh] w-auto max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center text-white">
                  {open.thumbUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={open.thumbUrl} alt="" className="max-h-[50vh] w-auto max-w-full object-contain" />
                  )}
                  <p className="text-sm">
                    {KIND_LABEL[open.kind]}s open from the original file: use Download.
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="break-words text-sm font-medium">{open.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {[open.when, open.size, `${openIndex + 1} of ${files.length}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={originalHref(open.id)} download={open.name} className={buttonClass("primary")}>
                  Download original
                </a>
                <button type="button" onClick={() => step(-1)} disabled={openIndex <= 0} className={buttonClass("secondary")}>
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={openIndex >= files.length - 1}
                  className={buttonClass("secondary")}
                >
                  Next
                </button>
                <button type="button" onClick={() => setOpenId(null)} className={buttonClass("secondary", "ml-auto")}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
