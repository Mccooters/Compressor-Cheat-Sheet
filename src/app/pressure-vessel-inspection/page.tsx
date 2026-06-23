import Link from "next/link";
import { auth } from "@/auth";
import { listPviResources } from "@/lib/pvi/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PviResourceSection } from "@/components/pvi/PviResourceSection";

const CALCULATORS = [
  {
    href: "/calculators/pressure-equipment-hazard-level",
    title: "Pressure equipment hazard level (AS 4343)",
    description:
      "Full numerical method from AS 4343:2014 for hazard level A–E of pressure vessels and boilers.",
  },
  {
    href: "/calculators/pv-value",
    title: "PV value",
    description:
      "Design pressure × volume against AS/NZS 3788 Table 4.1 inspection thresholds.",
  },
  {
    href: "/calculators/minimum-wall-thickness",
    title: "Minimum wall thickness (t_min)",
    description:
      "Baseline cylindrical shell thickness per AS 1210 — compare measured UT readings against it.",
  },
  {
    href: "/calculators/corrosion-rate",
    title: "Corrosion rate & remaining life",
    description:
      "From two UT readings: corrosion rate, remaining life, and next inspection date.",
  },
  {
    href: "/calculators/mawp",
    title: "Maximum allowable working pressure (MAWP)",
    description:
      "Working pressure a vessel can still be rated at from its current measured wall thickness.",
  },
  {
    href: "/calculators/srv-set-pressure-verification",
    title: "SRV set pressure verification",
    description:
      "Checks the safety relief valve set pressure against design pressure, MAWP, and the 110% limit.",
  },
  {
    href: "/calculators/hydrostatic-test-pressure",
    title: "Hydrostatic test pressure",
    description:
      "Required test pressure from MAWP and a temperature-derated stress ratio, per AS 1210.",
  },
  {
    href: "/calculators/pressure-vessel-volume",
    title: "Pressure vessel volume",
    description:
      "Volume of a standard cylindrical vessel with two dome ends, from overall length and diameter.",
  },
];

export default async function PressureVesselInspectionPage() {
  const [session, resources] = await Promise.all([auth(), listPviResources()]);
  const canEdit = !!session?.user;

  const cheatSheets = resources.filter((r) => r.category === "cheat_sheet");
  const other = resources.filter((r) => r.category === "other");

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        eyebrow="AS 4343 · AS 1210 · AS/NZS 3788"
        title="Pressure Vessel Inspection"
        description="The full calculator toolkit and cheat sheets for inspecting compressed air receivers and other pressure vessels."
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Calculators
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {CALCULATORS.map((calc) => (
            <Link
              key={calc.href}
              href={calc.href}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-amber-500/60"
            >
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {calc.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {calc.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <PviResourceSection
        title="Cheat sheets"
        category="cheat_sheet"
        resources={cheatSheets}
        canEdit={canEdit}
      />
      <PviResourceSection
        title="Other resources"
        category="other"
        resources={other}
        canEdit={canEdit}
      />
    </div>
  );
}
