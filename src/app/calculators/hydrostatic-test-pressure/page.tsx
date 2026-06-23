"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export default function HydrostaticTestPressureCalculator() {
  const [mawp, setMawp] = useState("");
  const [stressTest, setStressTest] = useState("");
  const [stressDesign, setStressDesign] = useState("");

  const result = useMemo(() => {
    const mawpValue = parseOptionalNumber(mawp);
    if (mawpValue === null || mawpValue <= 0) return null;

    const sTest = parseOptionalNumber(stressTest);
    const sDesign = parseOptionalNumber(stressDesign);
    const ratioEntered = sTest !== null && sDesign !== null;
    if ((sTest !== null) !== (sDesign !== null)) return null;
    if (ratioEntered && (sTest! <= 0 || sDesign! <= 0)) return null;

    const stressRatio = ratioEntered ? sTest! / sDesign! : 1;
    const testPressure = 1.5 * mawpValue * stressRatio;

    return { testPressure, stressRatio, ratioEntered };
  }, [mawp, stressTest, stressDesign]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="AS 1210"
        title="Hydrostatic test pressure"
        description="P_test = 1.5 × MAWP × (S_test / S_design). Required after manufacture, after weld repairs, or when mandated by AS 3788. Leave the stress fields blank if the vessel only ever sees ambient temperature (stress ratio = 1)."
      />

      <Card className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="MAWP"
          unit="kPa"
          value={mawp}
          onChange={setMawp}
          placeholder="e.g. 1000"
        />
        <NumberField
          label="Stress at test temperature (S_test)"
          unit="MPa"
          value={stressTest}
          onChange={setStressTest}
          placeholder="optional"
        />
        <NumberField
          label="Stress at design temperature (S_design)"
          unit="MPa"
          value={stressDesign}
          onChange={setStressDesign}
          placeholder="optional"
        />
      </Card>

      <Card>
        {result ? (
          <div className="space-y-3">
            <dl>
              <Stat
                label="Hydrostatic test pressure"
                value={`${result.testPressure.toFixed(0)} kPa`}
              />
            </dl>
            {!result.ratioEntered && (
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Stress ratio not entered — assumed 1.0 (ambient-only
                service).
              </p>
            )}
          </div>
        ) : (
          <EmptyState>Enter MAWP to calculate.</EmptyState>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-500">
        Guidance only — confirm against the vessel&apos;s manufacturer&apos;s
        data report and AS 1210 before testing, and ensure the test is
        conducted and witnessed in accordance with AS 3788 requirements.
      </p>
    </div>
  );
}
