# Reference workbook audit — 19 preliminary findings

The five uploaded `.xlsx` files are bundled unchanged under `reference-workbooks/original/`; a previously produced `GTA_Proforma_Model_Audit_Register.xlsx` is under `reference-workbooks/audit/`. Source-of-truth structured record: `data/audit/findings.json`. This is a **preliminary static audit**, not a fully recalculated certified audit. Dates/programs can be obsolete and original sample economics are not proposed defaults.

## Critical issues
- **PF-001** Long-term baseline `E54`: debt-service ceiling uses NOI minus DSCR target instead of qualifying NOI divided by target coverage (clarify field business intent).
- **PF-003** Long-term baseline `B56:B67`: static revenue rows break dependency on inputs.
- **PF-007** Condo parking: area implied by parking `C12` (~71,943 ft²) vs modeled underground area `C29` (~22,234 ft²); possible multiple levels, so reconcile before declaring cost omission.
- **PF-013** Construction costs: blanket/no HST classifications are inadequate for actual rental construction tax cash timing and rebates.
- **PF-015** CMHC Template: AHF funding assumptions are historical-only for new applicants after 2025-12-19.

## High-priority examples
- **PF-002** Long-term baseline `B55`: studio rent uses one-bedroom vacancy instead of studio vacancy.
- **PF-004** Long-term baseline `E48`: half-draw construction interest approximation masks timing risk.
- **PF-005** Long-term baseline `B14`: construction GCA including below-grade area used as planning FSI numerator.
- **PF-006** Condo `C26`: actual GFA uses expected FSI (`C17`) instead of actual (`C25`); currently masked by identical values.
- **PF-008** IRR model `B113`: loan sizing takes DSCR capacity but ignores LTV constraint, even though LTV doesn't bind sample.
- **PF-009** IRR model `B128/F163`: equity denominator references construction loan, not equity contributed.
- **PF-012** Construction cost estimates `F5:H9`: numeric outputs hardcoded and fail to update when floorplate/floor count changes.
- **PF-016** AHF budget `E27`: municipal grant assumption hardcoded, no evidence of award.
- **PF-018** Legacy prime-rate inputs: undated and potentially stale compared to dated BoC published observation (historical spreadsheet assumptions may be intentional).
- **PF-019** Local development charge assumptions: no governed source/version/jurisdiction/timing.

## Medium-priority examples
- **PF-010** Hardcoded amortization/hold values in remaining loan balance.
- **PF-011** Mismatched pre-completion vs terminal NOI valuation basis for retail.
- **PF-014** Mixed hardcoded/cross-geography affordability ratios.
- **PF-017** Generic soft cost and contingency percentages without project scope adjustment.

## How to use
Treat each finding as an issue ticket with evidence, required fix, regression test and disposition. Build an independent formula rather than patching cell references blindly. For any discrepancy, mark `confirmed_formula`, `methodology_risk`, `requires_review`, `not_reproduced`, or `intentional_historical` as appropriate. Preserve original workbook files and include hash in source record.

## Why these matter for the product
The product must not merely mimic Excel. Broken dependencies, silent simplifications, inconsistent areas, obsolete funding programs and invalid equity denominators are precisely the failures a provenance-aware engine should prevent. These 19 cases become **regression and UI warning acceptance fixtures**.
