"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";

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
      <PageHeader
        eyebrow="Ohm's law"
        title="Solenoid resistance"
        description="Coil resistance and current from rated voltage and wattage (R = V²/P, I = P/V)."
      />

      <Card className="grid gap-4 sm:grid-cols-2">
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
      </Card>

      <Card>
        {result ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Stat label="Coil resistance" value={`${result.resistance.toFixed(2)} Ω`} />
            <Stat label="Current draw" value={`${result.current.toFixed(3)} A`} />
          </dl>
        ) : (
          <EmptyState>Enter voltage and wattage to calculate.</EmptyState>
        )}
      </Card>
    </div>
  );
}
