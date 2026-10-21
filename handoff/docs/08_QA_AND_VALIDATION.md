# Numerical, policy and UX validation plan

## Testing layers
- **Schema and domain**: units, valid dates, legal typologies, area positive bounds, percentages normalized, source categories, quality tags, missing values.
- **Unit tests**: revenue by unit/vacancy; GCA vs zoning counted GFA; sources-and-uses; amortization and repayments; max loan min across LTC/LTV/DSCR; financing draw identity; cap valuation; positive/negative/undefined IRR; rebate timing.
- **Property/metamorphic**: +10% studio rent affects studio cashflows only (prior to secondary finance effects); increasing variable-rate benchmark increases interest cost unless fixed/floor/cap conditions; area increases scale matching priced components; deferral doesn't erase nominal DC liability.
- **Reference fixture**: hand-calculated synthetic no-debt 12-month case; independent external numeric implementation for XIRR/NPV; multiple cashflow scenarios; change across policy effective-date boundary; affordability thresholds with older and current vintages.
- **Integration tests**: bank observation ingestion returns provenance; fetched observation cannot silently rewrite locked scenario; source fail/staleness visible; rule update requires reviewer; policy expired during model timeline.
- **Workbook regressions**: map to `data/audit/findings.json` and `data/qa/legacy-acceptance-tests.json`; 19 findings should have explicit tests/disposition.
- **UX/a11y**: tab-order, focus restoration after sections collapse, contrast, tables using headers, screen-reader announcements for recalculations and source alerts, no data-loss on switch modes, 1000+ cells responsive on desktop.

## Financial invariants to enforce
`opening_debt + funded_draws + cap_interest - repayments = closing_debt`; `uses = debt_funding + equity_funding + other funding (with proceeds modeled once)`; cash never created by grants before received; closing sale pays outstanding debt one time; revenues tied to units/area; deductions not double counted; old scenarios pin exact source effective dates.

## Coverage data
`data/qa/legacy-acceptance-tests.json` (16 domain-wide tests) + `data/qa/additional-test-cases.json` (scenario edge cases). Not yet an executable test suite; Codex must implement with the chosen stack.

## Independent review gates
Mortgage sizing: lending professional; zoning/fees: planner/municipal source reviewer; tax rebate: qualified tax adviser; cost estimate: professional quantity surveyor; investment return methodology: development analyst. Test code cannot replace domain sign-off.

## Before production
No critical unresolved issue; documented model conventions; benchmark and source legal use confirmed; red-team snapshots/rules; recovery drill; exported trace provenance; accessibility regression; realistic project reconciliations; account-level authorization and security assessment.
