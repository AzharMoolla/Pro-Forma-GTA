# Reuse decisions — cross-project synthesis

**Date:** 2026-10-21 · **Milestone:** A · **Status:** proposed, awaiting owner review
**Scope:** rental-only pilot, Toronto + Durham/Oshawa

This is not a list of files to copy. Each source project solved one hard problem well; this document names that problem, the core idea that solved it, and exactly where it lands in the pro forma. Code is re-written to fit, not ported. All source projects are owner-authored (no third-party licence obligations), but none carry a licence file, so nothing is vendored wholesale.

## Sources inspected

| Source | What it is | Best at | Reuse weight |
|---|---|---|---|
| **Work samples** — PLG720 final presentation, Work Sample 2026, Block Context map, PLG420 report | Owner's planning and pro forma work | What a planner actually shows: market evidence → program → cost → KPIs → scenarios → phasing | **High — drives the UI information architecture** |
| **Graveyard SaaS** | Ontario price-transparency platform (TS, Workers, Postgres) | Provenance enforced by structure, effective dating, supersede-not-edit, synthetic vs real data class, verify floor | **High — drives source/policy governance** |
| **AI Day Trade Bot (QuantLab)** | Local quant research lab (Python, SQLite) | Pre-registration, immutable hash-chained run ledger, observation vs publication vs vintage time, deterministic arithmetic | **High — drives scenario locking and engine discipline** |
| **Silbo (World Cup Scheduler)** | React/Vite consumer app with Supabase + Workers | Front-end toolchain, a11y testing at desktop + mobile, thin UI primitives | **High — drives the stack and test harness** |
| **LMDF** | Living-document standard + Studio | Claim register, rich export, audience-ordered value | **Low — export and claims only** |
| Reference workbooks (5 `.xlsx`) | Course/legacy pro formas | Byte-identical to `handoff/reference-workbooks/original/`; already covered by audit PF-001…PF-019 | Evidence only — **never** a formula source |
| Seller-Financed-Housing-Site, dubbing-booth, portfolio | Older/unrelated apps | Nothing not already covered above | Rejected |
| `My Docs` | Personal documents | — | **Not opened. Excluded.** |

---

## 1. Work samples → information architecture

The PLG720 deck is, in effect, the product's first user journey done by hand. Its slide order becomes the workspace order.

| In the work sample | Core idea | Lands in the pilot as |
|---|---|---|
| Housing Needs Snapshot (rent by unit type 2023 Q1–2025 Q3; % leased/sold choropleth; "absorption 82%") | Market evidence is dated and per unit type, and it comes *before* the numbers | **Market evidence card**: rent/vacancy per unit type with a date and source on every value. Evidence feeds assumptions as a *suggestion*; the user still owns the assumption |
| Pro Forma Testing table (hard / soft 15% / contingency 10% / remediation / fees → total, $ PSF) | Cost stack read top-to-bottom with PSF beside it | **Cost & budget card**: same row order, every row with $ and $/GCA ft². "15%" and "10%" render as *proxy* chips (audit PF-017), never as facts |
| KPI board (6% NPV, IRR 10-yr, stabilized NOI yr 6, earnings PSF, cap rate) | Five headline numbers, each with its basis spelled out ("Year 6", "10 yrs", "6% discount") | **KPI strip**: each tile shows value + basis + click-through trace. No tile without its period basis |
| Scenario matrix (Deeply affordable / Singles / Family / Recession) | Named scenarios side by side, few driver rows, same KPIs | **Scenario comparison**: columns = locked scenario snapshots, rows = changed drivers then KPIs, differences highlighted |
| Viable Scenarios (3 picks with one-line rationale) | A conclusion with reasons, not just a table | **Scenario note** field on every snapshot; the comparison view shows the rationale |
| Construction Phasing table (phase × duration, GFA by use, hard/soft, PSF) | Phases as columns | Out of pilot (single phase). Schema keeps a `phaseId` on cost lines so this becomes a view later |
| Block Context map, watershed maps | Site context sits beside the numbers | Out of pilot. Reserve a **Site** card slot that takes a static image/link; no GIS yet |

Visual cues to keep: muted planning-document palette (the PLG720 teal/sand), plain sans labels, large numerals for KPIs, tables over charts. Avoid dashboard chrome.

## 2. Graveyard SaaS → source and policy governance

| Core idea (where it lives there) | Accept / adapt / reject | Lands here as |
|---|---|---|
| **A value cannot exist without its source.** NOT NULL FK to a source document (`0001_price_provenance.sql`) | **Adapt** | `SourcedValue` type requires `sourceId`; registry loader rejects a policy rule or rate with no source; a test asserts every rule in `data/policy/` resolves |
| **Effective-dated records, no overlap per item** (GiST exclusion) | **Adapt** | Policy rules carry `effectiveFrom/To`; a validation test fails on overlapping windows for the same rule key |
| **Supersede, never edit; backdating refused with a legible reason** (`0004`, `0006`) | **Accept** | New source observation → new record + change proposal; locked scenarios keep the old pin. Error messages say *what the user did*, not which check tripped |
| **`synthetic` vs `real` data class at the data layer** | **Accept** | Every fixture and demo value carries `dataClass: 'synthetic'`; the UI shows a persistent "Synthetic demo" banner. This handles the handoff's `demo_only: true` |
| **Honest unavailability** ("a currency date with nothing behind it", `0036`) | **Accept** | Unknown DCs are `status: 'unknown'`, not zero; KPIs that depend on them show "incomplete" instead of a number |
| **One-command verify floor, green/red/not-run as three states** (`scripts/verify.mjs`) | **Adapt, smaller** | `npm run verify` = typecheck + lint + unit + registry validation + contrast. Prints *not run* explicitly |
| **Secret scan** (`scan-secrets.mjs`) | **Adapt** | Credential-shape scan, so the Supabase service key and API tokens never reach the client bundle or git |
| **Palette contrast computed, not asserted** (`validate-contrast.mjs`) | **Accept idea, own palette** | Contrast check over our tokens in the verify floor |
| **ADR folder, decisions not reopened** | **Accept** | `docs/implementation/ADR-NNN-*.md` |
| **Postgres provenance as constraints** (NOT NULL source FK, append-only triggers, effective-date exclusion) | **Accept** | Same pattern in our Supabase schema for cost, rate and policy records and for snapshots |
| Objective-register/ASPOS machinery | **Reject** | Too heavy for this project |
| Cemetery palette and brand | **Reject** | Different product |

## 3. AI Day Trade Bot → scenario locking and engine discipline

| Core idea | Accept / adapt / reject | Lands here as |
|---|---|---|
| **Immutable, hash-chained ledger of runs** (`ledger.py` `TrialLedger`: `previous_hash`, `row_hash`, UPDATE/DELETE triggers) | **Adapt** | `ScenarioSnapshot` = canonical JSON of inputs + source pins + engine version → SHA-256 (Web Crypto). Each snapshot records its parent hash. Locked = frozen object; "edit" makes a child |
| **Separate observation time, publication time and dataset vintage** | **Accept** | Rate observations carry `date` (rate applies), `publishedAt`, `retrievedAt`. Policy rules carry `effectiveFrom` and `verifiedAt`. The trace shows all of them |
| **Pre-register before results** (plans hashed before outcomes) | **Adapt, light** | A scenario's *purpose note* and driver changes are captured when it is created, before results are shown. Supports honest scenario comparison |
| **Preserve every attempt, including failed ones** | **Accept** | Snapshots are never deleted in the pilot, only archived |
| **Arithmetic is deterministic; LLMs never post numbers** | **Accept** (also AGENTS.md rule 7) | `src/engine` is pure TS: no IO, no `Date.now()`, no randomness, no AI. Enforced by lint rule + scan |
| **Cost stress / sensitivity as first-class runs** (`costs.py`, `execution_stress.py`) | **Defer to Milestone C** | Sensitivity = N snapshots from one parent with one driver varied; same engine |
| **Tests flagged stale after code changes** | **Adapt** | Snapshot stores `engineVersion`; opening it under a newer engine shows "recomputed under v0.x — differences:" instead of silently changing |
| Python stack, SQLite, Obsidian vault, statistics libraries | **Reject** | One language (TS) so the engine runs in the browser and the tests share types |

## 4. Silbo (World Cup Scheduler) → stack and test harness

| Core idea | Accept / adapt / reject | Notes |
|---|---|---|
| **React + Vite + TypeScript (strict) + Tailwind v4 + Vitest** | **Accept** | Same versions, so knowledge and config carry over. `tsconfig.app.json` flags (`noUnusedLocals`, `erasableSyntaxOnly`, `verbatimModuleSyntax`) copied |
| **Playwright with desktop + mobile projects and `@axe-core/playwright`** (`tests/e2e/smoke.spec.ts`) | **Accept** | Smoke + axe on every workspace route at both sizes |
| **Thin primitives over tokens, no component library** (`components/ui.tsx`: `cx`, `min-h-11` targets, `focus-visible` ring) | **Accept pattern** | Re-written against our tokens. Add a dense-table primitive Silbo lacks |
| **Fail the build loudly on a missing config** (`requireSupabaseEnv` Vite plugin) | **Accept pattern** | Used for "registry has an unsourced rule" → build fails |
| ESLint flat config | **Accept** | Plus a `no-restricted-imports` rule keeping React/DOM out of `src/engine` |
| **Supabase client + auth, Cloudflare Workers deploy, env-guarded build** | **Accept** | Same setup as Silbo, so it's already proven |
| Web-push, flag-icons, sport themes, venue art | **Reject** | Not relevant |

## 5. LMDF → business design and trust

| Core idea | Accept / adapt / reject | Lands here as |
|---|---|---|
| **Claim register: every public claim names its evidence and its boundary** (`gtm-001/trust-and-claims.md`) | **Accept** | `CLAIMS.md` before marketing copy, so we don't say "lender-certified" or "eligibility confirmed" (handoff guardrail) |
| **Full export of everything** | **Accept** | XLSX / PDF / CSV / JSON with inputs, sources and trace |
| Local-first, no account, no network | **Reject** | Not this product's goal (D-03) |
| **Synthetic fixtures named as such in every demo** | **Accept** | Same as Graveyard's data class |
| `.lmdf` packaging, Tauri Studio, capability packs, conformance suite | **Reject for pilot** | A future export target at most |

---

## Reuse scorecard (summary)

| Concern | Source of the pattern | Decision |
|---|---|---|
| Information architecture, scenario matrix, KPI basis labels | Work samples | Accept |
| Provenance-required values, effective dating, supersede, data class | Graveyard | Accept (as types + tests, not DB) |
| Snapshot hashing, parent chain, time-kinds, deterministic engine | QuantLab | Accept |
| Toolchain, a11y e2e, UI primitives | Silbo | Accept |
| Claims register, rich export | LMDF | Accept |
| Supabase + Workers backend, ingestion | Silbo / Graveyard | Accept (D-03) |
| Any spreadsheet formula | Reference workbooks | **Rejected**: re-derive and test (AGENTS.md rule 5) |
