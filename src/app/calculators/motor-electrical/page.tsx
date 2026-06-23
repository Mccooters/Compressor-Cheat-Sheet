"use client";

import { useMemo, useState } from "react";
import { NumberField } from "@/components/calculators/NumberField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";

type Quantity = "V" | "I" | "R" | "P";

function solveSinglePhase(
  known: Partial<Record<Quantity, number>>,
): Record<Quantity, number> | "divide-by-zero" | null {
  const keys = (Object.keys(known) as Quantity[]).filter(
    (k) => known[k] !== undefined,
  );
  if (keys.length !== 2) return null;
  const has = (k: Quantity) => keys.includes(k);
  const { V, I, R, P } = known;

  if (has("V") && has("I")) {
    if (I === 0) return "divide-by-zero";
    return { V: V!, I: I!, R: V! / I!, P: V! * I! };
  }
  if (has("V") && has("R")) {
    if (R === 0) return "divide-by-zero";
    return { V: V!, R: R!, I: V! / R!, P: (V! * V!) / R! };
  }
  if (has("V") && has("P")) {
    if (V === 0 || P === 0) return "divide-by-zero";
    return { V: V!, P: P!, I: P! / V!, R: (V! * V!) / P! };
  }
  if (has("I") && has("R")) {
    return { I: I!, R: R!, V: I! * R!, P: I! * I! * R! };
  }
  if (has("I") && has("P")) {
    if (I === 0) return "divide-by-zero";
    return { I: I!, P: P!, V: P! / I!, R: P! / (I! * I!) };
  }
  if (has("R") && has("P")) {
    if (R === 0 || P! / R! < 0) return "divide-by-zero";
    return { R: R!, P: P!, I: Math.sqrt(P! / R!), V: Math.sqrt(P! * R!) };
  }
  return null;
}

function solveThreePhase(
  known: Partial<{ V: number; I: number; P: number }>,
  pf: number,
): { V: number; I: number; P: number } | "divide-by-zero" | null {
  const keys = (Object.keys(known) as ("V" | "I" | "P")[]).filter(
    (k) => known[k] !== undefined,
  );
  if (keys.length !== 2) return null;
  const { V, I, P } = known;
  const SQRT3 = Math.sqrt(3);

  if (V !== undefined && I !== undefined) {
    return { V, I, P: SQRT3 * V * I * pf };
  }
  if (V !== undefined && P !== undefined) {
    if (pf === 0 || V === 0) return "divide-by-zero";
    return { V, P, I: P / (SQRT3 * V * pf) };
  }
  if (I !== undefined && P !== undefined) {
    if (pf === 0 || I === 0) return "divide-by-zero";
    return { I, P, V: P / (SQRT3 * I * pf) };
  }
  return null;
}

function parseInput(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

const TOGGLE_ACTIVE =
  "bg-amber-500 text-slate-950 dark:bg-amber-400 dark:text-slate-950";
const TOGGLE_INACTIVE =
  "border border-slate-300 text-slate-600 hover:border-amber-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-amber-500/60";

export default function MotorElectricalCalculator() {
  const [phase, setPhase] = useState<"single" | "three">("single");

  const [v, setV] = useState("");
  const [i, setI] = useState("");
  const [r, setR] = useState("");
  const [p, setP] = useState("");
  const [pf, setPf] = useState("");

  const singlePhaseResult = useMemo(() => {
    const known: Partial<Record<Quantity, number>> = {
      V: parseInput(v),
      I: parseInput(i),
      R: parseInput(r),
      P: parseInput(p),
    };
    Object.keys(known).forEach((k) => {
      if (known[k as Quantity] === undefined) delete known[k as Quantity];
    });
    return solveSinglePhase(known);
  }, [v, i, r, p]);

  const threePhaseResult = useMemo(() => {
    const known: Partial<{ V: number; I: number; P: number }> = {
      V: parseInput(v),
      I: parseInput(i),
      P: parseInput(p),
    };
    Object.keys(known).forEach((k) => {
      if (known[k as "V" | "I" | "P"] === undefined)
        delete known[k as "V" | "I" | "P"];
    });
    const pfValue = parseInput(pf) ?? 1;
    return solveThreePhase(known, pfValue);
  }, [v, i, p, pf]);

  const filledCount =
    phase === "single"
      ? [v, i, r, p].filter((x) => x.trim() !== "").length
      : [v, i, p].filter((x) => x.trim() !== "").length;

  function switchPhase(next: "single" | "three") {
    setPhase(next);
    setV("");
    setI("");
    setR("");
    setP("");
    setPf("");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Ohm's law"
        title="Motor electrical calculator"
        description={
          <>
            Single-phase: enter any two of voltage, current, resistance, or
            power and the other two are calculated. Three-phase: enter any
            two of voltage, current, or power (plus power factor) to solve
            for the rest.
          </>
        }
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => switchPhase("single")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            phase === "single" ? TOGGLE_ACTIVE : TOGGLE_INACTIVE
          }`}
        >
          Single-phase
        </button>
        <button
          type="button"
          onClick={() => switchPhase("three")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            phase === "three" ? TOGGLE_ACTIVE : TOGGLE_INACTIVE
          }`}
        >
          Three-phase
        </button>
      </div>

      <Card className="space-y-4">
        {phase === "single" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Voltage" unit="V" value={v} onChange={setV} />
            <NumberField label="Current" unit="A" value={i} onChange={setI} />
            <NumberField
              label="Resistance"
              unit="Ω"
              value={r}
              onChange={setR}
            />
            <NumberField label="Power" unit="W" value={p} onChange={setP} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Voltage"
              unit="V"
              helper="line-to-line"
              value={v}
              onChange={setV}
            />
            <NumberField
              label="Current"
              unit="A"
              helper="line"
              value={i}
              onChange={setI}
            />
            <NumberField label="Power" unit="W" value={p} onChange={setP} />
            <NumberField
              label="Power factor"
              value={pf}
              onChange={setPf}
              placeholder="default 1.0"
            />
          </div>
        )}
      </Card>

      <Card>
        {filledCount < 2 && (
          <EmptyState>Enter at least two values to calculate the rest.</EmptyState>
        )}

        {filledCount > 2 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Only the first two recognized values are used — clear extra
            fields to avoid confusion.
          </p>
        )}

        {phase === "single" &&
          filledCount === 2 &&
          singlePhaseResult === "divide-by-zero" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Can&apos;t solve — that combination requires dividing by zero.
            </p>
          )}

        {phase === "single" &&
          singlePhaseResult &&
          singlePhaseResult !== "divide-by-zero" && (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="V" value={`${singlePhaseResult.V.toFixed(2)} V`} />
              <Stat label="I" value={`${singlePhaseResult.I.toFixed(3)} A`} />
              <Stat label="R" value={`${singlePhaseResult.R.toFixed(2)} Ω`} />
              <Stat label="P" value={`${singlePhaseResult.P.toFixed(1)} W`} />
            </dl>
          )}

        {phase === "three" &&
          filledCount === 2 &&
          threePhaseResult === "divide-by-zero" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Can&apos;t solve — that combination requires dividing by zero.
            </p>
          )}

        {phase === "three" &&
          threePhaseResult &&
          threePhaseResult !== "divide-by-zero" && (
            <>
              <dl className="grid grid-cols-3 gap-3">
                <Stat label="V" value={`${threePhaseResult.V.toFixed(2)} V`} />
                <Stat label="I" value={`${threePhaseResult.I.toFixed(3)} A`} />
                <Stat
                  label="P"
                  value={`${(threePhaseResult.P / 1000).toFixed(3)} kW`}
                />
              </dl>
              {pf.trim() === "" && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-500">
                  Power factor not entered — assumed 1.0 (unity).
                </p>
              )}
            </>
          )}
      </Card>
    </div>
  );
}
