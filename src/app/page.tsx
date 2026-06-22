import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

const cards = [
  {
    href: "/equipment",
    title: "Equipment reference",
    description:
      "Look up compressors, controllers, and dryers — specs, datasheets, and linked SharePoint manuals.",
  },
  {
    href: "/wizard",
    title: "Fault finder",
    description:
      "Walk through a guided question tree to diagnose a problem and find the recommended fix.",
  },
  {
    href: "/controllers",
    title: "Controller passwords",
    description:
      "Look up service, factory, and user access codes by controller manufacturer and model.",
  },
  {
    href: "/calculators",
    title: "Calculators",
    description:
      "Pressure vessel volume, motor electrical, airflow unit conversion, and more field calculators.",
  },
  {
    href: "/search",
    title: "Search",
    description: "Search across equipment and fault trees at once.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Compressor Cheat Sheet"
        description="The internal reference for compressors, controllers, and dryers."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-amber-500/60"
          >
            <h2 className="font-semibold text-slate-900 dark:text-white">
              {card.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
