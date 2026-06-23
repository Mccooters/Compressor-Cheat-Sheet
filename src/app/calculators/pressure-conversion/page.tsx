"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Card } from "@/components/calculators/Card";

type Unit = "kpa" | "mpa" | "bar" | "psi" | "kgfcm2";

const TO_KPA_FACTOR: Record<Unit, number> = {
  kpa: 1,
  mpa: 1000,
  bar: 100,
  psi: 6.894757293168,
  kgfcm2: 98.0665,
};

const UNITS: { key: Unit; label: string }[] = [
  { key: "kpa", label: "kPa" },
  { key: "mpa", label: "MPa" },
  { key: "bar", label: "Bar" },
  { key: "psi", label: "PSI" },
  { key: "kgfcm2", label: "kgf/cm²" },
];

export default function PressureConversionCalculator() {
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);
  const [rawValue, setRawValue] = useState("");

  const kpa = useMemo(() => {
    if (!activeUnit) return null;
    const n = parseFloat(rawValue);
    if (!Number.isFinite(n)) return null;
    return n * TO_KPA_FACTOR[activeUnit];
  }, [activeUnit, rawValue]);

  function valueFor(unit: Unit): string {
    if (unit === activeUnit) return rawValue;
    if (kpa === null) return "";
    return (kpa / TO_KPA_FACTOR[unit]).toFixed(3);
  }

  function handleChange(unit: Unit, value: string) {
    setActiveUnit(unit);
    setRawValue(value);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <CalculatorHeader
        eyebrow="Unit conversion"
        title="Pressure unit conversion"
        description="Type into any field — the rest convert automatically."
      />

      <Card className="grid gap-4 sm:grid-cols-2">
        {UNITS.map(({ key, label }) => (
          <NumberField
            key={key}
            label={label}
            value={valueFor(key)}
            onChange={(v) => handleChange(key, v)}
          />
        ))}
      </Card>
    </div>
  );
}
