# Financial engine: definitions, formulas and model conventions

**Not a production financial methodology certificate.** Confirm lender, tax and valuation conventions with qualified experts. Implement deterministic, unit-tested numerical functions rather than spreadsheet cell reference chains.

## Engine foundations
- Versioned project, assumptions, scenario, time basis, source snapshot and engine release.
- **Monthly cashflow** is canonical for development; aggregate to annual using dates. Start/end timing convention recorded for each category.
- Distinguish financial currency (CAD), areas and units, percentage (fraction internally) and annual/monthly rate conversion (choose effective vs nominal, don't mix).
- All money uses decimal/fixed-point accounting (or integer cents with explicit rounding) rather than unchecked binary floats at book-close boundaries; use reliable numerical solver for IRR.
- Hard cost, soft cost, land, taxes, fees, levies, financing expenses and reserves each appear *once* in sources-and-uses. Name and audit exclusions.

## Geometry and use program
Definitions kept separate: site lot area, construction GCA, planning-defined GFA, above/below-grade GFA, saleable area (NSA), leasable area (NLA), floorplate, net-to-gross efficiency, parking levels/capacity. `FSI = bylaw_defined_counted_GFA / defined_lot_area`; exclusions are municipality- and bylaw-specific. `gross_construction_area = SUM(components_across_levels)`; physical and paid construction areas must reconcile.

## Rental revenue
For category u in period t, potential rent = active_units[u,t] × monthly_rent[u,t], adjusted for concession periods; expected collected rental income = potential rent × (1 - vacancy_loss_rate[u,t]) - credit_loss - free_rent (avoid counting the same effect twice). Other income modeled separately. NOI = effective gross income - recoverable/nonrecoverable operating expenses per lease assumptions - normalized reserves only if valuation/lending definition includes them. Stabilized forward NOI must use a specified valuation date.

## Condo
`gross_sales = SUM(unit_count × assumed_net_saleable_area_per_unit × price_per_saleable_area)`, less sales incentives and commissions if relevant; presale/closing schedules distinguish contracted price, refundable customer deposits (and legal restrictions on using them), escrow/trust holdings, progressive cash receipts and closing draws. Condo cash timing must not assume that pre-sale cash is freely available to pay construction invoices.

## Construction budget and phasing
Conceptual `cost = priced_scope_area × benchmark_cost_per_matching_unit × adjustment_factors`; detailed `cost = SUM(quantity × tender/quoted_unit_rate)` after reconciled mapping, not both rolled up twice. Schedule base commitment, escalation by spend month, contingency allowances/uses, soft fees, interest, land carry, city/regional/school/CBC/parkland levies and taxes separately.

## Financing ledger (per loan tranche j, month t)
`opening_debt + funded_draws + capitalized_interest - principal_repayments = closing_debt`. Interest = documented compounding/day-count or monthly accrual on opening balance and intra-period draws, not always 1/2 of all principal. Rates = applicable dated benchmark observation + negotiated spread, with floors/caps and fixing dates where contractual. Commitments, standby fees and refinance costs are separate. Debt draws must satisfy cash availability, lender conditions, and allowed costs; circular construction interest may require a convergence method with convergence checks or explicit interest reserve.

## Debt sizing
`DSCR = qualifying_NOI / contractual_annual_debt_service` with explicit lender addbacks/exclusions. For a target coverage `required_debt_service_ceiling = qualifying_NOI / target_DSCR` (NOT subtraction). For amortizing debt: periodic payment `A = P*r / (1-(1+r)^(-n))` for r>0, and `A = P/n` for zero interest. DSCR-limited loan = debt-service ceiling / annuity factor; combine constraints: `maximum_loan = min(DSCR_capacity, appraised_value × LTV_limit, eligible_project_cost × LTC_limit, other lender/program limits)`, each only where relevant. Negative/unknown capacity cannot yield a positive confirmed finance amount.

## Exit and investor returns
`terminal_gross_value = stabilized_forward_NOI / exit_cap_rate` only if cap rate > 0 and definition matches; then subtract selling costs, prorations and debt payoff once. Differentiate levered investor cashflow from unlevered project cashflow. `NPV = SUM(CF_t/(1+r)^(t/year_periods))` with consistent timing; periodic IRR applies only to equally spaced intervals. Use dated XIRR for irregular dates with multiple-root/no-root detection. Display `IRR unavailable` or cautions where flows don't have suitable sign changes. Equity multiples = distributed equity proceeds / total equity contributed (define sponsor/JV variants). Margin explicitly defines denominator: profit/revenue vs profit/cost are not interchangeable.

## Residual land value
Solve for land price that makes the target profit/margin/levered IRR true given all closing/finance/levy/tax interactions. Not always `GDV - costs - target profit` when debt and timing depend on land price; solve as a bounded root-finding problem and disclose non-convergence/multiple feasible branches.

## Affordable/policy variants
Deferral vs exemption: deferral **shifts cash payment date** and may involve carrying interest; waiver reduces liability. Incentive can be **eligibility possibility**, application, conditional approval, award and actual receipt. Keep disbursement time and repayment conditions. Tax paid ≠ ultimate tax cost; segregate GST/HST incurred, self-supply effects, input credits, possible rebates and filing/receipt dates. Consult CRA/professionals for eligibility.

## Checks to fail or flag
- sources/uses unbalanced; area or parking inconsistent; debt ledger doesn't reconcile; legal bylaw/rate outside effective window; projects with dates inconsistent with eligibility; unverified grant assumed collected; return denominators referencing loan instead of equity; hard-coded derived rows unresponsive to inputs; units mismatch.
- test periods spanning rates change, changes in unit mix, no debt, zero-interest amortization, early repayment, adverse/negative NOI, subsidized vs market-rate scenarios, two-phase drawdown, irregular equity flows.

## Trace payload
Output `{metric_id, amount, unit, period_basis, formula_id, engine_version, dependency_ids, assumptions, source_observation_ids, policy_rule_ids, warnings, scenario_snapshot_id}`. Result inspector must display dependency graph and math in human-readable terms.
