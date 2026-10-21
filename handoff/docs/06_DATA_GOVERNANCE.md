# Smart fields: classification, provenance, overrides and scenario integrity

## Five origin classes
1. **User assumption** — proposed input (rents, timing, land price, negotiated spread), editable, versioned, with owner/date.
2. **Market benchmark / evidence** — dated published or quoted values (Altus with rights, appraisals, contractor quotes, absorption comps), specify geography/type/measure/estimate class.
3. **Verified external fact** — dated observation, e.g. Bank of Canada official published benchmark, municipal dataset; immutable raw observation and source URL.
4. **Regulatory/policy rule** — jurisdiction, statutory/bylaw authority, effective window, conditions, review sign-off.
5. **Derived calculation** — deterministic formula, engine version, dependencies, units and date basis.

## Smart field lifecycle
`discovered -> sourced -> parsed_candidate -> domain_reviewed -> approved_for_model -> superseded/expired`. User overrides are separate values, never overwrite evidence. Source effective date, fetched date, last verified date and contract/economic applicability can differ.

## Scenario snapshot
All inputs, market observations, regulatory rule versions, feature flags, engine semver, time basis, geography resolution and warnings are hashed into a reproducible snapshot. A new prime observation presents `old / proposed / changed financial outcomes`, with opt-in creation of a new scenario revision. Named milestone lock: draft / analyst-reviewed / committee-issued. Do not allow background data refresh to rewrite signed-off returns.

## Automation cadence (proposal, not a live automation)
- Bank of Canada: query official observation only after publication frequency; retain series ID and exact date. Check weekly prime publication after posted Wednesday update; could check daily for missed releases but should never claim a rate refreshed earlier than source.
- Regulations and municipal tariffs: weekly or when amendment/indexing scheduled, plus change detection on statutory consolidated source and municipal bylaws; quarterly manual compliance review.
- CMHC program statuses: weekly / before any export relying on funding eligibility; alerts for closures or reopened intakes.
- Altus: annual new edition / licensed feed terms; no automated unlicensed scraping.

## Rule and observation conflict policy
If official table and municipal explainer disagree, flag manual resolution; do not silently choose the larger/smaller. If rule applicability can't be conclusively determined, show range and `requires external confirmation`, omit entitlement from committed-funds base case unless separately approved.

## Compliance and audit requirements
Source URL, retrieved at, content or document hash, terms/license, publication date, valid-from/to, reviewing analyst, and last reviewed date must be queryable for each field. Track human decision when accepting corrections. Exports include source-as-of report. Archive changed public docs where authorized, or hashes/metadata where redistribution is limited.

## Data protection
Project economics, counterparties, bids and financing offers can be commercially sensitive. Encrypt at rest/in transit; least privilege per organization/project; secure file handling; redacted logs; limited retention; backups/restore tests; no third-party AI sharing without user controls. In a pilot, local/offline-first snapshot can be a strong default; choose storage after inspecting existing user infrastructure.
