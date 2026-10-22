// Funding gap: can the project fund construction inside the loan the lender would commit, and does the refinance or
// exit repay the loans? Reads the ledger the engine already produced; no second calculation path. Pure.

import { roundCents, sumCents } from './money'
import type { ProjectInput, ProjectResult } from './project'

export interface FundingMonth { month: number; debt: number; limit: number; permanent: number; equityNet: number; equityGross: number }

export interface Funding {
  /** LTC × (costs to completion + capitalized interest): the commitment a lender sizes on the full budget. */
  facilityLimit: number
  peakDebt: number
  peakDebtMonth: number
  /** Loan needed above the commitment: it must come from more equity, mezzanine or a larger facility. */
  constructionGap: number
  refinance: { month: number; constructionBalance: number; netProceeds: number; gap: number } | null
  /** Sale proceeds short of the loans at exit, which the investors must fund. */
  exitGap: number
  /** Most the investors are out of pocket at once (contributions less distributions so far). */
  peakEquity: number
  peakEquityMonth: number
  months: FundingMonth[]
}

export function funding(p: ProjectInput, r: ProjectResult): Funding {
  const completion = p.timing.preConstructionMonths + p.timing.constructionMonths
  const toCompletion = r.ledger.filter((row) => row.month <= completion)
  const facilityLimit = roundCents(p.debt.ltc * sumCents(toCompletion.map((row) => row.totalCost + row.interestCapitalized)))

  let equityNet = 0
  let equityGross = 0
  const months = r.ledger.map((row) => {
    equityNet = roundCents(equityNet - row.equityCashFlow)
    equityGross = roundCents(equityGross + row.equityDraw)
    // Before repayment in the month, so a refinance or exit payoff still shows the balance it retired
    const debt = roundCents(row.openingDebt + row.debtDraw + row.interestCapitalized)
    return { month: row.month, debt, limit: row.month <= completion ? facilityLimit : 0, permanent: row.permClosing, equityNet, equityGross }
  })
  const peak = months.reduce((a, b) => (b.debt > a.debt ? b : a), months[0]!)
  const peakEq = months.reduce((a, b) => (b.equityNet > a.equityNet ? b : a), months[0]!)

  const refi = p.debt.refinance
  const refiRow = refi ? r.ledger[refi.month] : undefined
  const refinance = refi && refiRow ? (() => {
    const constructionBalance = refiRow.openingDebt
    const netProceeds = roundCents(refiRow.permFunded - refiRow.refinanceFee)
    return { month: refi.month, constructionBalance, netProceeds, gap: Math.max(0, roundCents(constructionBalance - netProceeds)) }
  })() : null

  const last = r.ledger.at(-1)!
  const exitNet = roundCents(last.equityCashFlow + last.equityDraw - last.distribution)

  return {
    facilityLimit,
    peakDebt: peak.debt,
    peakDebtMonth: peak.month,
    constructionGap: Math.max(0, roundCents(peak.debt - facilityLimit)),
    refinance,
    exitGap: Math.max(0, -exitNet),
    peakEquity: peakEq.equityNet,
    peakEquityMonth: peakEq.month,
    months,
  }
}
