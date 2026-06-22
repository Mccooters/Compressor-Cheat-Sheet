// Distinguishes a literal fault/alarm code (e.g. "E:0119", "F062", "SR Fault
// 33", a bare number like "110") from a real access password/menu label
// (e.g. "Service", "User", "Diagnostic Menus"). Both appear in the same flat
// label/value shape on ifixcompressors.com, with no structural marker to
// tell them apart — this is a content heuristic, validated by hand against
// the full ~1,030-label set scraped from that site (zero misclassifications
// found across multiple review passes). Keep it that way if you touch it:
// re-run the classification against scraped-data/controllers.json and
// re-review both buckets before trusting a change.
const FAULT_CODE_PATTERNS = [
  /^\d{2,6}$/, // bare numeric: 110, 1424
  /^[A-Za-z]{1,2}[:.]?\d{2,6}[A-Za-z]{0,2}$/, // E:0119, A:2040, F062, FF15
  /^(SR\s*Fault|Er|Error|Alarm|Fault)\b[\s:.]*[A-Za-z]?[\s:.]*\d/i, // Error 0139E, SR Fault 33, Alarm 4804A
  /\b(Error|Alarm)\s+[A-Za-z]?\.?\d+$/i, // Temperature Error E02, Error A.33
  /^F\d+-F\d+$/i, // F116-F147
  /^Fault\s+\S{1,4}$/i, // Fault S, Fault T, Fault i
  /^\S{2,5}\s+(Alarm|Fault)$/i, // HdP Alarm, LdP Alarm, LT-2 Fault
];

export function isFaultCodeLabel(rawLabel: string): boolean {
  const label = rawLabel.trim();
  return FAULT_CODE_PATTERNS.some((pattern) => pattern.test(label));
}
