# Open questions and decisions requiring evidence

- Which existing repos and packages can Codex inspect; which UI components/design patterns should be reused; what licenses?
- Should first pilot support **rental only** to ship cleanly, or rental and condo simultaneously? Roadmap recommends one rental project end to end, with condo schema ready.
- Does the initial product serve single-user local analysis or multi-organization client collaboration? Avoid architecting enterprise permissions unless needed.
- Are professional cost datasets licensed, or will users enter Altus-derived benchmarks personally and upload quotations?
- What are the exact policy jurisdictions for phase 1 (Oshawa vs Toronto first); who verifies municipal data and program rules?
- Scope of GST/HST calculations: preliminary placeholders with warnings vs independently reviewed professional tax engine?
- Scenario timing conventions for monthly draws, interest capitalization, lease-up, sale closing and refinance.
- When should a stale source block an export rather than display a warning?
- Do users want Excel-first import/export parity, or source-native model UI first?
- What report standard is required (developer internal, investor brief, lender underwriting, municipal economic report)?
- Will confidential user data be sent to external AI services? Default should be NO.
- Desired hosting, database, auth and monitoring stack after existing-repo review.

## Decision log template
`date | decision | alternatives considered | rationale | evidence | owner | reviewer | re-evaluate trigger`.

## Principles already decided in conversation
- GTA-first, strong Toronto/Durham/Oshawa pilot.
- Formula quality outranks spreadsheet resemblance.
- Attractive configurable UI and scaling from small to major developments.
- Government programs, rates, legislation and construction cost benchmarks surfaced with dates.
- Modular progressive disclosure and traceable assumptions/facts/derived results.
- Existing other projects can provide good design/infrastructure **after inspection**.
