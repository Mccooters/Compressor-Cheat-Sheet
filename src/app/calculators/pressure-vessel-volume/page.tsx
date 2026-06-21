"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";

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
      <div>
        <h1 className="text-xl font-semibold">Pressure vessel volume</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Standard cylindrical vessel with two dome ends, measured
          tip-to-tip. Assumes hemispherical dome ends (combined volume of the
          two ends = one sphere of the vessel&apos;s diameter) — a quick
          field estimate, not a certified figure for dished/torispherical
          heads.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Overall length (tip-to-tip)"
          unit="mm"
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

      {result && "error" in result && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}

      {result && !("error" in result) && (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <dt className="text-xs text-neutral-500">Volume</dt>
            <dd className="font-medium">{result.liters.toFixed(1)} L</dd>
          </div>
          <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <dt className="text-xs text-neutral-500">Volume</dt>
            <dd className="font-medium">{result.cubicMeters.toFixed(4)} m³</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
