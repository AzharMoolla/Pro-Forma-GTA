# Product requirements

## Project onboarding
Project address/parcel + jurisdiction confirmation (never geolocation alone as legal authority); use/tenure (market rental, affordable rental, condominium, townhouse, mixed-use; commercial later); building phase(s); area program; parking; financial start/date basis. Standardized unit types and effective measurement units. Defer site-specific approvals until user evidence exists.

## Adjustable model intensity
- **Quick**: basic program/areas, typical costs, rents/sale values, carrying costs, funding assumptions, feasibility ranges, caveats.
- **Professional**: detailed trade/budget components, monthly cashflow, debt draws and tests, local policy charges/rebates, sensitivity grids and returns.
- **Institutional**: phases, multiple lenders/tranches, capitalization/refinance, preferred equity and waterfalls, contingencies, scenario trees, attribution, export packages, approvals.
One calculation pipeline; a mode adjusts visibility, defaults and required evidence. Missing optional modules get **explicit proxy assumptions** instead of silently dropping costs.

## Required modules
Project profile; parcel/planning and area schedule; unit mix; rents/pricing/absorption; hard costs; soft costs; land closing/carry; construction phasing; levies/fees/DCs; taxes/rebates; debt/equity; operating stabilization and exit; financial KPI dashboard; scenario management; reference-data registry; policy/eligibility; audit and diagnostics; exports.

## High-value UX actions
- Each field: label, unit, value, provenance chip, date, source link, override, help, inheritance and impact preview.
- Filter/expand sections with tasteful toggles and progressive disclosure, not clutter or overwhelming steps.
- Inline dependency previews (e.g. increasing affordable-unit proportion changes rental income, DC treatment and *possible* program financing eligibility).
- Explain calculation by formula graph with source-of-truth values, version and dependent KPIs.
- Compare baseline vs edited policy/rate scenario; "accept into new scenario" never overwrite original.
- Audit issue inbox: unresolved critical, source stale, definition clash, missing quote, program closed, source mismatch, cash mismatch.
- Accessible keyboard/screen-reader flow; dense desktop modeling screens; useful mobile read-only overview.

## Core outputs
Development budget and sources/uses; monthly cashflow; return of/return on capital; unlevered and levered IRR/XIRR (when meaningful); NPV; yield-on-cost; profit and margin with explicitly named denominators; peak equity; minimum DSCR; LTC/LTV utilization; residual land value; debt balloon; sensitivity; scenarios and evidence/report exports.

## Exclusions from first slice
Parcel-by-parcel legal zoning determinations; fully autonomous approvals/funding applications; real-time construction tenders; lender certified valuations; fully automated Altus table ingestion; every GTA municipality; generic AI that creates unvalidated finance formulas; complete REIT accounting and multinational tax.

## Functional acceptance
An analyst can clone and lock a model, change one assumption, see consistent downstream cash flows and a before/after bridge, see source and formula of any headline result, and export all inputs/outputs/policy snapshots in a machine-verifiable bundle.
