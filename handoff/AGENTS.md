# Codex Agent Operating Instructions

## Mission
Implement a trustworthy, professional, modular GTA development-feasibility platform based on the included specifications and reference artifacts. These documents are a starting point, not a mandate to ignore discoveries in the user's existing repositories.

## Mandatory initial inventory
- Inspect the existing repos explicitly made available by the user, noting working languages, design systems, tested components, auth/database conventions, accessibility patterns and deployment setup.
- Produce `docs/implementation/REUSE_DECISIONS.md` identifying reusable packages/components, benefit, license/compatibility, and reject/accept rationale.
- Do **not** overwrite existing repos or deploy without instruction. Do not extract `.env` files, tokens, payment data, private user data or unrelated artifacts. Respect each project's license and ownership.
- Select a thin vertical slice and publish a proposed folder map and milestones before broad refactoring.

## Non-negotiables
1. **One deterministic calculation engine** drives all modes (Quick / Professional / Institutional). Complexity controls expose different inputs and analyses, not different hidden math or disappearing cost items.
2. **Every field has provenance**: user assumption, market estimate, verified external fact, regulated rule, or derived calculation; include effective/source dates, units, confidence and override behavior.
3. **No silently mutable scenarios**. Snapshots lock rate observations, policy versions, inputs, engine version and assumptions. New sources trigger comparison proposals.
4. **No artificial certainty**. Eligibility screening is not government approval; lender terms are negotiated; planning GIS is not final zoning approval; rebates may be conditional.
5. **No copy-paste of unverified spreadsheet formulas**. Re-derive mathematically, define sign/timing/area conventions and independently test.
6. **No unlicensed Altus cost-table redistribution**. Only store source metadata and user-supplied/licensed numbers.
7. **No AI-controlled core accounting math**. AI may assist document parsing, policy monitoring, research triage, explanation and UI, but only validated deterministic code posts financial outputs.
8. **No source-agnostic policy answers**. Each interpreted legal/program rule links to an authoritative source, jurisdiction and time window, and is human-reviewed before production.
9. Model **cash flow timing** explicitly, not just final totals; DC deferrals are not waivers, taxes/rebates are not instant cash, and construction financing accrues over a draw schedule.
10. Test accessibility, keyboard use, mobile/tablet fallbacks and professional desktop density.

## Recommended implementation sequence
- Milestone A: repo/design audit, canonical types and supported model conventions.
- Milestone B: pure tested engines for geometry, operating revenue, costs, draw/debt schedule and IRR/NPV; sources-and-uses balancing.
- Milestone C: UI wizard, modular advanced inputs, result drill-down and scenario locking.
- Milestone D: one well-governed live Bank of Canada observation adapter + manual verified policy registry.
- Milestone E: one municipality's verified charge schedule and policy/suitability dashboard.
- Milestone F: end-to-end scenario regression fixtures, exports and security/a11y review.

## Definition of done for any financial feature
Input schema + units; formula convention; derived-output trace; source provenance; fixture test with expected result; edge-case test; user-visible uncertainty; update/version behavior; review status.

## First task to execute
Read `HANDOFF_PROMPT.md`, inspect the chosen repositories, produce an architecture-and-reuse plan, and implement only the agreed pilot vertical slice while logging open decisions. Do not claim this handoff is a working app.
