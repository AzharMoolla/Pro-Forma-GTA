# Suggested architecture (adapt only after inspecting user's existing repositories)

## Bounded contexts
1. `projects` — project, scenario, organization, phase and permissions.
2. `model-core` — deterministic calculation DAG / domain engine (no network IO).
3. `model-runner` — versioned orchestration and performance; scenario calculation outputs.
4. `field-registry` — reusable types, units, metadata, validation and UI presentation.
5. `data-connectors` — Bank of Canada, documents, municipal public-data endpoints / CSV/HTML adapters.
6. `source-and-policy` — evidence snapshots, rule validation, effective dates, geospatial applicability and impact previews.
7. `web-app` — project wizard, tables, charts, inspectors, scenario and audit surfaces.
8. `exports` — XLSX/CSV/PDF/report with source vintage and full audit; honor appropriate artifact generation toolings.

## Dataflow
`Project input -> Normalized validated domain model -> Effective-dated rule selector / source snapshot -> Cashflow engine -> KPI engine -> Audit/provenance DAG -> UI/report`. External ingestion is **upstream**, asynchronous relative to user interaction; model calculations stay reproducible and not hostage to API availability. Allow local/manual source snapshots.

## Suggested entities
Organization, Project, Parcel, Scenario, ProjectPhase, UseProgram, UnitType, CostLine, RevenueLine, DebtFacility, Draw, EquityContribution, PolicyRule, SourceDocument, Observation, ScenarioSourcePin, ModelRun, AuditIssue, ApprovalEvent, UserOverride.

## Nonfunctional requirements
Configurable precision; reliable deterministic recalculation; no formula eval of untrusted strings; versioned migrations; efficient incremental recomputation; job queue for bigger sensitivity matrices; reproducible offline snapshots; secure per-project authorization; encrypted uploads; export auditable provenance.

## Reuse, not premature stack lock
A plausible implementation is TypeScript/React with a deterministic TS domain package and relational storage, but **do not commit to that merely because this spec mentions TS interfaces**. Inspect the user's existing app architecture and design system first; choose the simplest maintainable method compatible with source auditability. Use database geography extensions only if GIS applicability actually needs them.

## API sketches (illustrative)
`POST /model-runs` calculates immutable scenario hash; `GET /scenarios/{id}/trace/{metric}` shows formula derivation; `GET /sources/{id}/versions`; `POST /scenario-changes/{id}/preview`; `POST /scenario-changes/{id}/accept` creates new version; `GET /policy-rules?jurisdiction&effectiveAt&projectAttributes`; `GET /rates/{seriesId}/observations` shows dated facts. All require appropriate auth and version control.

## Monitoring
Instrument ingest freshness/parse failures/rule-review backlog and model cashflow invariant failures separately. Do not claim "current" if a source fetch failed; show last verified date and warning.
