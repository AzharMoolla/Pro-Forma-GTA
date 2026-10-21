# ADR-001 — Pilot architecture and model conventions v0.1

**Date:** 2026-10-21 · **Status:** proposed · **Owner:** Azhar Moolla · **Reviewer:** — (financial conventions need a qualified reviewer before any non-demo use)
**Re-evaluate when:** a second user or organization needs shared access; a second tenure (condo) enters scope; scenario count or sensitivity grids make in-browser compute slow (>1 s per recompute).

## Context

Handoff `handoff/` specifies a GTA development feasibility product. Milestone A asks for a minimal architecture that keeps calculation integrity, source governance and scenario reproducibility from day one, informed by the owner's existing projects (see `REUSE_DECISIONS.md`).

## Decision

A **connected web app**: React front end, a **pure TypeScript calculation engine**, a **Supabase** backend (Postgres + auth + storage) that holds projects, scenarios and the source/policy/cost registry, and **ingestion jobs** that pull live and published data (Bank of Canada, Altus cost guide, CMHC rental market data, municipal charge schedules). Results are as detailed as the data allows. Outside tools and AI are welcome for research, document parsing, data extraction and explanation. The posted financial figures always come from the tested engine.

```
src/engine      pure functions: program → revenue → costs → draws/debt → returns
                 no IO, no clock, no randomness, no React, no AI
src/registry    typed loaders + validators for data/sources, data/policy, data/rates
src/scenario    canonical JSON, SHA-256 snapshot, lock/child, trace assembly
src/ui          React workspace: cards, tables, KPI strip, inspector, comparison
data/           reviewed JSON (sources, policy rules, rate observations, synthetic project)
```

Dataflow: `ingestion (scheduled + on demand) → registry (dated, sourced records) → ProjectInput → pin sources/rules/costs for valuation date → engine → MetricTrace[] → UI / export`. New data is pulled automatically and surfaced as "update available" on any scenario it affects. Accepting the update creates a **child scenario** with a before/after diff. Locked scenarios stay reproducible.

### Stack

React 19 + Vite + TypeScript strict + Tailwind v4 + Vitest + Playwright + `@axe-core/playwright` + ESLint flat config. These match the versions already in use in Silbo. Node 22 (`.nvmrc`). Supabase (as in Silbo) for data, auth and file storage; Cloudflare Workers for ingestion jobs and any API proxying (as in Silbo and Graveyard). Add libraries freely where they beat hand-rolled code: charts, data grids, XLSX/PDF export, PDF parsing for cost guides and by-laws. The engine's core maths (IRR, NPV, XIRR, ledger) stays in-repo and tested, because it has to be auditable line by line.

### Persistence

Projects, scenarios, snapshots and the registry live in Supabase Postgres. Snapshots are append-only (a supersede pattern like Graveyard's, enforced in the database). Users can export XLSX, CSV, PDF and JSON.

## Model conventions v0.1 (the "model dictionary")

These are engine defaults. Each one is recorded in the snapshot (`modelConventionVersion`) so changing one later never silently moves an old result.

| # | Convention | v0.1 choice | Why |
|---|---|---|---|
| C1 | Time step | Monthly periods from `cashflowStart`; period *t* = month *t*. Annual figures are sums of 12 periods | Handoff: monthly is canonical |
| C2 | Flow timing | All flows post at **period end** | One rule, easy to audit; intra-month timing deferred |
| C3 | Money | Engine computes in float64; every ledger line is **rounded to cents (half-even) when posted**; totals sum posted cents | "Integer cents with explicit rounding" at book boundaries, no decimal library |
| C4 | Rates | Inputs are nominal annual; monthly rate = annual / 12. Discount rates for NPV are effective annual, converted with (1+r)^(1/12) − 1 | Stated explicitly because the reference workbooks mix them |
| C5 | Percentages | Stored as fractions (0.035), displayed as % | Handoff convention |
| C6 | Areas | ft² canonical; m² display only. GCA, planning GFA, NSA/NLA are separate fields with no implicit conversion between them | Audit PF-005, PF-006 |
| C7 | Construction cost curve | Hard costs spread with a straight line over construction months (S-curve later) | Simple and replaceable |
| C8 | Funding order | Land + pre-construction from equity; then equity until the equity requirement (1 − LTC) × cost is met; then debt draws | Common lender practice; user-visible |
| C9 | Construction interest | Monthly on opening balance × monthly rate; **capitalized** to the loan; **no half-draw shortcut** (audit PF-004). Circularity is solved by ordering: interest on opening balance, never on the same month's draw | Removes the need for iteration |
| C10 | Rate source | Rate = dated BoC prime observation (pinned) + user spread. Floors and caps deferred | Handoff financing ledger |
| C11 | Lease-up | Units go from 0 to stabilized occupancy linearly over N months after completion; vacancy applies per unit type (audit PF-002) | Simple and explicit |
| C12 | NOI | EGI − operating expenses. Reserves are excluded unless the user's valuation basis includes them (a flag) | Handoff rental revenue |
| C13 | Debt sizing | `maxLoan = min(DSCR capacity, value × LTV, cost × LTC)` (audit PF-001, PF-008). DSCR capacity = (NOI / DSCR) / annuity factor. Negative or unknown → no loan amount | Handoff debt sizing |
| C14 | Exit | Terminal value = forward 12-month NOI / exit cap at the exit month, minus selling costs, minus payoff once | Handoff exit |
| C15 | Returns | Unlevered and levered cash flows are kept separate. Monthly IRR annualized as (1+i)^12 − 1. "IRR unavailable" if no sign change or no unique root in the bracket | Handoff returns |
| C16 | Unknown inputs | `status: 'unknown'` propagates. A KPI that depends on an unknown shows **incomplete** and names the missing inputs, never a number built on zero | Graveyard "honest unavailability"; synthetic project notices |
| C17 | Taxes (HST/GST) | Modelled in a later milestone. Until then it shows as an explicit "not yet modelled" line rather than a silent zero (audit PF-013) | Cash-tax timing is complex and needs a proper design |
| C19 | Escalation | Lines flagged `escalate` grow at the project's annual rate from month 0 to the month they are spent: base × (1 + r)^(month/12) | Per-month escalation is more precise than escalating everything to the construction midpoint |
| C20 | Condo deposits | Held in trust and unusable until closing unless the component says deposits are insured/usable; final closings occur after the interim-occupancy months; commissions are paid at closing | Matches default Ontario practice; insured deposits are a switch |
| C21 | Refinance | Permanent loan sized on forward 12-month NOI by min(DSCR capacity, value × LTV); it repays the construction loan, and the surplus goes to equity (a shortfall is drawn from equity) | Permanent lenders size on DSCR and LTV, not cost |
| C18 | Construction costs | Altus Canadian Cost Guide $/ft² range per building type and city (low/high), pinned to the guide year, escalated to the construction midpoint. A user quote overrides it, and both are kept in the trace | Benchmark that professionals recognise; the range drives sensitivity |

Every conventions row gets at least one fixture test whose expected values are hand-derived in the test file, not produced by running the engine.

## Rejected complexity (and the trigger that would revive it)

| Rejected | Trigger to revisit |
|---|---|
| Monorepo / packages / workspaces | The engine is consumed by a second app |
| Generic calculation DAG or formula language | A third tenure or user-defined formulas |
| Decimal arithmetic library | A reconciliation test fails because of float drift |
| Silently changing a locked scenario when new data lands | Never. New data is an "update available" plus a child scenario |
| Condo, multi-phase, JV waterfall, CMHC screening, HST | Sequenced after the rental engine is verified, not excluded |

Not rejected, and planned for once the engine is verified: GIS/parcel lookup, charts, AI-assisted extraction of cost guides and by-laws, AI explanation of results.

## Consequences

- Data freshness depends on ingestion jobs. Each record shows when it was last retrieved, and a failed fetch shows the last good value with its date.
- Conventions C2, C7, C8, C9 and C11 are deliberate simplifications. They are labelled in the UI and listed for expert review.
