import Link from "next/link";

const calculators = [
  {
    href: "/calculators/pressure-vessel-volume",
    title: "Pressure vessel volume",
    description:
      "Volume of a standard cylindrical vessel with two dome ends, from overall length and diameter.",
  },
  {
    href: "/calculators/motor-electrical",
    title: "Motor current / voltage / resistance / power",
    description:
      "Ohm's law and power for single-phase or three-phase motors — fill in any two, solve for the rest.",
  },
  {
    href: "/calculators/airflow-conversion",
    title: "Air flow rate conversion",
    description: "Convert between CFM, LPM, LPS, LPH, and CFH.",
  },
  {
    href: "/calculators/solenoid-resistance",
    title: "Solenoid resistance",
    description: "Coil resistance and current from rated voltage and wattage.",
  },
  {
    href: "/calculators/pressure-equipment-hazard-level",
    title: "Pressure equipment hazard level (AS 4343)",
    description:
      "Numerical method from AS 4343:2014 for hazard level A–E of pressure vessels and boilers.",
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
];

export default function CalculatorsIndexPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          AS 3788 · AS 1210 · AS 4343
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Calculators
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Field calculators for technicians. More will be added over time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {calculators.map((calc) => (
          <Link
            key={calc.href}
            href={calc.href}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-amber-500/60"
          >
            <h2 className="font-semibold text-slate-900 dark:text-white">
              {calc.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {calc.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
