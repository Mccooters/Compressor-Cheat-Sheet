"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Card } from "@/components/calculators/Card";
import { ResultStat } from "@/components/calculators/ResultStat";
import { EmptyState } from "@/components/calculators/EmptyState";

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export default function SrvSetPressureVerificationCalculator() {
  const [designPressure, setDesignPressure] = useState("");
  const [mawp, setMawp] = useState("");
  const [srvSetPressure, setSrvSetPressure] = useState("");

  const result = useMemo(() => {
    const design = parseOptionalNumber(designPressure);
    const srv = parseOptionalNumber(srvSetPressure);
    if (design === null || srv === null || design <= 0 || srv <= 0) return null;

    const mawpInput = parseOptionalNumber(mawp);
    const mawpValue = mawpInput ?? design;
    const overpressureLimit = design * 1.1;

    const passesDesign = srv <= design;
    const passesMawp = srv <= mawpValue;
    const passesOverpressureLimit = srv <= overpressureLimit;

    return {
      mawpValue,
      mawpDefaulted: mawpInput === null,
      overpressureLimit,
      passesDesign,
      passesMawp,
      passesOverpressureLimit,
      passes: passesDesign && passesMawp && passesOverpressureLimit,
    };
  }, [designPressure, mawp, srvSetPressure]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <CalculatorHeader
        eyebrow="AS 1210"
        title="SRV set pressure verification"
        description="Confirms the SRV set pressure doesn't exceed the vessel's design pressure or MAWP, and that relief occurs before pressure exceeds 110% of design pressure."
      />

      <Card className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Design pressure"
          unit="kPa"
          value={designPressure}
          onChange={setDesignPressure}
          placeholder="e.g. 1000"
        />
        <NumberField
          label="MAWP"
          unit="kPa"
          helper="defaults to design pressure"
          value={mawp}
          onChange={setMawp}
          placeholder="leave blank if no derating"
        />
        <NumberField
          label="SRV set pressure"
          unit="kPa"
          value={srvSetPressure}
          onChange={setSrvSetPressure}
          placeholder="e.g. 1000"
        />
      </Card>

      <Card className="space-y-4">
        {result ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2">
              <ResultStat
                label="MAWP used"
                value={`${result.mawpValue.toFixed(0)} kPa${
                  result.mawpDefaulted ? " (defaulted)" : ""
                }`}
              />
              <ResultStat
                label="110% design pressure ceiling"
                value={`${result.overpressureLimit.toFixed(0)} kPa`}
              />
            </dl>

            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              <CheckItem
                passed={result.passesDesign}
                label="SRV set pressure ≤ design pressure"
              />
              <CheckItem
                passed={result.passesMawp}
                label="SRV set pressure ≤ MAWP"
              />
              <CheckItem
                passed={result.passesOverpressureLimit}
                label="SRV set pressure ≤ 110% of design pressure"
              />
            </ul>

            <div
              className={`rounded-md border p-3 text-sm font-medium ${
                result.passes
                  ? "border-green-300 text-green-700 dark:border-green-800 dark:text-green-400"
                  : "border-red-300 text-red-700 dark:border-red-800 dark:text-red-400"
              }`}
            >
              {result.passes
                ? "PASS — SRV set pressure is within all checked limits."
                : "FAIL — SRV set pressure exceeds one or more limits above."}
            </div>
          </>
        ) : (
          <EmptyState>Enter all required values to verify.</EmptyState>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-500">
        Guidance only. This checks the set-pressure trigger thresholds only
        — it doesn&apos;t verify relieving capacity (flow) against the
        vessel&apos;s required relief rate, which a qualified engineer must
        size separately.
      </p>
    </div>
  );
}

function CheckItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={
          passed
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }
      >
        {passed ? "✓" : "✗"}
      </span>
      {label}
    </li>
  );
}
