# Literature review: formulas, defaults and facts (2026-10-22)

What the model calculates and assumes, checked against published sources. Each row is **Confirmed** (matches a
dated source), **Plausible** (inside a published range, but the range is wide or secondary), **To verify** (no primary
source found; the model already labels it) or **Finding** (the model differs from practice; action noted).
Sources are dated; re-check anything older than a year before relying on it. The expected-vs-actual cases that
prove the arithmetic are in `src/verification/cases.ts` and the Verification section.

## 1. Formulas (arithmetic)

| Item | Model | Standard | Status |
|---|---|---|---|
| Monthly rate from a nominal annual rate | r ÷ 12 (C4) | Lender convention for floating construction loans (prime-based, monthly accrual) | Confirmed |
| Effective annual from monthly | (1 + r_m)^12 − 1 | Textbook (Brueggeman & Fisher, *Real Estate Finance and Investments*) | Confirmed |
| Annuity payment / present value | P·r ÷ (1 − (1 + r)^−n); PV = PMT·(1 − (1 + r)^−n) ÷ r | Textbook | Confirmed (test V-03) |
| IRR | Rate where NPV = 0, monthly, annualized; shown only if unique (C15) | Textbook; multiple-root caveat is standard (Brealey, Myers & Allen) | Confirmed (V-04) |
| NPV | Σ CFₜ ÷ (1 + r_m)^t with r_m from an effective annual rate | Textbook | Confirmed |
| Direct capitalization | Forward 12-month NOI ÷ cap rate | Appraisal Institute of Canada practice for stabilized income property | Confirmed (V-05) |
| DSCR loan sizing | PV of (NOI ÷ DSCR ÷ 12) over the amortization | Lender practice (CMHC MLI, conventional) | Confirmed (V-06) |
| **Permanent-loan compounding** | Nominal ÷ 12 (monthly compounding) | Canadian fixed-rate mortgages quote rates **compounded semi-annually** (Interest Act s.6) | **Finding**: monthly compounding slightly overstates the payment, so DSCR capacity is ~0.4–0.6% low at 4–5% rates (conservative). Fix: add a compounding option to the refinance terms; record as a convention change |
| Ownership mortgage (affordability) | (1 + r/2)^(1/6) − 1 | Interest Act, semi-annual | Confirmed |
| Profit on cost | (profit − capitalized interest) ÷ TDC incl. interest | Matching bases (D-20); industry uses both before- and after-finance versions | Confirmed, both shown |
| Ontario land transfer tax | Lump sum in Mock A: $1,236,475 on $62M | 0.5% to $55k, 1% to $250k, 1.5% to $400k, 2% above (2.5% over $2M only for 1–2 single-family homes) → $1,236,475 | **Confirmed** (V-07) |
| Affordability | Shelter cost ÷ before-tax income vs 30% | CMHC core housing need, affordability standard | Confirmed |

## 2. Statutory charges and taxes

| Item | Model | Source | Status |
|---|---|---|---|
| Parkland cash-in-lieu cap | 10% of land value (label said site < 1 ha; corrected to ≤ 5 ha) | Planning Act s.42 as amended by Bill 23: capped at 10% of the land or its value for sites ≤ 5 ha, 15% above ([City of Toronto](https://www.toronto.ca/services-payments/parks-sports-recreation/parks/parkland-dedication/); [Osler](https://www.osler.com/en/insights/updates/bill-23-more-homes-built-faster-act-2022-passed-fast/)) | Confirmed (V-13); label corrected |
| Community Benefits Charge | 4% of land value | Planning Act s.37: cap 4% of land value | Confirmed |
| Toronto MLTT on commercial land | Assumed equal to provincial | Toronto's graduated luxury rates (from 2026-04-01) apply to residential with 1–2 single-family homes ([City](https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees)); no non-residential schedule found | To verify (labelled) |
| Toronto development charges | $7.43M with the DC Reduction Program | June 2026 DCRP: −40% for units ≤ 1 bedroom, −60% for 2+ bedrooms, at least 3 years, funded by $1.5B ([City](https://www.toronto.ca/news/city-of-toronto-secures-1-5-billion-in-canada-ontario-partnership-to-build-funding-to-support-housing-and-reduce-development-charges/); [presentation 2026-07-28](https://www.toronto.ca/wp-content/uploads/2026/07/98dd-DCRP-and-PBR-ULI-Presentation-2026-07-28.pdf)). Dollar rates not checked | To verify: rebuild from the rate schedule and unit mix |
| HST self-supply, rental rebates | See D-32 | Federal PBRH 100% GST (start 2023-09-14 to 2030); Ontario 8% relief; 2026 expansion pending legislation | Plausible; legislation status to verify |

## 3. Market and lending defaults (Mock A, synthetic)

| Item | Model | Benchmark | Status |
|---|---|---|---|
| Exit cap, Toronto rental | 4.25% | Q2 2026: 4.3% ([Lee & Associates](https://www.lee-associates.com/wp-content/uploads/2026/07/2026-Q2-Toronto-ON-Multifamily.pdf)); 3.90% high-density urban (Avison Young via [CMP](https://www.mpamag.com/ca/mortgage-industry/market-updates/toronto-anchors-canadas-commercial-real-estate-rebound/582671)); CBRE notes yields "inching higher" Q1 2026 ([CBRE](https://www.cbre.com/insights/reports/canada-cap-rates-investment-insights-q1-2026)) | Plausible (inside 3.9–4.5%) |
| Refinance: 95% LTV, 50-year amortization, DSCR 1.10 | Mock A | CMHC MLI Select: up to 50 years (≤ remaining economic life) ([CMHC](https://assets.cmhc-schl.gc.ca/sites/cmhc/professional/project-funding-and-mortgage-financing/mortgage-loan-insurance/multi-unit-insurance/mliselect/mli-select.pdf)); 95% / 1.10 at the 100-point tier per secondary sources; some lenders cap advances near 85% when DSCR < 1.20 | Plausible **only with 100 affordability/energy/accessibility points**; the model doesn't score points, so treat as a best case |
| Hard cost $360/ft² GCA | Mock A | Altus 2026 Canadian Cost Guide released 2026-04-23 ([release](https://www.altusgroup.com/fr/press-releases/altus-group-releases-its-2026-canadian-cost-guide/)); earlier GTA concrete high-rise ranges ~$300–<$400 ([STOREYS](https://storeys.com/construction-costs-vancouver-toronto-altus/)) | Plausible; check against the 2026 guide (licence check D-14) |
| Cost escalation 2.5%/yr | Mock A | Construction cost indices have run above general inflation since 2021; no single forecast | Plausible, an assumption (switchable, D-34) |
| Rent growth 2.5%/yr | Mock A | Long-run CPI-like; Toronto asking rents fell in 2024–25 | **Finding**: it moves profit on cost by ~32 points in Mock A. It carries the result, so show it and test it at 0% (now possible in the register) |
| Contingencies 5% design + 5% construction | Mock A | Common at schematic design; class C estimates usually carry more | Plausible |
| Consultants (architect 3.5%, engineers 2%, PM 2%, developer 3%) | Mock A | Typical high-rise fee ranges | Plausible |

## 4. What this changes

1. **Done**: every assumption above is in the Assumptions register with its basis, can be switched off where it is a rate or rule, and its effect on profit on cost is shown.
2. **Next**: permanent-loan compounding option (semi-annual) as a convention change, recorded in the decision log.
3. **Done**: parkland label corrected. **Next**: rebuild Toronto DCs from the 2026 schedule with the DCRP discounts by bedroom count.
4. **Ongoing**: the verification cases re-run on every build; each benchmark row carries its date and is re-checked when the daily data refresh touches the same source.
