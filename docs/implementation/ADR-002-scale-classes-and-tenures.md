# ADR-002: Macro-to-micro scale, estimate classes and all tenures

**Date:** 2026-10-21 · **Status:** proposed · **Owner:** Azhar Moolla
**Supersedes:** DECISION_LOG D-01 (rental only)
**Depends on:** ADR-001 (engine computes every number; new data never mutates a locked scenario), COST_CATALOGUE.md

## Context

The owner wants one tool that runs from a master plan of hundreds of hectares down to a single building's unit-by-unit budget. It covers rental, condo and general real estate. Every cost from first look through operations should be accounted for. Early (macro) estimates are rougher than late (micro) ones, so the error margin has to be built in and visible.

## Decision 1: one hierarchy, one engine

```
Master plan
 └─ Phase
     └─ Block / parcel
         └─ Building
             └─ Component (residential rental · residential for-sale · retail · office · industrial · parking · amenity · park · infrastructure)
                 └─ Unit type / line item
```

- Every node can be modelled **parametrically**, as a few drivers at its own level (`$/ha` of land development, `$/ft²` for a building, `$/unit` for a component), or **in detail**, through its children. A detailed node replaces its parametric estimate; it never adds to it. That rule is what prevents double counting.
- Cash flows roll up by month from leaves to the root, and every level reports the same metrics (cost, revenue, NOI, IRR, NPV, residual land value). A master plan is therefore a portfolio of the same objects a single building uses, at a coarser grain.
- The rental model from Milestone B becomes the **residential-rental component**. Condo, commercial and land-sale components use the same ledger, debt and returns code.

## Decision 2: every cost line carries an estimate class and a range

| Class | Typical stage | Default range applied to the base estimate | Basis |
|---|---|---|---|
| **D** | Master plan, land screening, concept (≈Class 5) | **−30% / +50%** | Alberta Infrastructure, after ASTM E2516-11 and CIQS ([table](https://www.alberta.ca/system/files/infra-tr-project-cost-framework.pdf)) |
| **C** | Feasibility, schematic design (≈Class 4) | **−20% / +30%** | same |
| **B** | Design development (≈Class 3) | **−15% / +20%** | interpolated between C and A; other Canadian guides cite ±15% ([SMU guide](https://ftp.smu.ca/webfiles/3-5006EstimatePreparationMajorCapitalConstructionProjects.pdf)) |
| **A** | Pre-tender, quoted or tendered (≈Class 1–2) | **−5% / +10%** | Alberta table |

Sources disagree on exact bands. CanadaBuys' ASTM matrix allows −20% to −50% / +30% to +100% at the earliest class, and BC calls its ranges guidance only. These are therefore **defaults the user can override per line**, stored with the class.

How the bands are used:
- A line's class follows its source: a benchmark `$/ft²` is C, a consultant estimate B, a signed quote A, and a master-plan `$/ha` allowance D. Policy items with a verified by-law schedule (DCs, land transfer tax) carry an exact-rule band of ±0%. Unverified rules carry an "unknown" status instead, per C16.
- Revenue drivers (rent, price per ft², absorption, cap rate) get bands too, from market-data dispersion or user input.
- Outputs are shown as **P10 / P50 / P90**, from a Monte Carlo over triangular distributions (low, base, high). The engine takes the random seed as an input, so runs stay deterministic and reproducible (ADR-001). A tornado chart ranks which lines move the result most.
- The headline display: a master-plan IRR shows "8.7% (P10 4.1%, P90 12.9%)", and a pre-tender building shows a tight band. Moving down the hierarchy visibly narrows uncertainty.

## Decision 3: revenue models per component

| Component | Revenue model | Key cash-timing rules |
|---|---|---|
| Residential rental | lease-up, vacancy by type, rent growth, NOI, exit cap or refinance | DC rental instalments; self-supply HST and rental rebates timing |
| Residential for-sale (condo, towns) | presales by month, deposit schedule, interim occupancy, final closings | deposits restricted until closing unless insured; construction financing conditional on the presale threshold; Tarion/HCRA fees; new-housing rebate assignment |
| Retail / office / industrial | leases with term, rent steps, recoveries, TI, leasing commissions, downtime | free rent before cash; TI paid at lease start |
| Land / lots (master plan) | lot or block sales to builders by phase, `$/front-ft` or `$/acre` | servicing must precede sale; front-ending recoveries |
| Parking, amenity, park, infrastructure | cost only (or parking income) | DC credits where works are built by the developer |

Mixed-use buildings combine several components with shared costs allocated by GFA (or by a user-chosen key). The allocation is shown so every component's return can be read on its own.

## Decision 4: the cost catalogue is data, not code

`COST_CATALOGUE.md` becomes `data/costs/catalogue.json`: item id, stage, applies-to, driver type, default class, timing rule and source ids. The engine only knows driver types (`lumpSum`, `perUnit`, `perArea`, `perLinear`, `percentOf`, `schedule`, `indexed`). Adding a cost item is a data change plus a test, not new engine code. Items with no value yet appear as **"not yet estimated"** rows in the budget, so the user sees what is missing instead of a silently incomplete total.

## Consequences

- Engine v0.2 generalizes v0.1. The rental fixture tests must still pass unchanged as the rental component's regression suite.
- Monte Carlo multiplies compute. With 1,000 draws of a 120-month model there is no problem in a browser; for master plans the Worker can run it.
- Ranges make results more honest but harder to read. The UI shows P50 big, the band small, and the drivers that create the band one click away.

## Open

- **"TTC cost guidelines"**: confirm what the owner means. Read as the Toronto Transit Commission, the catalogue covers the TTC 60 m technical review, transit-adjacent design costs and DC credits for transit works. If it means a different cost guide, add it to the benchmark sources.
- Who sets default bands for revenue drivers (market-data dispersion vs. owner judgment)?
