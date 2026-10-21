# UX concept and design reuse

## Design principles
Professional financial rigor with consumer-grade usability. Neutral design, thoughtful typography, unobtrusive semantic color, dense but legible tables, restrained motion, visible units, collapsible advanced sections, deliberate destructive-action confirmation and no decorative fake functionality.

## Views and navigation
`Dashboard > Projects > Project Workspace`; inside workspace: Overview / Site & Program / Cost & Budget / Revenue & Operations / Finance / Policy & Incentives / Scenarios / Sources & Audit / Export. A persistent top summary displays model vintage, scenario lock, source freshness and issue count.

## Workspace layout
Left: section navigator, module depth toggles and quick links. Center: editable cards and schedules with spreadsheet-like numeric efficiency, segmented input/analysis panes. Right: inspector showing selected field's source, formula, unit, last review, overridden status, causal effect on KPIs, and notes. Split layout collapses for smaller screens.

## Sample card
**Construction Financing** — Index: Bank of Canada posted major-bank prime; observed 2026-10-14; observation 4.45% (historical example) + editable lender spread; fixed/variable selection; lender commitment fee; funding draws; interest reserve; repayments; max loan sizing. Source chip opens BoC series and shows "update available" only if newer observation actually checked.

## Modules/presets
`data/ui/modules.json` defines UI presentation; modules are **not separate math engines**. Advanced toggle example: parking cost detail, interest-rate stress, CMHC preliminary eligibility, affordable housing grant scenarios, yield/cap valuation, waterfall optional. Off-state must document retained proxy/default assumptions.

## States
Empty (with actionable setup); loading; valid/stale/unverified/frozen; missing primary data; conflict between legal and user sources; mathematically invalid; scenario changed pending commit; eligibility possible vs impossible vs unknown vs approved. Never hide stale/missing behind a green success chip.

## Tables and money
CAD default; clear integer and decimals; monthly versus annual labeling; IRR/XIRR dates; `ft²`, `m²`, units, %, bps, $/GCA ft², $/NSA ft²; conversions explicit and centrally managed. Tables export with raw numeric values, assumptions, period labels and provenance.

## Reusing other projects
See `docs/13_REUSE_PLAYBOOK.md`: ask Codex to inspect actual existing repos and selectively adopt layout/navigation/typography/forms/auth/backups/export patterns. Preserve ownership and licensing, avoid blindly porting huge app shells and unrelated dependencies.

## UX acceptance exercises
Complete a 10-unit townhouse screening in minutes without finance jargon; complete a 250-unit rental case with precise input audit; flip affordable proportion and inspect effects; view a source update without changing a locked approval; navigate exclusively by keyboard; understand a rejected program criterion.
