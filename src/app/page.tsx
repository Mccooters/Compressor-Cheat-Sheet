import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { linkCardClass } from "@/components/ui/Card";
import {
  CalculatorIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "@/components/ui/icons";

const cards = [
  {
    href: "/equipment",
    title: "Equipment reference",
    description:
      "Look up compressors, controllers, and dryers — specs, datasheets, and linked SharePoint manuals.",
    icon: WrenchIcon,
  },
  {
    href: "/wizard",
    title: "Fault finder",
    description:
      "Walk through a guided question tree to diagnose a problem and find the recommended fix.",
    icon: ExclamationTriangleIcon,
  },
  {
    href: "/controllers",
    title: "Controller passwords",
    description:
      "Look up service, factory, and user access codes by controller manufacturer and model.",
    icon: LockClosedIcon,
  },
  {
    href: "/calculators",
    title: "Calculators",
    description:
      "Pressure vessel volume, motor electrical, airflow unit conversion, and more field calculators.",
    icon: CalculatorIcon,
  },
  {
    href: "/pressure-vessel-inspection",
    title: "Pressure Vessel Inspection",
    description:
      "Hazard level, MAWP, corrosion rate, and wall thickness calculators plus cheat sheets, all per AS 4343 / AS 1210 / AS-NZS 3788.",
    icon: ShieldCheckIcon,
  },
  {
    href: "/search",
    title: "Search",
    description: "Search across equipment and fault trees at once.",
    icon: MagnifyingGlassIcon,
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Air Assist"
        description="The internal reference for compressors, controllers, and dryers."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={linkCardClass("p-4")}
          >
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <card.icon className="h-5 w-5" />
            </div>
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
