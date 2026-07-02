"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { Field, fieldInputClass } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";

// AS 1345 — max 8 m on straight runs, plus one at every junction, valve,
// service appliance, bulkhead and wall/floor penetration (those extra points
// aren't counted here since they depend on the actual run, not its length).
const STICKER_MAX_SPACING_M = 8;

type Material = "copper" | "stainless" | "airnet";

// AACPR-017 Table 4.1 (per AS 4809:2017 Table 6.2) — max spacing for
// brackets/clips, DN (mm) -> metres.
const COPPER_SPACING_M: Record<string, { horizontal: number; vertical: number }> = {
  "15": { horizontal: 1.5, vertical: 1.8 },
  "20": { horizontal: 1.5, vertical: 2 },
  "25": { horizontal: 2, vertical: 2.5 },
  "32": { horizontal: 2.5, vertical: 2.5 },
  "40": { horizontal: 2.5, vertical: 3 },
  "50": { horizontal: 3, vertical: 3 },
  "65": { horizontal: 3, vertical: 3.5 },
  "80": { horizontal: 3, vertical: 3.5 },
  "100": { horizontal: 3, vertical: 4 },
  "150": { horizontal: 3, vertical: 4 },
  "200": { horizontal: 3, vertical: 4 },
  "250": { horizontal: 3, vertical: 4 },
};

// AACPR-018 "Stainless Pipe Hanger Spacing" support spacing table, tube
// size (mm) -> metres (single value, no horizontal/vertical split).
const STAINLESS_SPACING_M: Record<string, number> = {
  "15": 1,
  "22": 1.5,
  "28": 1.8,
  "35": 2.2,
  "42": 2.4,
  "54": 2.7,
  "76": 3,
  "89": 3,
  "108": 3,
};

// AIRnet Installation & Assembly Guide, "Pipe Clips Installation" (Rule #2)
// — flat max 2.5 m between clips, the same for every diameter 20-158 mm.
const AIRNET_SPACING_M = 2.5;

// Pipe pressure test multipliers per AS 4041 (pressure piping).
// Pneumatic leak test: 1.1 × DP — lower multiplier because compressed gas
// stores far more energy than water. Hydraulic strength test: 1.5 × DP.
const PIPE_TEST_TYPES = [
  {
    key: "pneumatic",
    label: "Pneumatic (air/gas) — leak test  ×1.1",
    multiplier: 1.1,
    hold: "30 min minimum",
    safetyNote:
      "Approach the pressurised system slowly. Never stand directly in line with joints or fittings during pressurisation. Use leak-detection fluid — do not probe with hands.",
  },
  {
    key: "hydraulic",
    label: "Hydraulic (water) — strength test  ×1.5",
    multiplier: 1.5,
    hold: "30 min minimum",
    safetyNote:
      "Preferred where practicable. Water is incompressible so a failure releases far less stored energy than a pneumatic test.",
  },
] as const;

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function InstallationCalculators() {
  // Sticker / identification marker spacing (AS 1345)
  const [runLength, setRunLength] = useState("");
  const stickerCount = useMemo(() => {
    const length = parseOptionalNumber(runLength);
    if (length === null || length <= 0) return null;
    return Math.ceil(length / STICKER_MAX_SPACING_M) + 1;
  }, [runLength]);

  // Pipe hanger / support spacing
  const [material, setMaterial] = useState<Material>("copper");
  const [size, setSize] = useState("15");
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [hangerRunLength, setHangerRunLength] = useState("");

  const sizeOptions =
    material === "copper"
      ? Object.keys(COPPER_SPACING_M)
      : material === "stainless"
        ? Object.keys(STAINLESS_SPACING_M)
        : [];

  const maxSpacingM = useMemo(() => {
    if (material === "copper") {
      return COPPER_SPACING_M[size]?.[orientation] ?? null;
    }
    if (material === "stainless") {
      return STAINLESS_SPACING_M[size] ?? null;
    }
    return AIRNET_SPACING_M;
  }, [material, size, orientation]);

  const supportCount = useMemo(() => {
    const length = parseOptionalNumber(hangerRunLength);
    if (length === null || length <= 0 || maxSpacingM === null) return null;
    return Math.ceil(length / maxSpacingM) + 1;
  }, [hangerRunLength, maxSpacingM]);

  // Pipe pressure test
  const [testTypeKey, setTestTypeKey] = useState<"pneumatic" | "hydraulic">("pneumatic");
  const [designPressure, setDesignPressure] = useState("");
  const [componentRating, setComponentRating] = useState("");

  const testType = PIPE_TEST_TYPES.find((t) => t.key === testTypeKey)!;

  const pipeTestResult = useMemo(() => {
    const dp = parseOptionalNumber(designPressure);
    if (dp === null || dp <= 0) return null;
    const testPressureKpa = dp * testType.multiplier;
    const testPressureBar = testPressureKpa / 100;
    const testPressurePsi = testPressureKpa * 0.14504;
    const rating = parseOptionalNumber(componentRating);
    const exceedsRating = rating !== null && testPressureKpa > rating;
    return { testPressureKpa, testPressureBar, testPressurePsi, exceedsRating, rating };
  }, [designPressure, testType, componentRating]);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Card className="space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">
          Identification sticker spacing
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          AS 1345 — max {STICKER_MAX_SPACING_M} m on straight runs, plus one at
          every junction, valve, service appliance, bulkhead and wall/floor
          penetration.
        </p>
        <NumberField
          label="Straight run length"
          unit="m"
          value={runLength}
          onChange={setRunLength}
          placeholder="e.g. 25"
        />
        {stickerCount === null ? (
          <EmptyState>Enter a run length to calculate.</EmptyState>
        ) : (
          <Stat label="Minimum stickers" value={`${stickerCount}`} />
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">
          Pipe hanger / support spacing
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Copper per AACPR-017 (AS 4809:2017 Table 6.2). Stainless per
          AACPR-018 support spacing table. AIRnet per its Pipe Clips
          Installation guide — flat {AIRNET_SPACING_M} m max for every
          diameter.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className={material === "airnet" ? "col-span-2" : undefined}>
            <Field label="Material">
              <select
                className={fieldInputClass}
                value={material}
                onChange={(e) => {
                  const next = e.target.value as Material;
                  setMaterial(next);
                  if (next === "copper")
                    setSize(Object.keys(COPPER_SPACING_M)[0]);
                  if (next === "stainless")
                    setSize(Object.keys(STAINLESS_SPACING_M)[0]);
                }}
              >
                <option value="copper">Copper</option>
                <option value="stainless">Stainless</option>
                <option value="airnet">AIRnet</option>
              </select>
            </Field>
          </div>

          {material !== "airnet" && (
            <Field label={material === "copper" ? "DN size" : "Tube size"}>
              <select
                className={fieldInputClass}
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                {sizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} mm
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {material === "copper" && (
          <Field label="Orientation">
            <select
              className={fieldInputClass}
              value={orientation}
              onChange={(e) =>
                setOrientation(e.target.value as "horizontal" | "vertical")
              }
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </Field>
        )}

        <NumberField
          label="Pipe run length (optional)"
          unit="m"
          value={hangerRunLength}
          onChange={setHangerRunLength}
          placeholder="e.g. 12"
        />

        <dl className="space-y-2">
          <Stat
            label="Max support spacing"
            value={maxSpacingM !== null ? `${maxSpacingM} m` : "—"}
          />
          {supportCount !== null && (
            <Stat label="Minimum supports" value={`${supportCount}`} />
          )}
        </dl>
      </Card>

      {/* Pipe pressure test — spans full width */}
      <Card className="space-y-4 sm:col-span-2">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Pipe pressure test
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            AS 4041 — pneumatic leak test at 1.1 × design pressure; hydraulic
            strength test at 1.5 × design pressure.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Test type">
            <select
              className={fieldInputClass}
              value={testTypeKey}
              onChange={(e) => setTestTypeKey(e.target.value as "pneumatic" | "hydraulic")}
            >
              {PIPE_TEST_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <NumberField
            label="System design pressure"
            unit="kPa"
            value={designPressure}
            onChange={setDesignPressure}
            placeholder="e.g. 1000"
          />

          <NumberField
            label="Weakest component rating (optional)"
            unit="kPa"
            helper="triggers warning if test pressure exceeds this"
            value={componentRating}
            onChange={setComponentRating}
            placeholder="e.g. 1400"
          />
        </div>

        {pipeTestResult ? (
          <div className="space-y-3">
            {pipeTestResult.exceedsRating && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
                Warning — test pressure ({pipeTestResult.testPressureKpa.toFixed(0)} kPa) exceeds
                the entered component rating ({pipeTestResult.rating} kPa). Isolate or remove
                under-rated components before testing.
              </div>
            )}
            <dl className="grid gap-2 sm:grid-cols-4">
              <Stat
                label="Test pressure"
                value={`${pipeTestResult.testPressureKpa.toFixed(0)} kPa`}
              />
              <Stat
                label="Test pressure"
                value={`${pipeTestResult.testPressureBar.toFixed(2)} bar`}
              />
              <Stat
                label="Test pressure"
                value={`${pipeTestResult.testPressurePsi.toFixed(1)} psi`}
              />
              <Stat label="Minimum hold time" value={testType.hold} />
            </dl>
            <p className="text-xs text-orange-700 dark:text-orange-400">
              {testType.safetyNote}
            </p>
          </div>
        ) : (
          <EmptyState>Enter system design pressure to calculate.</EmptyState>
        )}
      </Card>
    </div>
  );
}
