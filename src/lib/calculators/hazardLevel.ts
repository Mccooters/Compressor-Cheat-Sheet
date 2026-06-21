export type ContentState = "gas" | "liquid" | "vacuum";
export type Harmfulness = "non-harmful" | "harmful" | "very-harmful" | "lethal";
export type HazardLevel = "A" | "B" | "C" | "D" | "E";

export interface HazardLevelInput {
  designPressureMPa: number;
  volumeLitres: number;
  state: ContentState;
  harmfulness: Harmfulness;
  isAir: boolean;
  designTemperatureC: number | null;
  /** Clause 2.2.5(a)(i)-(v), in order */
  conditionsA: boolean[];
  /** Clause 2.2.5(c)(i)-(iii), in order */
  conditionsC: boolean[];
}

export interface HazardLevelResult {
  Fc: number;
  Ff: number;
  effectiveHarmfulness: Harmfulness;
  harmfulnessUpgradedByTemperature: boolean;
  FsA: number;
  FsB: number;
  FsC: number;
  Fs: number;
  H: number;
  hazardLevel: HazardLevel;
  overrideApplied: string | null;
}

// AS 4343:2014 Clause 2.2, Equation 2.1: H = P x V x Fc x Ff x Fs
export function calculateHazardLevel(input: HazardLevelInput): HazardLevelResult {
  const { designPressureMPa: P, volumeLitres: V, state, isAir, designTemperatureC } = input;

  // Clause 3.2.6(a): outside the safe temperature band, non-harmful fluid is
  // treated as harmful. Air gets the extended 120 C upper threshold.
  let effectiveHarmfulness = input.harmfulness;
  let harmfulnessUpgradedByTemperature = false;
  if (effectiveHarmfulness === "non-harmful" && designTemperatureC !== null) {
    const upperThreshold = isAir ? 120 : 90;
    if (designTemperatureC > upperThreshold || designTemperatureC < -30) {
      effectiveHarmfulness = "harmful";
      harmfulnessUpgradedByTemperature = true;
    }
  }

  const Fc = state === "vacuum" ? 0.1 : state === "liquid" ? 1 : 10;

  let Ff: number;
  switch (effectiveHarmfulness) {
    case "non-harmful":
      Ff = state === "liquid" ? 1 / 3 : 1.0;
      break;
    case "harmful":
      Ff = 3;
      break;
    case "very-harmful":
      Ff = 10;
      break;
    case "lethal":
      Ff = 1000;
      break;
  }

  // Clause 2.2.5(a): one condition x3, two or more x10.
  const aCount = input.conditionsA.filter(Boolean).length;
  const FsA = aCount >= 2 ? 10 : aCount === 1 ? 3 : 1;

  // Clause 2.2.5(b): design pressure over 50 MPa x30.
  const FsB = P > 50 ? 30 : 1;

  // Clause 2.2.5(c): doesn't apply to fired equipment (condition a(i)).
  const isFiredEquipment = input.conditionsA[0];
  const cCount = isFiredEquipment ? 0 : input.conditionsC.filter(Boolean).length;
  const FsC = cCount >= 2 ? 1 / 10 : cCount === 1 ? 1 / 3 : 1;

  const Fs = FsA * FsB * FsC;

  const H = P * V * Fc * Ff * Fs;

  let hazardLevel: HazardLevel;
  if (H > Math.pow(10, 8.5)) hazardLevel = "A";
  else if (H >= 1e4) hazardLevel = "B";
  else if (H >= 1e3) hazardLevel = "C";
  else if (H >= Math.pow(10, 2.5)) hazardLevel = "D";
  else hazardLevel = "E";

  let overrideApplied: string | null = null;
  const PVUnmodified = P * V;

  // Clause 2.2.6: low PV non-harmful liquid in a moderate temperature band is always E.
  if (
    PVUnmodified < 100_000 &&
    effectiveHarmfulness === "non-harmful" &&
    state === "liquid" &&
    designTemperatureC !== null &&
    designTemperatureC > 0 &&
    designTemperatureC <= 65
  ) {
    hazardLevel = "E";
    overrideApplied =
      "Clause 2.2.6: PV < 100,000 MPa·L with non-harmful liquid between 0°C and 65°C — classified as hazard level E.";
  }

  // Clause 2.2.11: lethal gas vessels with very low PV are capped at D, not lower.
  if (effectiveHarmfulness === "lethal" && state === "gas" && PVUnmodified <= 0.1) {
    hazardLevel = "D";
    overrideApplied =
      "Clause 2.2.11: lethal gas with PV ≤ 0.1 MPa·L — classified as hazard level D.";
  }

  return {
    Fc,
    Ff,
    effectiveHarmfulness,
    harmfulnessUpgradedByTemperature,
    FsA,
    FsB,
    FsC,
    Fs,
    H,
    hazardLevel,
    overrideApplied,
  };
}
