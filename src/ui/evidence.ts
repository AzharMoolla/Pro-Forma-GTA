// Market evidence: the figures behind the market assumptions, each with its source, link, period and the date it was
// read. Users type the figures in; nothing is copied from the source (TRREB's reports are "all rights reserved"), so
// the project carries a citation, not the publisher's data.

import type { Attributes } from '../engine/catalogue'

export const EVIDENCE_KEY = 'market.evidence'

export interface Evidence {
  id: string
  source: string
  url: string
  /** What the figure is, e.g. "Average 1-bedroom condo lease, Toronto C01" */
  figure: string
  value: string
  /** The period the figure describes, e.g. "2026 Q3" or "September 2026" */
  period: string
  /** YYYY-MM-DD the user read it */
  retrievedAt: string
}

export interface EvidenceSource { id: string; label: string; url: string; covers: string }

export const EVIDENCE_SOURCES: EvidenceSource[] = [
  { id: 'trreb-rental', label: 'TRREB Rental Report', url: 'https://trreb.ca/market-data/', covers: 'Quarterly lease rates and volumes by unit type and area (condo apartments and townhouses leased through MLS). Use for rents.' },
  { id: 'trreb-condo', label: 'TRREB Condo Market Report', url: 'https://trreb.ca/market-data/', covers: 'Quarterly resale condo sales, prices and rents by area. Resale, not new: a check on new-condo pricing, not a substitute.' },
  { id: 'trreb-watch', label: 'TRREB Market Watch', url: 'https://trreb.ca/market-data/', covers: 'Monthly resale sales, new listings and average prices by area and home type (seasonally adjusted figures available).' },
  { id: 'trreb-hpi', label: 'TRREB MLS Home Price Index', url: 'https://trreb.ca/market-data/', covers: 'Benchmark resale prices by area and type, adjusted for the mix of homes sold.' },
  { id: 'trreb-outlook', label: 'TRREB Market Outlook', url: 'https://market-outlook.trreb.ca', covers: 'Annual forecast (sales, average price) and buyer survey for the year ahead.' },
  { id: 'cmhc-rms', label: 'CMHC Rental Market Survey', url: 'https://www03.cmhc-schl.gc.ca/hmip-pimh/', covers: 'Annual purpose-built rents and vacancy by bedroom type and zone (free).' },
]

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function evidenceOf(attributes: Attributes): Evidence[] {
  try {
    const v = JSON.parse(String(attributes[EVIDENCE_KEY] ?? '[]')) as unknown
    return Array.isArray(v) ? v.filter((e): e is Evidence => typeof e === 'object' && e !== null && typeof (e as Evidence).id === 'string') : []
  } catch {
    return []
  }
}

/** Problems with an entry before it is saved; empty when it can be saved. */
export function evidenceProblems(e: Omit<Evidence, 'id'>): string[] {
  const out: string[] = []
  if (!e.source.trim()) out.push('Name the source')
  if (!/^https:\/\/[^\s]+$/.test(e.url.trim())) out.push('Link to the source (https://…)')
  if (!e.figure.trim()) out.push('Say what the figure is')
  if (!e.value.trim()) out.push('Enter the value')
  if (!e.period.trim()) out.push('Say which period it describes')
  if (!ISO_DATE.test(e.retrievedAt)) out.push('Date read must be YYYY-MM-DD')
  return out
}
