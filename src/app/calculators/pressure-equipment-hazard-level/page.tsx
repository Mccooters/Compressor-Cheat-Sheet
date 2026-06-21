"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import {
  calculateHazardLevel,
  type ContentState,
  type Harmfulness,
} from "@/lib/calculators/hazardLevel";
import {
  getInspectionRequirement,
  type EquipmentCategory,
} from "@/lib/calculators/inspectionPeriods";

const STATE_OPTIONS: { value: ContentState; label: string }[] = [
  { value: "gas", label: "Gas" },
  { value: "liquid", label: "Liquid" },
  { value: "vacuum", label: "Vacuum" },
];

const HARMFULNESS_OPTIONS: {
  value: Harmfulness;
  label: string;
  description: string;
}[] = [
  {
    value: "non-harmful",
    label: "Non-harmful",
    description:
      "Not lethal, very harmful, or harmful — normally safe except for pressure or concentration effects (e.g. oxygen depletion). Compressed air is the typical example.",
  },
  {
    value: "harmful",
    label: "Harmful",
    description:
      "A combustible liquid, an irritant, harmful to the environment, or contents above 90°C / below −30°C (excluding lethal or very harmful contents).",
  },
  {
    value: "very-harmful",
    label: "Very harmful",
    description:
      "Extremely or highly flammable, very toxic, toxic, harmful, oxidizing, explosive, self-reactive, corrosive, or harmful to human tissue (excluding lethal contents).",
  },
  {
    value: "lethal",
    label: "Lethal",
    description:
      "A very toxic or highly radioactive substance capable of causing death or serious irreversible harm from a single short-term exposure to a very small amount (e.g. acrolein, chloropicrin).",
  },
];

const CONDITIONS_A = [
  "Fired equipment heated by products of combustion, electric heating, or focused solar (not steam, air, hot water, or microwave)",
  "Fitted with quick-actuating closures or doors (except vacuum vessels)",
  "Sited at a facility regulated as a major hazard facility",
  "Road tanker or transportable vessel transporting contents under pressure, volume > 200 L",
  "Intended for human occupancy, design pressure > 0.01 MPa, non-harmful gas",
];

const CONDITIONS_C = [
  "Located where employees aren't permanently stationed and which is remote from other buildings, processes, or persons",
  "Buried / covered in trenches (piping), or sufficiently safeguarded e.g. a purpose-built bunker (vessels)",
  "Maximum membrane stress (corroded) ≤ 50 MPa, 20% of specified minimum yield stress at design temperature, or 50% of permissible design strength (f) — whichever is less",
];

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

const HAZARD_LEVEL_DESCRIPTIONS: Record<string, string> = {
  A: "High hazard — large vessels (e.g. large ethane/butane/propane/ammonia/chlorine vessels, large power boilers) and equipment above major hazard facility threshold quantities.",
  B: "Medium hazard — applies to most shop-fabricated boilers and pressure vessels.",
  C: "Low hazard — small pressure equipment or equipment with low-hazard contents.",
  D: "Extra low hazard — small pressure equipment or low-hazard contents (e.g. small air receivers).",
  E: "Negligible hazard — usually exempt from special regulatory control, but covered by general plant safety regulations.",
};

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function formatScientific(n: number): string {
  if (n === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(n)));
  const mantissa = n / Math.pow(10, exponent);
  return `${mantissa.toFixed(2)} × 10^${exponent}`;
}

function formatFactor(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

export default function PressureEquipmentHazardLevelCalculator() {
  const [pressureKPa, setPressureKPa] = useState("");
  const [volume, setVolume] = useState("");
  const [state, setState] = useState<ContentState>("gas");
  const [isAir, setIsAir] = useState(true);
  const [temperature, setTemperature] = useState("");
  const [harmfulness, setHarmfulness] = useState<Harmfulness>("non-harmful");
  const [conditionsA, setConditionsA] = useState(CONDITIONS_A.map(() => false));
  const [conditionsC, setConditionsC] = useState(CONDITIONS_C.map(() => false));
  const [equipmentCategory, setEquipmentCategory] = useState<EquipmentCategory>(
    "compressed-air-vessel",
  );

  const result = useMemo(() => {
    const pKPa = parseOptionalNumber(pressureKPa);
    const v = parseOptionalNumber(volume);
    if (pKPa === null || v === null || pKPa <= 0 || v <= 0) return null;

    return calculateHazardLevel({
      designPressureMPa: pKPa / 1000,
      volumeLitres: v,
      state,
      harmfulness,
      isAir,
      designTemperatureC: parseOptionalNumber(temperature),
      conditionsA,
      conditionsC,
    });
  }, [pressureKPa, volume, state, harmfulness, isAir, temperature, conditionsA, conditionsC]);

  function toggleA(index: number) {
    setConditionsA((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }
  function toggleC(index: number) {
    setConditionsC((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  const isFiredEquipment = conditionsA[0];
  const pMPaForFsB = parseOptionalNumber(pressureKPa);
  const showFsBNote = pMPaForFsB !== null && pMPaForFsB / 1000 > 50;

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
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">
          Pressure equipment hazard level (AS 4343:2014)
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Numerical method (Clause 2.2, Equation 2.1) for pressure vessels and
          boilers. Pressure piping uses a different tabular method (Appendix
          B) with its own breakpoints and isn&apos;t covered here.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-medium">Design parameters</h2>
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
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Contents</h2>
        <div className="flex gap-2">
          {STATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setState(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                state === opt.value
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "border border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAir}
            onChange={(e) => setIsAir(e.target.checked)}
          />
          Contents is air (uses the extended 120°C threshold per Clause 3.2.6,
          instead of 90°C)
        </label>

        <NumberField
          label="Design temperature (optional — checks Clause 3.2.6 thresholds)"
          unit="°C"
          value={temperature}
          onChange={setTemperature}
          placeholder="e.g. 20"
        />

        <div className="space-y-2">
          {HARMFULNESS_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="harmfulness"
                className="mt-1"
                checked={harmfulness === opt.value}
                onChange={() => setHarmfulness(opt.value)}
              />
              <span>
                <span className="font-medium">{opt.label}</span>
                {" — "}
                <span className="text-neutral-600 dark:text-neutral-400">
                  {opt.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Location / service factor</h2>

        <div className="space-y-2">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Conditions that increase the hazard level (Clause 2.2.5(a)):
          </p>
          {CONDITIONS_A.map((text, i) => (
            <label key={text} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={conditionsA[i]}
                onChange={() => toggleA(i)}
              />
              {text}
            </label>
          ))}
        </div>

        {showFsBNote && (
          <p className="text-sm text-amber-600">
            Design pressure exceeds 50 MPa — a ×30 factor is applied
            automatically (Clause 2.2.5(b)).
          </p>
        )}

        <div className="space-y-2">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Conditions that reduce the hazard level (Clause 2.2.5(c)) — ignored
            for fired equipment:
          </p>
          {CONDITIONS_C.map((text, i) => (
            <label
              key={text}
              className={`flex items-start gap-2 text-sm ${
                isFiredEquipment ? "opacity-50" : ""
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={conditionsC[i]}
                disabled={isFiredEquipment}
                onChange={() => toggleC(i)}
              />
              {text}
            </label>
          ))}
        </div>
      </section>

      {result && (
        <section className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-medium">Result</h2>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Result label="Fc" value={formatFactor(result.Fc)} />
            <Result label="Ff" value={formatFactor(result.Ff)} />
            <Result
              label="Fs"
              value={`${formatFactor(result.FsA)} × ${formatFactor(
                result.FsB,
              )} × ${formatFactor(result.FsC)} = ${formatFactor(result.Fs)}`}
            />
            <Result label="H" value={`${formatScientific(result.H)} MPa·L`} />
          </dl>

          {result.harmfulnessUpgradedByTemperature && (
            <p className="text-sm text-amber-600">
              Contents upgraded from non-harmful to harmful: design
              temperature is outside the {isAir ? "120°C" : "90°C"} / −30°C
              band (Clause 3.2.6).
            </p>
          )}

          {result.overrideApplied && (
            <p className="text-sm text-amber-600">{result.overrideApplied}</p>
          )}

          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-xl font-semibold text-white dark:bg-white dark:text-neutral-900">
              {result.hazardLevel}
            </span>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {HAZARD_LEVEL_DESCRIPTIONS[result.hazardLevel]}
            </p>
          </div>
        </section>
      )}

      {inspection && (
        <section className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div>
            <h2 className="font-medium">
              Inspection requirements (AS/NZS 3788:2001 Table 4.1)
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              In-service inspection periods are scheduled by equipment type
              and PV value in AS/NZS 3788 — not directly by the AS 4343
              hazard level above. Pick the category that matches this item.
            </p>
          </div>

          <div className="space-y-2">
            {EQUIPMENT_CATEGORY_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="equipmentCategory"
                  className="mt-1"
                  checked={equipmentCategory === opt.value}
                  onChange={() => setEquipmentCategory(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {`PV = ${pvMPaL?.toFixed(1)} MPa·L (design pressure × volume, uncorrected — Table 4.1's own PV definition, not the AS 4343 H value above)`}
          </p>

          {inspection.lowRiskNote ? (
            <p className="text-sm text-amber-600">
              Low risk under normal operation — this equipment would not
              normally need to be inspected during its lifetime by the
              inspector (Table 4.1 Note 14). The owner must still keep it in a
              fit and safe condition through regular in-house surveillance,
              and any major repair or alteration must comply with Section 6
              of the Standard.
              {inspection.commissioningRequired
                ? " A commissioning inspection is still required."
                : ""}
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Result
                label="Commissioning inspection"
                value={inspection.commissioningRequired ? "Required" : "Not required"}
              />
              <Result
                label="First-year inspection"
                value={inspection.firstYearlyRequired ? "Required" : "Not required"}
              />
              <Result
                label="External inspection"
                value={
                  inspection.externalPeriodYears !== null
                    ? `Every ${inspection.externalPeriodYears} years`
                    : "—"
                }
              />
              <Result
                label="Internal inspection"
                value={
                  inspection.internalNominalYears !== null
                    ? `Nominal ${inspection.internalNominalYears} yr / extended ${inspection.internalExtendedYears} yr`
                    : "—"
                }
              />
            </dl>
          )}

          {inspection.extraNote && (
            <p className="text-sm text-amber-600">{inspection.extraNote}</p>
          )}

          <p className="text-xs text-neutral-500">
            Extended internal periods may only be used after at least one
            nominal-period inspection has demonstrated they&apos;re safe (Clause
            4.4.4.3(b)), and inspection periods may be shortened for adverse
            conditions or extended for favourable conditions (Clause
            4.4.4.1). A maximum 3-month extension can be applied with
            documented owner justification (Table 4.1 Note 1).
          </p>
        </section>
      )}

      <p className="text-xs text-neutral-500">
        Guidance only — not a substitute for a qualified assessment under AS
        4343:2014 and AS/NZS 3788:2001. Not covered: pressure piping,
        multi-chamber/multi-phase volume rules (Clause 2.2.4), the AS 1210
        application-curve adjustment for very low pressure vessels (Clause
        2.2.10), and fluid classification from Table 3.1 — determine fluid
        harmfulness from the Standard or an MSDS before relying on this
        result. &apos;Duty of care&apos; applies regardless of these
        Standards — confirm inspection scheduling with a qualified in-service
        inspector and design registration/certification requirements with
        your State/Territory regulator.
      </p>
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
