# Architecture and package boundary sketch

```text
app/dashboard (UI, form and scenario interactions)
     ↓ calls typed contracts
model-api (authorization, versioning, orchestrator)
     ↓
model-core (pure functions: geography/areas → revenue/costs → draws/debt → KPIs)
     ↕ evidence pins (read-only for run)
source-registry + policy-rules (review-gated versions)
     ↑ separate ingest pipeline
Bank of Canada / CMHC / Ontario / municipal data + manual verified entry
```

For each model run, persist project/scenario inputs, versioned legal and market pins, engine version and calculated trace. External APIs may fail without corrupting previous snapshots.

This is a design sketch, not installed backend code. Adapt to the user's existing repositories after investigation.
