import Link from "next/link";
import { linkCardClass } from "@/components/ui/Card";

const CATEGORIES = [
  {
    name: "Pressure",
    standard: "AS 4343 · AS 1210",
    note: (
      <>
        Need the full hazard level, MAWP, corrosion-rate, and inspection
        toolkit, plus cheat sheets?{" "}
        <Link
          href="/pressure-vessel-inspection"
          className="text-amber-600 underline dark:text-amber-400"
        >
          Visit Pressure Vessel Inspection
        </Link>
        .
      </>
    ),
    calculators: [
      {
        href: "/calculators/pressure-vessel-volume",
        title: "Pressure vessel volume",
        description:
          "Volume of a standard cylindrical vessel with two dome ends, from overall length and diameter.",
      },
      {
        href: "/calculators/hazard-level-quick",
        title: "Quick hazard level (AS 4343)",
        description:
          "Fast hazard level A–E estimate from pressure, volume, state, and harmfulness.",
      },
    ],
  },
  {
    name: "Electrical",
    standard: "Ohm's law",
    calculators: [
      {
        href: "/calculators/motor-electrical",
        title: "Motor current / voltage / resistance / power",
        description:
          "Ohm's law and power for single-phase or three-phase motors — fill in any two, solve for the rest.",
      },
      {
        href: "/calculators/solenoid-resistance",
        title: "Solenoid resistance",
        description: "Coil resistance and current from rated voltage and wattage.",
      },
    ],
  },
  {
    name: "Air & flow",
    standard: "Unit conversion",
    calculators: [
      {
        href: "/calculators/airflow-conversion",
        title: "Air flow rate conversion",
        description: "Convert between CFM, LPM, LPS, LPH, and CFH.",
      },
      {
        href: "/calculators/pressure-conversion",
        title: "Pressure unit conversion",
        description: "Convert between kPa, MPa, Bar, PSI, and kgf/cm².",
      },
    ],
  },
];

export default function CalculatorsIndexPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Field tools
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Calculators
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Grouped by discipline. More will be added over time.
        </p>
      </div>

      {CATEGORIES.map((category) => (
        <section key={category.name} className="space-y-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {category.standard}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {category.name}
            </h2>
            {category.note && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {category.note}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {category.calculators.map((calc) => (
              <Link
                key={calc.href}
                href={calc.href}
                className={linkCardClass("p-4")}
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
      ))}
    </div>
  );
}
