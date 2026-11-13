export interface CorrosionRateInput {
  previousThicknessMm: number;
  previousInspectionDate: string;
  currentThicknessMm: number;
  currentInspectionDate: string;
  minThicknessMm: number;
}

export interface CorrosionRateResult {
  yearsBetweenInspections: number;
  corrosionRateMmPerYear: number;
  /** Null when corrosion rate <= 0 (no measurable loss) — remaining life isn't calculable. */
  remainingLifeYears: number | null;
  /** Null when remaining life isn't calculable or is already exhausted. */
  nextInspectionDate: string | null;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** The largest timestamp a JavaScript Date can hold (ECMA-262 time-value range). */
const MAX_DATE_MS = 8.64e15;

export function calculateCorrosionRate(
  input: CorrosionRateInput,
): CorrosionRateResult | { error: string } {
  const previousDate = new Date(input.previousInspectionDate);
  const currentDate = new Date(input.currentInspectionDate);
  const yearsBetweenInspections =
    (currentDate.getTime() - previousDate.getTime()) / MS_PER_YEAR;

  if (!Number.isFinite(yearsBetweenInspections) || yearsBetweenInspections <= 0) {
    return { error: "Current inspection date must be after the previous inspection date." };
  }

  const corrosionRateMmPerYear =
    (input.previousThicknessMm - input.currentThicknessMm) / yearsBetweenInspections;

  if (corrosionRateMmPerYear <= 0) {
    return {
      yearsBetweenInspections,
      corrosionRateMmPerYear,
      remainingLifeYears: null,
      nextInspectionDate: null,
    };
  }

  const remainingLifeYears =
    (input.currentThicknessMm - input.minThicknessMm) / corrosionRateMmPerYear;

  let nextInspectionDate: string | null = null;
  if (remainingLifeYears > 0) {
    const nextMs = currentDate.getTime() + (remainingLifeYears / 2) * MS_PER_YEAR;
    // A barely-measurable loss (5 mm → 4.999999999 mm over 5 years) gives a
    // remaining life of millions of years, pushing this past the ±8.64e15 ms
    // a JavaScript Date can represent — toISOString() then throws RangeError
    // and takes the whole page down. Treat it as "not calculable", which the
    // page already renders as "—".
    if (Number.isFinite(nextMs) && Math.abs(nextMs) <= MAX_DATE_MS) {
      nextInspectionDate = new Date(nextMs).toISOString().slice(0, 10);
    }
  }

  return {
    yearsBetweenInspections,
    corrosionRateMmPerYear,
    remainingLifeYears,
    nextInspectionDate,
  };
}
