"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Card } from "@/components/calculators/Card";
import { ResultStat } from "@/components/calculators/ResultStat";
import { EmptyState } from "@/components/calculators/EmptyState";
import { calculateMAWP } from "@/lib/calculators/wallThickness";

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export default function MawpCalculator() {
  const [thickness, setThickness] = useState("");
  const [diameter, setDiameter] = useState("");
  const [stress, setStress] = useState("");
  const [jointEfficiency, setJointEfficiency] = useState("1");
  const [tempCoefficient, setTempCoefficient] = useState("0.4");

  const result = useMemo(() => {
    const t = parseOptionalNumber(thickness);
    const d = parseOptionalNumber(diameter);
    const s = parseOptionalNumber(stress);
    const e = parseOptionalNumber(jointEfficiency);
    const y = parseOptionalNumber(tempCoefficient);
    if (
      t === null ||
      d === null ||
      s === null ||
      e === null ||
      y === null ||
      t <= 0 ||
      d <= 0 ||
      s <= 0 ||
      e <= 0
    ) {
      return null;
    }

    const mawpMPa = calculateMAWP({
      actualThicknessMm: t,
      insideDiameterMm: d,
      allowableStressMPa: s,
      jointEfficiency: e,
      temperatureCoefficient: y,
    });

    return { mawpMPa, mawpKPa: mawpMPa * 1000 };
  }, [thickness, diameter, stress, jointEfficiency, tempCoefficient]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <CalculatorHeader
        eyebrow="AS 1210"
        title="Maximum allowable working pressure"
        description="Thin-wall cylindrical shell, rearranged from t_min: MAWP = 2SEt / (D + 2yt). Use the current measured (UT) thickness to find the working pressure the vessel can still be safely rated at — relevant when corrosion or pitting is found and a derate is being considered."
      />

      <Card className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Actual thickness (t)"
          unit="mm"
          helper="measured by UT"
          value={thickness}
          onChange={setThickness}
          placeholder="e.g. 4.2"
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
          <dl className="grid gap-3 sm:grid-cols-2">
            <ResultStat label="MAWP" value={`${result.mawpMPa.toFixed(3)} MPa`} />
            <ResultStat label="MAWP" value={`${result.mawpKPa.toFixed(0)} kPa`} />
          </dl>
        ) : (
          <EmptyState>Enter all required values to calculate.</EmptyState>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-500">
        Guidance only. Where UT reveals localised pitting rather than
        uniform loss, this uniform-thickness formula may overstate MAWP — a
        formal fitness-for-service evaluation by a qualified engineer is
        required before returning a corroded vessel to service at any
        pressure.
      </p>
    </div>
  );
}
