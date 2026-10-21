# Policy, government programs, finance benchmark and GTA coverage

**Research verified on 2026-10-21 to the extent stated.** No rates, legal eligibility or program awards have been ingested. `data/policy/source-registry.json` is a **source list / review backlog**, not a guarantee of applicability.

## The core pattern
`Source -> Observation / versioned document -> Human-reviewed policy rule -> Geographic & date eligibility -> Calculated liability/cash event -> Scenario snapshot`. AI can *suggest* extraction and changes, never silently activate them as verified legal rules.

## Source priorities
- **Rates**: Bank of Canada Valet API (`https://www.bankofcanada.ca/valet/docs`) for published financial series. Major-bank posted prime series **V80691311** listed on official posted-rate page (`https://www.bankofcanada.ca/rates/banking-and-financial-statistics/posted-interest-rates-offered-by-chartered-banks/`), **4.45% on Oct 14, 2026**. Different bank/lender products, spreads and rate agreements are not inferred from this generic reference.
- **Construction benchmarks**: Altus **2026 Canadian Cost Guide**, published April 23, 2026 (`https://www.altusgroup.com/featured-insights/canadian-cost-guide/`). Cost tables are proprietary; do not redistribute or ingest without proper rights. Translate guide methodology/metadata into user-entered or licensed parameters; include construction-start escalation.
- **Ontario DC statute**: `https://www.ontario.ca/laws/statute/97d27` current consolidated source. Applicability includes residential rental unit-bedroom discounts, affordability exemptions subject to tests, effective dates and transitions; additional provincial amendments may matter. Do not treat a statute section as the complete payable local rate.
- **Ontario affordable thresholds**: `https://www.ontario.ca/page/municipal-development-and-community-benefits-charges-and-parklands` and data: `https://data.ontario.ca/en/dataset/affordable-residential-units-for-the-purposes-of-the-development-charges-act-1997-bulletin` effective **July 1, 2026** bulletin. Preserve prior bulletin versions for past projects. Data catalogue lists open-data license; review attribution obligations.
- **CMHC MLI Select**: `https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/multi-unit-insurance/mliselect` points/incentives linked to affordability/accessibility/climate. Screen only; insurer/lender approval distinct.
- **CMHC Apartment Construction Loan Program**: `https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/funding-programs/all-funding-programs/apartment-construction-loan-program` states **open for applications** on reviewed site. Standard-rental page `.../standard-rental-housing` includes project, financing and affordability criteria. Always verify immediately before users act; borrower underwriting matters.
- **CMHC Affordable Housing Fund**: `https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/funding-programs/all-funding-programs/affordable-housing-fund`: portal **closed to new applicants December 19, 2025**, funding committed; model only historical/committed cases under proper statuses, never open new-project eligibility.
- **GST/HST**: CRA (`https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/gst-hst-rebates/housing-rebates/ontario-enhanced-new-residential-rental-property-rebate.html`) for Ontario ENRRP (generally construction begins **2026-04-01 through 2027-03-31**, with conditions); other NRRP/eligible self-supply/ITC timing on CRA main rebate page. These are complicated and require review.

## Municipal research — launch candidates
- **City of Oshawa** DC page: `https://www.oshawa.ca/business-development/planning-and-development/development-charges/` shows **July 1, 2026** residential schedules; note city's own charge, Durham Region and education board rates, adjustments and different due dates; municipal webpage itself warns about verifying legal bylaws.
- **Durham Region**: `https://www.durham.ca/doing-business/planning-and-development/development-charges/` links extended purpose-built rental DC deferral approved **May 27, 2026** and other programs. Such a deferral changes timing, not necessarily nominal amount.
- **Toronto**: fee schedule `https://www.toronto.ca/city-government/planning-development/application-forms-fees/fees/` effective January 1, 2026; separate city DC, education DC, parkland, CBC and potential other agreements. Zoning/bylaw GIS may be useful but isn't legally exhaustive.
- **York Region**: `https://www.york.ca/yorkregion/bylaws/development-charges-bylaw-0` bylaw 2026-20 effective May 21, 2026; includes regional services, geographic exceptions. Lower-tier charges separately needed.
- **Halton Region**: `https://www.halton.ca/the-region/finance-and-transparency/financing-growth/development-charges-front-ending-recovery-payment` 2026 schedules; built boundary vs greenfield / rural and use distinctions.
- **Peel Region and remaining GTA local municipalities**: **backlog** until separately researched and verified. Never synthesize a charge just because a geography looks similar.

## For each policy capture
- `policy_id`, governing authority, jurisdiction, geographic shape/parcel condition, legal text URL and document hash, rule type (charge/rebate/deferral/grant/loan/eligibility/requirement), `published_at`, `valid_from/valid_to`, rate-lock/applicability dates, qualifying project attributes, calculation version, obligation/benefit, payment dates, exceptions, reviewed-by/status, supersedes, confidence, licensing, and observations supporting assumptions.
- Evaluate program state (`open|closed|paused|historical|unknown`), and assistance state (`potential|applied|conditional|approved|received|rejected`). Unknown cannot be treated as zero charge or confirmed funding.

## Change ingestion protocol
Poll/check feeds at suitable cadence, store full raw observation and hash, detect meaningful content changes, compare previous version, require domain reviewer for extracted legal or financial rule, compute impact on **new candidate scenario only**, show audit diff. Expired rules remain for historical calculations. Link to authority and record last fetched and verified separately.

## Accuracy risks
DC discounts can depend on bedroom count/use/vintage; tax rebates on construction dates/landlord type; CMHC mortgage and funding products have distinct criteria; rate benchmark != offered lending rate; local CIPs are polygon/parcel-specific and budget/contribution-limited; zoning FSI definitions and parking exemptions are bylaw-specific.
