# Agent instructions — GTA Development Pro Forma

Before public-facing implementation or release work, read and follow `AGENT_PROJECT_PLAYBOOK.md`.

1. The specification is `handoff/` (start at `handoff/README.md` and `handoff/AGENTS.md`). Treat it as read-only.
2. Current decisions are in `docs/implementation/`: `ADR-001-pilot-architecture.md`, `BUILD_PLAN.md`, `DECISION_LOG.md` and `REUSE_DECISIONS.md`. Don't reopen a DECIDED item without the owner.
3. `src/engine` is pure and deterministic: no IO, no clock, no randomness, no UI imports and no AI. Never copy formulas from the reference workbooks. Re-derive them and test them.
4. Every displayed number must have its source or its formula. Unknown means unknown, never zero. Synthetic data is labelled synthetic.
5. `handoff/reference-workbooks/` is git-ignored. Never commit or redistribute it.
