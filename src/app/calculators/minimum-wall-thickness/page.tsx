"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Card } from "@/components/calculators/Card";
import { ResultStat } from "@/components/calculators/ResultStat";
import { EmptyState } from "@/components/calculators/EmptyState";
import { calculateMinWallThickness } from "@/lib/calculators/wallThickness";

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export default function MinimumWallThicknessCalculator() {
  const [pressureKPa, setPressureKPa] = useState("");
  const [diameter, setDiameter] = useState("");
  const [stress, setStress] = useState("");
  const [jointEfficiency, setJointEfficiency] = useState("1");
  const [tempCoefficient, setTempCoefficient] = useState("0.4");

  const result = useMemo(() => {
    const pKPa = parseOptionalNumber(pressureKPa);
    const d = parseOptionalNumber(diameter);
    const s = parseOptionalNumber(stress);
    const e = parseOptionalNumber(jointEfficiency);
    const y = parseOptionalNumber(tempCoefficient);
    if (
      pKPa === null ||
      d === null ||
      s === null ||
      e === null ||
      y === null ||
      pKPa <= 0 ||
      d <= 0 ||
      s <= 0 ||
      e <= 0
    ) {
      return null;
    }

    const tMin = calculateMinWallThickness({
      designPressureMPa: pKPa / 1000,
      insideDiameterMm: d,
      allowableStressMPa: s,
      jointEfficiency: e,
      temperatureCoefficient: y,
    });

    return { tMin };
  }, [pressureKPa, diameter, stress, jointEfficiency, tempCoefficient]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <CalculatorHeader
        eyebrow="AS 1210"
        title="Minimum wall thickness (t_min)"
        description="Thin-wall cylindrical shell: t_min = PD / (2SE + 2yP). Compare a measured UT thickness against this baseline to assess corrosion loss — get S and y from the vessel's design data or an AS 1210 material table."
      />

      <Card className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Design pressure (P)"
          unit="kPa"
          value={pressureKPa}
          onChange={setPressureKPa}
          placeholder="e.g. 1000"
        />
        <NumberField
          label="Inside diameter (D)"
          unit="mm"
          value={diameter}
          onChange={setDiameter}
          placeholder="e.g. 300"
        />
        <NumberField
          label="Allowable stress (S)"
          unit="MPa"
          value={stress}
          onChange={setStress}
          placeholder="e.g. 137"
        />
        <NumberField
          label="Joint efficiency (E)"
          value={jointEfficiency}
          onChange={setJointEfficiency}
          placeholder="0–1, e.g. 1.0 seamless"
        />
        <NumberField
          label="Temperature coefficient (y)"
          value={tempCoefficient}
          onChange={setTempCoefficient}
          placeholder="default 0.4"
        />
      </Card>

      <Card>
        {result ? (
          <dl>
            <ResultStat
              label="Minimum wall thickness"
              value={`${result.tMin.toFixed(3)} mm`}
            />
          </dl>
        ) : (
          <EmptyState>Enter all required values to calculate.</EmptyState>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-500">
        Guidance only — confirm S, E, and y against the vessel&apos;s
        manufacturer&apos;s data report or AS 1210 before relying on this
        result for a fitness-for-service decision.
      </p>
    </div>
  );
}
