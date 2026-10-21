# Scope, milestones and deliberate tradeoffs

| Stage | Work | Exit gate |
|---|---|---|
| 0 Foundation | Audit existing repositories; select components; define model conventions and contracts | Architecture ADR, reuse matrix, schema approval |
| 1 Pure computation | Units/area, rental/condo revenue, budget, sources/uses, monthly timeline, draw interest, lender sizing, IRR and NPV | Independent numerical fixtures + properties pass |
| 2 Model UI | Setup wizard, editable section cards, table mode, provenance chips, KPI drilldown, quick/pro/institutional presets | Small & large synthetic projects model consistently |
| 3 Rate & source governance | BoC adapter; source observations; immutable rate snapshots; change-preview notifications | New observation does not mutate old locked scenario |
| 4 GTA pilot policy | Ontario DC rules + one complete verified local jurisdiction (prefer Oshawa + Durham) and Toronto-fee follow-up | Expert review; dated policy tests and jurisdiction overlays |
| 5 Policy intelligence | CMHC MLI Select/ACLP candidate screening, affordability thresholds, tax assumptions with conditions and warnings | Eligibility never misrepresented as approval; no obsolete new-project AHF |
| 6 Beta | Exports, permissions, audit trails, scenario comparison, performance, backups, UX polish | Independently reviewed 2-3 test deals; QA checklist passes |
| Later | Peel/York/Halton and lower tiers, CIP boundary GIS, JV waterfalls, phases, portfolio, massing and licensed cost integrations | Separately scoped releases |

## Why not build everything at once
Calculation integrity, municipal data stewardship and scenario reproducibility are riskier than the visual shell. Build a narrow vertical slice and widen only after the engine and source governance prove credible.

## Required quality gates
(1) every output reconciles; (2) relevant source snapshots reproducible; (3) validation warnings correct; (4) user can inspect assumptions; (5) version/override flow tested; (6) specialist sign-off for sensitive program/tax calculations.

## Initial jurisdiction choice
Toronto and Oshawa/Durham are the **priority launch environments**, not a claim that their regulations are already coded. If obtaining verified schedules is easier for one, finish it fully first. Regional/school-board/city fee stacking must be modeled explicitly.
