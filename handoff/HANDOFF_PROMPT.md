# Copy this prompt into Codex Desktop

Use this folder as the authoritative **research and requirements handoff** for a GTA-first professional development pro forma product. Read `README.md` and `AGENTS.md`, then review all `docs/`, `data/`, `schemas/` and selected original reference spreadsheets. I have other existing projects with good UI, design patterns and infrastructure. First inspect the repositories **I make available** and identify safe, license-compatible opportunities for reuse; do not assume their architecture should be copied wholesale.

Please deliver, in order:
1. Existing repo inventory and reusability scorecard.
2. Architecture decision record and minimal build plan, with explicit rejected complexity.
3. Product UI shell using a modular quick/professional/institutional experience with excellent interaction design.
4. Independently tested calculation core for site/unit/area, revenues/costs, sources/uses, monthly draws/interest, debt constraints, exit valuations, equity cashflows and IRR/NPV.
5. GTA policy-source registry, initially **Toronto and Durham/Oshawa**, and a dated Bank of Canada rate adapter. Policies must be source-linked, effective-dated and review-gated, with unchanged approved scenario snapshots.
6. Audit/outcomes UI showing each result's formula, contributing inputs, provenance and validity. Expose an issue log seeded by `data/audit/findings.json`.
7. A single worked synthetic project and automated tests so I can reliably compare scenarios.

Constraints: don't blindly reuse formulas from the reference XLSX files; don't invent municipal rates or grant approvals; don't make unsourced legal conclusions; don't distribute Altus tables without permission; don't silently update historic financial models. This bundle is a specification + prior audit, not a complete verified financial engine.

Start with the smallest credible end-to-end product and document unanswered questions before expanding feature scope. Keep code separated into domain modules and don't include secrets, private user data or unrelated components from my other projects.
