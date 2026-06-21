"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";

export default function SolenoidResistanceCalculator() {
  const [voltage, setVoltage] = useState("");
  const [wattage, setWattage] = useState("");

  const result = useMemo(() => {
    const v = parseFloat(voltage);
    const w = parseFloat(wattage);
    if (!Number.isFinite(v) || !Number.isFinite(w) || v <= 0 || w <= 0) {
      return null;
    }
    return {
      resistance: (v * v) / w,
      current: w / v,
    };
  }, [voltage, wattage]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Solenoid resistance</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Coil resistance and current from rated voltage and wattage (R =
          V²/P, I = P/V).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Rated voltage"
          unit="V"
          value={voltage}
          onChange={setVoltage}
          placeholder="e.g. 24"
        />
        <NumberField
          label="Rated wattage"
          unit="W"
          value={wattage}
          onChange={setWattage}
          placeholder="e.g. 8"
        />
      </div>

      {result && (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <dt className="text-xs text-neutral-500">Coil resistance</dt>
            <dd className="font-medium">{result.resistance.toFixed(2)} Ω</dd>
          </div>
          <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <dt className="text-xs text-neutral-500">Current draw</dt>
            <dd className="font-medium">{result.current.toFixed(3)} A</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
