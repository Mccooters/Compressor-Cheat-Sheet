"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NumberField } from "@/components/calculators/NumberField";
import { DateField } from "@/components/calculators/DateField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";
import { calculateCorrosionRate } from "@/lib/calculators/corrosionRate";

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export default function CorrosionRateCalculator() {
  const [previousDate, setPreviousDate] = useState("");
  const [previousThickness, setPreviousThickness] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [currentThickness, setCurrentThickness] = useState("");
  const [minThickness, setMinThickness] = useState("");

  const result = useMemo(() => {
    const tPrev = parseOptionalNumber(previousThickness);
    const tCurr = parseOptionalNumber(currentThickness);
    const tMin = parseOptionalNumber(minThickness);
    if (
      tPrev === null ||
      tCurr === null ||
      tMin === null ||
      previousDate === "" ||
      currentDate === "" ||
      tPrev <= 0 ||
      tCurr <= 0 ||
      tMin <= 0
    ) {
      return null;
    }

    return calculateCorrosionRate({
      previousThicknessMm: tPrev,
      previousInspectionDate: previousDate,
      currentThicknessMm: tCurr,
      currentInspectionDate: currentDate,
      minThicknessMm: tMin,
    });
  }, [previousDate, previousThickness, currentDate, currentThickness, minThickness]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="AS 3788:2001 — Table 4.1"
        title="Corrosion rate & remaining life"
        description={
          <>
            From two UT readings taken at the same Condition Monitoring
            Location: corrosion rate = (t_previous − t_current) / years
            between readings; remaining life = (t_current − t_min) /
            corrosion rate. Get t_min from the{" "}
            <Link
              href="/calculators/minimum-wall-thickness"
              className="text-orange-600 underline dark:text-orange-400"
            >
              minimum wall thickness calculator
            </Link>{" "}
            if it isn&apos;t already on the vessel&apos;s manufacturer&apos;s
            data report.
          </>
        }
      />

      <Card className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="Previous inspection date"
          helper="from last UT inspection"
          value={previousDate}
          onChange={setPreviousDate}
        />
        <NumberField
          label="Previous wall thickness (t₁)"
          unit="mm"
          value={previousThickness}
          onChange={setPreviousThickness}
          placeholder="e.g. 5.0"
        />
        <DateField
          label="Current inspection date"
          helper="from this inspection"
          value={currentDate}
          onChange={setCurrentDate}
        />
        <NumberField
          label="Current wall thickness (t₂)"
          unit="mm"
          value={currentThickness}
          onChange={setCurrentThickness}
          placeholder="e.g. 4.6"
        />
        <NumberField
          label="Minimum required thickness (t_min)"
          unit="mm"
          helper="from design docs or AS 1210 calc"
          value={minThickness}
          onChange={setMinThickness}
          placeholder="e.g. 3.2"
        />
      </Card>

      <Card>
        {result && "error" in result ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {result.error}
          </p>
        ) : result ? (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Stat
                label="Years between inspections"
                value={`${result.yearsBetweenInspections.toFixed(2)} yr`}
              />
              <Stat
                label="Corrosion rate"
                value={`${result.corrosionRateMmPerYear.toFixed(4)} mm/yr`}
              />
            </dl>

            {result.remainingLifeYears === null ? (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                No measurable thickness loss between readings — corrosion
                rate can&apos;t be calculated from this pair. Fall back to
                the standard AS/NZS 3788 inspection interval rather than a
                calculated remaining life.
              </p>
            ) : result.remainingLifeYears <= 0 ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                Current thickness is already at or below the minimum
                allowable thickness. The vessel may need to be derated,
                repaired, or removed from service — get a formal
                fitness-for-service assessment before continuing operation.
              </p>
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2">
                <Stat
                  label="Remaining life"
                  value={`${result.remainingLifeYears.toFixed(1)} yr`}
                />
                <Stat
                  label="Next inspection date"
                  value={result.nextInspectionDate ?? "—"}
                />
              </dl>
            )}
          </div>
        ) : (
          <EmptyState>Enter all required values to calculate.</EmptyState>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-500">
        Guidance only. The half-remaining-life next-inspection date is a
        commonly used conservative practice, not a clause of AS/NZS
        3788:2001 — it still can&apos;t exceed the Standard&apos;s maximum
        internal inspection interval for the equipment category, and a
        qualified in-service inspector should confirm the final interval.
      </p>
    </div>
  );
}
