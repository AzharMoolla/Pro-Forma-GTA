# GTA Development Feasibility — Codex Desktop Handoff

**Prepared:** 2026-10-21  |  **Deliverable type:** research, architecture and implementation specification (NOT a functioning product)

## Goal
Create a professional, browser-based real-estate development pro forma tool whose computation engine scales from small projects to complex institutional multi-phase developments. Begin with **Toronto and Durham/Oshawa**, then build coverage across the wider Greater Toronto Area. Key distinguishing feature: **auditable financial modeling + dated public-policy/program knowledge + rate/cost data lineage + an excellent modular UI**.

## Begin here (for Codex)
1. Read [`AGENTS.md`](AGENTS.md) and [`HANDOFF_PROMPT.md`](HANDOFF_PROMPT.md).
2. Review [`docs/00_EXECUTIVE_BRIEF.md`](docs/00_EXECUTIVE_BRIEF.md), [`docs/01_PRODUCT_REQUIREMENTS.md`](docs/01_PRODUCT_REQUIREMENTS.md) and [`docs/02_SCOPE_AND_ROADMAP.md`](docs/02_SCOPE_AND_ROADMAP.md).
3. Inspect user-designated **existing repositories** for reusable components, patterns, packages and infrastructure **before** proposing a stack. Reuse selectively; do not copy proprietary/licensed assets or secrets.
4. Read [`docs/04_FINANCIAL_ENGINE.md`](docs/04_FINANCIAL_ENGINE.md) and [`docs/07_MODEL_AUDIT.md`](docs/07_MODEL_AUDIT.md) before copying **any** workbook calculation.
5. Read [`docs/05_POLICY_AND_RATES.md`](docs/05_POLICY_AND_RATES.md), [`docs/06_DATA_GOVERNANCE.md`](docs/06_DATA_GOVERNANCE.md) and machine-readable sources and policies under `data/`.
6. Build a small, verified vertical slice first. Keep source provenance, scenario locking, calculation auditability and robust tests from day one.

## Contents
- `docs/` — product, research, UX, formula, policy, security, tests, rollout and decision documents.
- `data/` — machine-readable audit findings, field catalog, modules, policy/source registry, rate examples, project demo and QA cases.
- `schemas/` — JSON Schema contracts for source records, policy rules, projects, audit findings, and observations.
- `contracts/` — platform-neutral TypeScript interfaces (specification only).
- `reference-workbooks/` — **unchanged** five uploaded workbooks and existing 19-finding audit register.
- `MANIFEST.json` — hash-based file inventory; `scripts/verify_handoff.py` verifies integrity.

## Important boundaries
- `source-registry.json` contains **links to authorities, NOT an ingested, current, comprehensive tariff database**.
- Altus public Canadian Cost Guide is a benchmark/reference. **Do not redistribute its cost tables without examining license/permission**.
- CMHC Affordable Housing Fund closed to new applications on **2025-12-19**; keep the template as a historical/legacy model only.
- The Bank of Canada 4.45% prime observation in `data/examples/` is an explicitly dated historical fixture, **not an automatically live rate**.
- The 19 issues constitute **preliminary static workbook analysis**. A confirmed reference error is distinct from a methodological concern requiring expert review.
- Government rules and forecasts change. Every source must be checked against authoritative primary material at time of implementation and before user-facing claims.
- Not financial, tax, lending or legal advice. Never describe analysis as lender-certified or municipal approval.

## Proposed first deliverable
A browser prototype for **one Ontario purpose-built rental project** with: project setup → configurable units/areas/budget → monthly cash-flow and financing → sourced municipal charges/rate assumptions → scenario comparison → traceable outputs and issue panel. Toronto + Oshawa are launch targets; finish one jurisdiction end-to-end before widening.
