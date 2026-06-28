"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { SelectField } from "@/components/calculators/SelectField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";
import { calculateMinWallThickness } from "@/lib/calculators/wallThickness";
import {
  JOINT_EFFICIENCY_OPTIONS,
  DEFAULT_JOINT_EFFICIENCY_KEY,
  jointEfficiencyValue,
  ALLOWABLE_STRESS_OPTIONS,
  DEFAULT_ALLOWABLE_STRESS_KEY,
  allowableStressValue,
} from "@/lib/calculators/as1210";

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export default function MinimumWallThicknessCalculator() {
  const [pressureKPa, setPressureKPa] = useState("");
  const [diameter, setDiameter] = useState("");
  const [stressKey, setStressKey] = useState(DEFAULT_ALLOWABLE_STRESS_KEY);
  const [jointEfficiencyKey, setJointEfficiencyKey] = useState(DEFAULT_JOINT_EFFICIENCY_KEY);
  const [tempCoefficient, setTempCoefficient] = useState("0.4");

  const result = useMemo(() => {
    const pKPa = parseOptionalNumber(pressureKPa);
    const d = parseOptionalNumber(diameter);
    const s = allowableStressValue(stressKey);
    const e = jointEfficiencyValue(jointEfficiencyKey);
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
  }, [pressureKPa, diameter, stressKey, jointEfficiencyKey, tempCoefficient]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
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
        <SelectField
          label="Allowable stress (S)"
          helper="AS 1210 Table B1(B), 50°C, t ≤ 16 mm"
          value={stressKey}
          onChange={setStressKey}
          options={ALLOWABLE_STRESS_OPTIONS.map((o) => ({
            key: o.key,
            label: `${o.value} MPa — ${o.label}`,
          }))}
        />
        <SelectField
          label="Joint efficiency (E)"
          helper="AS 1210 Table 3.5.1.7"
          value={jointEfficiencyKey}
          onChange={setJointEfficiencyKey}
          options={JOINT_EFFICIENCY_OPTIONS.map((o) => ({
            key: o.key,
            label: `${o.value.toFixed(2)} — ${o.label}`,
          }))}
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
            <Stat
              label="Minimum wall thickness"
              value={`${result.tMin.toFixed(3)} mm`}
            />
          </dl>
        ) : (
          <EmptyState>Enter all required values to calculate.</EmptyState>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-500">
        Guidance only — S options assume Class 1/2A/2B/3 carbon/C-Mn plate at
        50°C; for thicker plate, hotter service, or other materials and
        classes confirm against the vessel&apos;s manufacturer&apos;s data
        report or AS 1210 directly before relying on this result for a
        fitness-for-service decision.
      </p>
    </div>
  );
}
