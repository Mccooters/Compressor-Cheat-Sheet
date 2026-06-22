export interface MinWallThicknessInput {
  designPressureMPa: number;
  insideDiameterMm: number;
  allowableStressMPa: number;
  jointEfficiency: number;
  temperatureCoefficient: number;
}

// t_min = PD / (2SE + 2yP) — cylindrical shell, thin-wall.
export function calculateMinWallThickness(input: MinWallThicknessInput): number {
  const { designPressureMPa: P, insideDiameterMm: D, allowableStressMPa: S, jointEfficiency: E, temperatureCoefficient: y } = input;
  return (P * D) / (2 * S * E + 2 * y * P);
}

export interface MawpInput {
  actualThicknessMm: number;
  insideDiameterMm: number;
  allowableStressMPa: number;
  jointEfficiency: number;
  temperatureCoefficient: number;
}

// MAWP = 2SEt / (D + 2yt) — t_min rearranged to solve for pressure given actual thickness.
export function calculateMAWP(input: MawpInput): number {
  const { actualThicknessMm: t, insideDiameterMm: D, allowableStressMPa: S, jointEfficiency: E, temperatureCoefficient: y } = input;
  return (2 * S * E * t) / (D + 2 * y * t);
}
