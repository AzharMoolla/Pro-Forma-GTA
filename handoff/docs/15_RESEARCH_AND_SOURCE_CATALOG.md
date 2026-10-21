# Research and sources (URLs / implementation leads)

The machine-readable source registry lives at [`../data/policy/source-registry.json`](../data/policy/source-registry.json). Entries are verified **landing pages** and potential data-access methods, not evidence that a live integration exists. Reviewed against web sources around 2026-10-21, where noted.

## Confirmed points relevant to this product
- Bank of Canada publishes a Valet financial data API and weekly major-bank posted prime observations; **2026-10-14 prime 4.45%** on the reviewed posting. Source: `https://www.bankofcanada.ca/valet/docs` and `https://www.bankofcanada.ca/rates/banking-and-financial-statistics/posted-interest-rates-offered-by-chartered-banks/`.
- Altus publishes an annual **2026 Canadian Cost Guide**, April 23, 2026; the guide draws from a proprietary project dataset and cautions against applying generic data unadjusted. Source: `https://www.altusgroup.com/featured-insights/canadian-cost-guide/` and press release.
- CMHC AHF new applications closed 2025-12-19. ACLP currently states open applications on its official program page. MLI Select points-based insurance incentives exist. Each product requires its own eligibility model and checking for later updates.
- The current Ontario affordable-residential-units data release effective **July 1, 2026** is available from Ontario Data Catalogue in CSV with a stated Open Government Licence – Ontario. Source: `https://data.ontario.ca/en/dataset/affordable-residential-units-for-the-purposes-of-the-development-charges-act-1997-bulletin`.
- Durham Region cites May 27, 2026 extended purpose-built rental housing DC deferral; Oshawa posts July 1, 2026 DC tables; York and Halton have 2026 published schedules/bylaws. Look up bylaw itself and payment triggers, not just summary table.
- CRA pages detail 2026 Ontario ENRRP rules and conditions; some effective dates and restrictions are narrow. Source: `https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/gst-hst-rebates/housing-rebates/ontario-enhanced-new-residential-rental-property-rebate.html`.

## Recheck before releasing models
Source legal terms, effective dates, indexing, geography, jurisdiction layering, program intake status, licensed cost data, and whether any update to Ontario legislation changed eligibility/time trigger. Record specific file downloads/retained citations in live ingestion system.

## Market landscape links
ARGUS Developer/Altus, Aprao, PropertyMetrics, TestFit, Feasly and the HKC Ontario calculator links listed in `docs/09_MARKET_AND_COMPETITORS.md`. These illustrate existing market tools, not an exhaustive competitive evaluation.
