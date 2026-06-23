"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NumberField } from "@/components/calculators/NumberField";
import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Card } from "@/components/calculators/Card";
import { EmptyState } from "@/components/calculators/EmptyState";
import {
  calculateHazardLevel,
  type ContentState,
  type Harmfulness,
} from "@/lib/calculators/hazardLevel";

const STATE_OPTIONS: { value: ContentState; label: string }[] = [
  { value: "gas", label: "Gas" },
  { value: "liquid", label: "Liquid" },
  { value: "vacuum", label: "Vacuum" },
];

const HARMFULNESS_OPTIONS: { value: Harmfulness; label: string }[] = [
  { value: "non-harmful", label: "Non-harmful (e.g. compressed air)" },
  { value: "harmful", label: "Harmful" },
  { value: "very-harmful", label: "Very harmful" },
  { value: "lethal", label: "Lethal" },
];

const HAZARD_LEVEL_DESCRIPTIONS: Record<string, string> = {
  A: "High hazard — large vessels and equipment above major hazard facility threshold quantities.",
  B: "Medium hazard — applies to most shop-fabricated boilers and pressure vessels.",
  C: "Low hazard — small pressure equipment or equipment with low-hazard contents.",
  D: "Extra low hazard — small pressure equipment or low-hazard contents (e.g. small air receivers).",
  E: "Negligible hazard — usually exempt from special regulatory control.",
};

const TOGGLE_ACTIVE =
  "bg-amber-500 text-slate-950 dark:bg-amber-400 dark:text-slate-950";
const TOGGLE_INACTIVE =
  "border border-slate-300 text-slate-600 hover:border-amber-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-amber-500/60";

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export default function QuickHazardLevelCalculator() {
  const [pressureKPa, setPressureKPa] = useState("");
  const [volume, setVolume] = useState("");
  const [state, setState] = useState<ContentState>("gas");
  const [harmfulness, setHarmfulness] = useState<Harmfulness>("non-harmful");

  const result = useMemo(() => {
    const pKPa = parseOptionalNumber(pressureKPa);
    const v = parseOptionalNumber(volume);
    if (pKPa === null || v === null || pKPa <= 0 || v <= 0) return null;

    return calculateHazardLevel({
      designPressureMPa: pKPa / 1000,
      volumeLitres: v,
      state,
      harmfulness,
      isAir: true,
      designTemperatureC: null,
      conditionsA: [false, false, false, false, false],
      conditionsC: [false, false, false],
    });
  }, [pressureKPa, volume, state, harmfulness]);

  const requiresRegistration =
    result?.hazardLevel === "A" ||
    result?.hazardLevel === "B" ||
    result?.hazardLevel === "C";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <CalculatorHeader
        eyebrow="AS 4343:2014 — quick estimate"
        title="Quick hazard level"
        description={
          <>
            Fast hazard level A–E estimate from design pressure, volume,
            contents state, and harmfulness. Assumes no special
            location/service conditions and skips temperature checks — for
            the full method (all conditions, inspection periods), use the{" "}
            <Link
              href="/calculators/pressure-equipment-hazard-level"
              className="text-amber-600 underline dark:text-amber-400"
            >
              complete calculator
            </Link>{" "}
            on the{" "}
            <Link
              href="/pressure-vessel-inspection"
              className="text-amber-600 underline dark:text-amber-400"
            >
              Pressure Vessel Inspection
            </Link>{" "}
            page.
          </>
        }
      />

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Design pressure"
            unit="kPa"
            value={pressureKPa}
            onChange={setPressureKPa}
            placeholder="e.g. 1380"
          />
          <NumberField
            label="Vessel volume (V)"
            unit="L"
            value={volume}
            onChange={setVolume}
            placeholder="e.g. 500"
          />
        </div>

        <div className="flex gap-2">
          {STATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setState(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                state === opt.value ? TOGGLE_ACTIVE : TOGGLE_INACTIVE
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {HARMFULNESS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <input
                type="radio"
                name="harmfulness"
                className="accent-amber-500"
                checked={harmfulness === opt.value}
                onChange={() => setHarmfulness(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        {result ? (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white dark:bg-white dark:text-slate-900">
                {result.hazardLevel}
              </span>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {HAZARD_LEVEL_DESCRIPTIONS[result.hazardLevel]}
              </p>
            </div>

            <div
              className={`rounded-md border p-3 text-sm ${
                requiresRegistration
                  ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                  : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400"
              }`}
            >
              {requiresRegistration
                ? `Hazard level ${result.hazardLevel} pressure equipment is registrable plant under the model WHS Regulations — design registration is required.`
                : `Hazard level ${result.hazardLevel} pressure equipment isn't registrable plant under the model WHS Regulations.`}
            </div>
          </>
        ) : (
          <EmptyState>Enter design pressure and volume to calculate.</EmptyState>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-500">
        Guidance only — a quick estimate, not a substitute for the full AS
        4343:2014 assessment or a qualified review. Location/service
        conditions or temperature extremes can change the result.
      </p>
    </div>
  );
}
