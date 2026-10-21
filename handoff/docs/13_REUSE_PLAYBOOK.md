# Codex: selecting design/infrastructure patterns from other projects

## Inventory categories
Brand/navigation patterns; form components; charting; data tables; typography/tokens; keyboard interactions; state management; APIs/background jobs; auth and permissions; hosting and deployment; logging; accessibility; export/reporting; file management; source provenance/AI assistant patterns.

## Scoring
For each candidate: `reuse_value(1-5)`, `compatibility(1-5)`, `dependency_weight(1-5)`, `security_or_license_risk(1-5)`, `integration_cost(1-5)`. Record evidence in `REUSE_DECISIONS.md`. Preserve modular boundaries; copy only what materially improves product and maintenance.

## Red flags
Directly copying a whole website shell, unreviewed scraped data, private keys, unrelated code, unlicensed icon/fonts/images, entire heavy framework for a tiny module, hidden customer records or blending this project's source of truth with another product's state.

## Ideal reuse
Design tokens, inputs, validation patterns, icons, helpful tables/charts and responsive layout from existing apps, paired with a new clean domain financial engine and policy ingestion rules designed specifically for development feasibility.

## Artifacts to produce before code migration
Repo inventory, reusable-components list, selected design direction, dependency plan, domain/contract map, and small demo of two screens + one working calculation trace using dummy data.
