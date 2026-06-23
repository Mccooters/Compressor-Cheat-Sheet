"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";

// Treats the two dome ends together as equivalent to one sphere of the
// vessel's diameter (i.e. each dome is assumed hemispherical) — agreed
// approximation for a quick field estimate, not a certified figure for
// vessels with torispherical/dished heads.
//
// V = π·r²·L_straight + (4/3)·π·r³, where L_straight = L − 2r (each
// hemispherical dome takes up r of the overall length along the axis).
// Simplifies to: V = π·r²·L − (2/3)·π·r³
function calculateVolumeMm3(lengthMm: number, diameterMm: number): number {
  const r = diameterMm / 2;
  return Math.PI * r * r * lengthMm - (2 / 3) * Math.PI * r * r * r;
}

export default function PressureVesselVolumeCalculator() {
  const [length, setLength] = useState("");
  const [diameter, setDiameter] = useState("");

  const result = useMemo(() => {
    const l = parseFloat(length);
    const d = parseFloat(diameter);
    if (!Number.isFinite(l) || !Number.isFinite(d) || l <= 0 || d <= 0) {
      return null;
    }
    if (d > l) {
      return { error: "Diameter can't be greater than the overall length." };
    }
    const volumeMm3 = calculateVolumeMm3(l, d);
    return {
      liters: volumeMm3 / 1_000_000,
      cubicMeters: volumeMm3 / 1_000_000_000,
    };
  }, [length, diameter]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Field estimate"
        title="Pressure vessel volume"
        description={
          <>
            Standard cylindrical vessel with two dome ends, measured
            tip-to-tip. Assumes hemispherical dome ends (combined volume of
            the two ends = one sphere of the vessel&apos;s diameter) — a
            quick field estimate, not a certified figure for
            dished/torispherical heads.
          </>
        }
      />

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Overall length"
            unit="mm"
            helper="tip-to-tip"
            value={length}
            onChange={setLength}
            placeholder="e.g. 1800"
          />
          <NumberField
            label="Diameter"
            unit="mm"
            value={diameter}
            onChange={setDiameter}
            placeholder="e.g. 500"
          />
        </div>
      </Card>

      <Card>
        {result && "error" in result ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {result.error}
          </p>
        ) : result ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Stat label="Volume" value={`${result.liters.toFixed(1)} L`} />
            <Stat
              label="Volume"
              value={`${result.cubicMeters.toFixed(4)} m³`}
            />
          </dl>
        ) : (
          <EmptyState>Enter length and diameter to calculate.</EmptyState>
        )}
      </Card>
    </div>
  );
}
