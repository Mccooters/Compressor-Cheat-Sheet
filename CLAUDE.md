@AGENTS.md

# Current Task: Calculator Dropdown Conversions (In Progress)

Converting three calculator input fields to dropdowns in:
- `/calculators/minimum-wall-thickness` (AS 1210)
- `/calculators/mawp` (AS 1210)

Shared data lives in `src/lib/calculators/as1210.ts`; dropdown UI is
`src/components/calculators/SelectField.tsx`.

## Fields

1. **Joint Efficiency (E)** — DONE
   - Sourced from AS 1210—2010 Table 3.5.1.7 (user-supplied photo), all 15
     joint type/examination/Class combinations included verbatim.

2. **Allowable Stress (S)** — DONE
   - Sourced from AS 1210—2010 Table B1(B) (user-supplied photos), at 50°C,
     t ≤ 16 mm. Scope: AS 1548 (PT430/460/490/540) + AS/NZS 3678
     (Gr 250/300/350/400) plate only — the common carbon/C-Mn grades for
     compressed-air receivers. Excludes stainless, Cr-Mo, 1594, pipe/tube,
     castings, forgings (out of scope per user decision).
   - Note: at 50°C these grades' design stress is flat across thickness
     bands, so the t ≤ 16 mm simplification costs no accuracy at this temp.

3. **Temperature Coefficient (y)** — still free-text, NOT yet converted
   - Awaiting user-supplied replacement values (proposed 0.4/0.5/0.7 bands
     were rejected previously; user will provide their own).

## Implementation notes

- Do not fabricate unverified AS 1210-specific numeric values
- Calculators must stay clause-accurate to the standard per project requirements
- Both AS 1210 pages updated in parallel for consistency (S and E)
