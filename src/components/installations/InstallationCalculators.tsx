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
    </div>
  );
}
