"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { SelectField } from "@/components/calculators/SelectField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";
import { calculateMAWP } from "@/lib/calculators/wallThickness";
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

export default function MawpCalculator() {
  const [thickness, setThickness] = useState("");
  const [diameter, setDiameter] = useState("");
  const [stressKey, setStressKey] = useState(DEFAULT_ALLOWABLE_STRESS_KEY);
  const [jointEfficiencyKey, setJointEfficiencyKey] = useState(DEFAULT_JOINT_EFFICIENCY_KEY);
  const [tempCoefficient, setTempCoefficient] = useState("0.4");

  const result = useMemo(() => {
    const t = parseOptionalNumber(thickness);
    const d = parseOptionalNumber(diameter);
    const s = allowableStressValue(stressKey);
    const e = jointEfficiencyValue(jointEfficiencyKey);
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
  }, [thickness, diameter, stressKey, jointEfficiencyKey, tempCoefficient]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
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
          <dl className="grid gap-3 sm:grid-cols-2">
            <Stat label="MAWP" value={`${result.mawpMPa.toFixed(3)} MPa`} />
            <Stat label="MAWP" value={`${result.mawpKPa.toFixed(0)} kPa`} />
          </dl>
        ) : (
          <EmptyState>Enter all required values to calculate.</EmptyState>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-500">
        Guidance only. S options assume Class 1/2A/2B/3 carbon/C-Mn plate at
        50°C — confirm against the vessel&apos;s manufacturer&apos;s data
        report or AS 1210 directly for other materials, classes, or hot
        service. Where UT reveals localised pitting rather than uniform
        loss, this uniform-thickness formula may overstate MAWP — a formal
        fitness-for-service evaluation by a qualified engineer is required
        before returning a corroded vessel to service at any pressure.
      </p>
    </div>
  );
}
