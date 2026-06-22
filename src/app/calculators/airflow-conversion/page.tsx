"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Card } from "@/components/calculators/Card";

type Unit = "cfm" | "lpm" | "lph" | "lps" | "cfh";

// 1 ft = 0.3048 m exactly, so 1 ft³ = 0.3048³ m³ = 28.316846592 L exactly.
const FT3_TO_L = 28.316846592;

const TO_LPS_FACTOR: Record<Unit, number> = {
  cfm: FT3_TO_L / 60,
  lpm: 1 / 60,
  lph: 1 / 3600,
  lps: 1,
  cfh: FT3_TO_L / 3600,
};

const UNITS: { key: Unit; label: string }[] = [
  { key: "cfm", label: "CFM (ft³/min)" },
  { key: "lpm", label: "LPM (L/min)" },
  { key: "lps", label: "LPS (L/s)" },
  { key: "lph", label: "LPH (L/hr)" },
  { key: "cfh", label: "CFH (ft³/hr)" },
];

export default function AirflowConversionCalculator() {
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);
  const [rawValue, setRawValue] = useState("");

  const lps = useMemo(() => {
    if (!activeUnit) return null;
    const n = parseFloat(rawValue);
    if (!Number.isFinite(n)) return null;
    return n * TO_LPS_FACTOR[activeUnit];
  }, [activeUnit, rawValue]);

  function valueFor(unit: Unit): string {
    if (unit === activeUnit) return rawValue;
    if (lps === null) return "";
    return (lps / TO_LPS_FACTOR[unit]).toFixed(3);
  }

  function handleChange(unit: Unit, value: string) {
    setActiveUnit(unit);
    setRawValue(value);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <CalculatorHeader
        eyebrow="Unit conversion"
        title="Air flow rate conversion"
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
