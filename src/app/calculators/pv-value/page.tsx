"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NumberField } from "@/components/calculators/NumberField";
import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Card } from "@/components/calculators/Card";
import { ResultStat } from "@/components/calculators/ResultStat";
import { EmptyState } from "@/components/calculators/EmptyState";
import {
  getInspectionRequirement,
  type EquipmentCategory,
} from "@/lib/calculators/inspectionPeriods";

const EQUIPMENT_CATEGORY_OPTIONS: { value: EquipmentCategory; label: string }[] = [
  {
    value: "compressed-air-vessel",
    label: "Compressed air containing vessel (e.g. air receiver)",
  },
  {
    value: "auxiliary-vessel-other",
    label: "Auxiliary vessel — e.g. intercooler, knock-out vessel, filter",
  },
  {
    value: "auxiliary-vessel-accumulator",
    label: "Accumulator — non-corrosive, non-toxic, non-flammable contents",
  },
  { value: "process-vessel", label: "Process vessel" },
  { value: "steam-pressure-vessel", label: "Steam pressure vessel" },
  {
    value: "boiler-other",
    label: "Boiler — all other types (incl. unattended/limited attendance)",
  },
  { value: "boiler-electric", label: "Boiler — electric" },
  {
    value: "boiler-coil-forced-circulation",
    label: "Boiler — coil-type forced circulation",
  },
];

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export default function PvValueCalculator() {
  const [pressureKPa, setPressureKPa] = useState("");
  const [volume, setVolume] = useState("");
  const [equipmentCategory, setEquipmentCategory] = useState<EquipmentCategory>(
    "compressed-air-vessel",
  );

  const pvMPaL = useMemo(() => {
    const pKPa = parseOptionalNumber(pressureKPa);
    const v = parseOptionalNumber(volume);
    if (pKPa === null || v === null || pKPa <= 0 || v <= 0) return null;
    return (pKPa / 1000) * v;
  }, [pressureKPa, volume]);

  const inspection = useMemo(() => {
    if (pvMPaL === null) return null;
    return getInspectionRequirement(equipmentCategory, pvMPaL);
  }, [equipmentCategory, pvMPaL]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <CalculatorHeader
        eyebrow="AS/NZS 3788:2001 — Table 4.1"
        title="PV value"
        description={
          <>
            PV = design pressure × volume, uncorrected — the figure AS/NZS
            3788:2001 Table 4.1 uses to set inspection periods. This is not
            the AS 4343 hazard level H (which also multiplies by contents
            and location/service factors) — use the{" "}
            <Link
              href="/calculators/pressure-equipment-hazard-level"
              className="text-amber-600 underline dark:text-amber-400"
            >
              hazard level calculator
            </Link>{" "}
            for hazard level A–E and design registration questions.
          </>
        }
      />

      <Card className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Design pressure"
          unit="kPa"
          value={pressureKPa}
          onChange={setPressureKPa}
          placeholder="e.g. 1000"
        />
        <NumberField
          label="Volume (V)"
          unit="L"
          value={volume}
          onChange={setVolume}
          placeholder="e.g. 45"
        />
      </Card>

      <Card>
        {pvMPaL !== null ? (
          <dl>
            <ResultStat label="PV value" value={`${pvMPaL.toFixed(1)} MPa·L`} />
          </dl>
        ) : (
          <EmptyState>Enter design pressure and volume to calculate.</EmptyState>
        )}
      </Card>

      {pvMPaL !== null && (
        <Card className="space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Inspection requirements (AS/NZS 3788:2001 Table 4.1)
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Pick the category that matches this item.
            </p>
          </div>

          <div className="space-y-2">
            {EQUIPMENT_CATEGORY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <input
                  type="radio"
                  name="equipmentCategory"
                  className="mt-1 accent-amber-500"
                  checked={equipmentCategory === opt.value}
                  onChange={() => setEquipmentCategory(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          {inspection && inspection.lowRiskNote ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Low risk under normal operation — this equipment would not
              normally need to be inspected during its lifetime by the
              inspector (Table 4.1 Note 14). The owner must still keep it in
              a fit and safe condition through regular in-house surveillance.
              {inspection.commissioningRequired
                ? " A commissioning inspection is still required."
                : ""}
            </p>
          ) : (
            inspection && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ResultStat
                  label="Commissioning inspection"
                  value={inspection.commissioningRequired ? "Required" : "Not required"}
                />
                <ResultStat
                  label="First-year inspection"
                  value={inspection.firstYearlyRequired ? "Required" : "Not required"}
                />
                <ResultStat
                  label="External inspection"
                  value={
                    inspection.externalPeriodYears !== null
                      ? `Every ${inspection.externalPeriodYears} years`
                      : "—"
                  }
                />
                <ResultStat
                  label="Internal inspection"
                  value={
                    inspection.internalNominalYears !== null
                      ? `Nominal ${inspection.internalNominalYears} yr / extended ${inspection.internalExtendedYears} yr`
                      : "—"
                  }
                />
              </dl>
            )
          )}

          {inspection?.extraNote && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {inspection.extraNote}
            </p>
          )}
        </Card>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-500">
        Guidance only. Hazard level (A–E) and design registration
        obligations depend on the full AS 4343:2014 numerical method, not on
        PV alone — confirm with a qualified in-service inspector or your
        State/Territory regulator.
      </p>
    </div>
  );
}
