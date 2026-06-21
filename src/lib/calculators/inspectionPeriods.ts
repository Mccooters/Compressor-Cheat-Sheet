export type EquipmentCategory =
  | "compressed-air-vessel"
  | "auxiliary-vessel-other"
  | "auxiliary-vessel-accumulator"
  | "process-vessel"
  | "steam-pressure-vessel"
  | "boiler-other"
  | "boiler-electric"
  | "boiler-coil-forced-circulation";

export interface InspectionRequirement {
  commissioningRequired: boolean;
  firstYearlyRequired: boolean;
  externalPeriodYears: number | null;
  internalNominalYears: number | null;
  internalExtendedYears: number | null;
  /** True when the row falls under Table 4.1 Note 14 — not normally inspected by the inspector. */
  lowRiskNote: boolean;
  extraNote?: string;
}

function lowRisk(commissioningRequired: boolean): InspectionRequirement {
  return {
    commissioningRequired,
    firstYearlyRequired: false,
    externalPeriodYears: null,
    internalNominalYears: null,
    internalExtendedYears: null,
    lowRiskNote: true,
  };
}

// AS/NZS 3788:2001 Table 4.1 — Inspection periods to be executed by an in-service
// inspector. pvMPaL is design pressure (MPa) x volume (L), uncorrected by any
// AS 4343 hazard factors — same PV definition Table 4.1 itself uses.
export function getInspectionRequirement(
  category: EquipmentCategory,
  pvMPaL: number,
): InspectionRequirement {
  switch (category) {
    case "boiler-electric":
      return {
        commissioningRequired: true,
        firstYearlyRequired: false,
        externalPeriodYears: 2,
        internalNominalYears: 4,
        internalExtendedYears: 8,
        lowRiskNote: false,
      };
    case "boiler-coil-forced-circulation":
      return {
        commissioningRequired: true,
        firstYearlyRequired: false,
        externalPeriodYears: 2,
        internalNominalYears: null,
        internalExtendedYears: null,
        lowRiskNote: false,
        extraNote: "Normally cannot be inspected internally (Table 4.1 Note 15).",
      };
    case "boiler-other":
      return {
        commissioningRequired: true,
        firstYearlyRequired: true,
        externalPeriodYears: 1,
        internalNominalYears: 1,
        internalExtendedYears: 4,
        lowRiskNote: false,
        extraNote:
          "The 4-year extended period only applies where the boiler has adequate water treatment, has demonstrated reliability, and hasn't changed fuel type outside the original design (Table 4.1 Note 4).",
      };
    case "steam-pressure-vessel":
      if (pvMPaL <= 30) return lowRisk(false);
      if (pvMPaL <= 100) return lowRisk(true);
      return {
        commissioningRequired: true,
        firstYearlyRequired: true,
        externalPeriodYears: 2,
        internalNominalYears: 4,
        internalExtendedYears: 8,
        lowRiskNote: false,
      };
    case "compressed-air-vessel":
      if (pvMPaL <= 100) return lowRisk(false);
      if (pvMPaL <= 150) return lowRisk(true);
      return {
        commissioningRequired: true,
        firstYearlyRequired: true,
        externalPeriodYears: 2,
        internalNominalYears: 4,
        internalExtendedYears: 12,
        lowRiskNote: false,
      };
    case "process-vessel":
      return {
        commissioningRequired: true,
        firstYearlyRequired: true,
        externalPeriodYears: 2,
        internalNominalYears: 4,
        internalExtendedYears: 12,
        lowRiskNote: false,
      };
    case "auxiliary-vessel-accumulator":
      if (pvMPaL <= 200) return lowRisk(false);
      return {
        commissioningRequired: true,
        firstYearlyRequired: true,
        externalPeriodYears: 2,
        internalNominalYears: 12,
        internalExtendedYears: 12,
        lowRiskNote: false,
      };
    case "auxiliary-vessel-other":
      return {
        commissioningRequired: true,
        firstYearlyRequired: true,
        externalPeriodYears: 2,
        internalNominalYears: 4,
        internalExtendedYears: 12,
        lowRiskNote: false,
      };
  }
}
