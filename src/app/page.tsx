import Link from "next/link";

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
    href: "/search",
    title: "Search",
    description: "Search across equipment and fault trees at once.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Compressor Cheat Sheet</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          The internal reference for compressors, controllers, and dryers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
          >
            <h2 className="font-medium">{card.title}</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
