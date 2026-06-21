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
];

export default function CalculatorsIndexPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Calculators</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Field calculators for technicians. More will be added over time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {calculators.map((calc) => (
          <Link
            key={calc.href}
            href={calc.href}
            className="rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
          >
            <h2 className="font-medium">{calc.title}</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {calc.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
