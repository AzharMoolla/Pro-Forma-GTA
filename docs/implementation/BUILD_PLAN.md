# Pilot build plan

**Date:** 2026-10-21 · **Pilot:** one purpose-built rental project, Oshawa/Durham first, then Toronto · **Status:** proposed

## Folder map

```
Pro Forma App/
  AGENTS.md                     pointer: handoff/AGENTS.md + AGENT_PROJECT_PLAYBOOK.md
  AGENT_PROJECT_PLAYBOOK.md     copy of the owner playbook (repo copy takes precedence)
  handoff/                      read-only specification (workbooks git-ignored)
  docs/implementation/          REUSE_DECISIONS, ADR-NNN, BUILD_PLAN, DECISION_LOG, CLAIMS (later)
  data/                         seed + fixture JSON (synthetic demo project, registry seeds)
  supabase/migrations/          projects, scenarios (append-only), sources, costs, rates, policy rules
  worker/                       ingestion jobs: BoC rates, Altus cost guide, CMHC RMS, municipal DCs
  src/
    engine/                     pure TS: program, revenue, costs, ledger, debt, returns, trace
    registry/                   loaders + validators (schemas from handoff/schemas)
    scenario/                   canonical JSON, hash, lock, child, diff
    ui/                         primitives, workspace cards, KPI strip, inspector, comparison
  tests/
    engine/*.test.ts            hand-derived fixtures + edge cases + reconciliation invariants
    e2e/*.spec.ts               Playwright desktop + mobile + axe
  scripts/verify.mjs            one-command floor: typecheck, lint, test, registry, contrast, scan
```

## Milestones

| | Work | Exit gate (evidence that moves it) |
|---|---|---|
| **A** ✅ *this doc set* | Repo inventory, reuse synthesis, ADR, conventions, plan, decision log | Owner accepts or edits ADR-001 and the D-items |
| **B** Engine ✅ *v0.1, 2026-10-21: `src/engine/`, 38 tests; rent growth, opex inflation, cost escalation and refinance not yet modelled* | `program` (unit mix → NSA, units, GCA checks) · `revenue` (lease-up, vacancy per type, EGI, NOI) · `costs` (land, hard straight-line, soft/contingency as *proxy* lines, levies as unknown) · `ledger` (equity-first, debt draws, capitalized interest, closing = opening + draws + interest − repay) · `debt` (DSCR/LTV/LTC min) · `returns` (NPV, IRR, XIRR, multiple, "unavailable") · `trace` | Every C1–C17 has a hand-derived fixture. Invariants pass: sources = uses, ledger closes every month, no negative debt. Edge cases: zero-rate amortization, no debt, negative NOI, no sign change. Regression tests for audit PF-001, 002, 004, 005, 008, 009 |
| **B2** Engine v0.2 (ADR-002) ✅ *2026-10-21: 68 tests; catalogue (151 variables, 232 items, 9 project types); Mock A + Mock B with enforced coverage; `npm run report` regenerates PROJECT_TYPE_CHECKLISTS.md and MOCK_PROJECTS.md. Not yet: GST/HST timing (C17), holdback timing, portfolio-level debt, correlated Monte Carlo* | Rent growth, opex inflation, escalation to construction midpoint, refinance at stabilization · cost-line model with driver types, estimate class and band · `data/costs/catalogue.json` from COST_CATALOGUE.md · condo component (presales, deposits, occupancy, closings, Tarion/HCRA) · commercial lease component · hierarchy roll-up (building → parcel → phase → master plan) · seeded Monte Carlo P10/P50/P90 + tornado | v0.1 rental tests pass unchanged. Hand-derived fixtures for a condo, a mixed-use building and a two-phase master plan. Roll-up equals the sum of children. Same seed gives the same P-values |
| **C1** Workspace UI ✅ *2026-10-21: `npm run dev`. Nine sections in work-sample order, Quick/Professional/Institutional over one engine, live recalculation, inspector (formula, inputs, class band, source), master-plan tree, editable costs/revenue/debt/timing and 151 project variables, live checklist coverage, issue log, seeded Monte Carlo + tornado in a Web Worker, hash-locked scenarios with compare and input diff, CSV/JSON export. 10 Playwright tests (axe WCAG 2.2 AA on every section, desktop + mobile). Browser storage only until C2* | |
| **C1.5** Tracker, sketch, analysis, glossary ✅ *2026-10-21: development tracker (per-building stages, status, actuals vs budget, cost to complete, receipts with SHA-256 in IndexedDB, "use actual in model", "add to model"); plan changes (add/duplicate/remove buildings); sketch building/skyline with live stats; cost buckets + colour-coded screening observations incl. land-to-revenue; glossary of 37 terms with formulas on hover/focus; BEDMAS brackets enforced by lint. 89 unit + 18 e2e tests* | |
| **C2** Accounts and saving | Supabase auth + saved projects/scenarios (append-only, provenance constraints), XLSX/PDF export | Needs owner go-ahead to connect Supabase (playbook §1.4) |
| **C** Workspace UI (original scope) | Quick / Professional mode toggles over one engine · cards in work-sample order (Market evidence → Program → Cost → Revenue → Finance → KPIs) · inspector (formula, inputs, sources, status) · scenario create/lock/child · comparison matrix · issue panel seeded from `findings.json` · charts · Supabase auth + saved projects · XLSX/PDF/CSV/JSON export | 120-unit demo and a 10-unit screen both run. Keyboard-only pass. axe clean at desktop + mobile. Locked scenario is unchanged after any input edit |
| **D** Live data | Ingestion Workers: BoC prime and policy rate (Valet API) · Altus Canadian Cost Guide ($/ft² low/high by building type, Toronto + GTA) · CMHC Rental Market Survey (rent and vacancy by bedroom type and zone) · registry constraints in Postgres (source required, no overlapping windows) · "update available" on affected scenarios | New data creates an update notice; accepting it creates a child with a before/after diff, and the parent's hash is unchanged. A failed fetch keeps the last good value with its date |
| **E** Oshawa/Durham charges | Verified regional + city DC (development charge) and education DC rules for rental, with deferral as *timing* not waiver | Each rule links a by-law/schedule, effective window and `verifiedAt`. Owner (or a delegate) reviews before status = verified. Toronto follows the same pattern |
| **F** Regression + review | 2–3 scenario fixtures locked as golden files · CLAIMS.md · playbook pre-launch gate (local, non-public) | `npm run verify` green. Golden hashes stable. Pre-launch gate answered PASS / N/A / BLOCKED |

Rule: one milestone at a time. B is engine-only, with no UI until its gate passes.

## What "done" means for any financial feature

From `handoff/AGENTS.md`: input schema + units; formula convention; trace; provenance; fixture test with expected result; edge-case test; visible uncertainty; version behaviour; review status.
