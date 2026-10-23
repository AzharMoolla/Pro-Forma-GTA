// Policy citations: which section of which law or policy each policy pill and site finding rests on, with a short,
// exact quote and a link to the official text. Every entry was checked against the official source on the date it
// carries (data/policy/citations.json); one that could not be checked first-hand says so (`secondary`).
// A wrong section number is worse than none, so a pill or finding with no verified citation shows none.

import library from '../../data/policy/citations.json'

export interface Citation {
  id: string
  kind: 'statute' | 'policy' | 'guideline'
  jurisdiction: string
  instrument: string
  section: string
  topic: string
  quote: string
  url: string
  currency: string
  verified: string
  secondary?: string
}

export const CITATIONS = library.citations as Citation[]
export const CITATION_NOTICE = library.notice
const byId = new Map(CITATIONS.map((c) => [c.id, c]))

/** Policy pills (streetscape cues), by cue id; heritage cues carry the building id after "heritage-". */
const CUE_CITES: Record<string, string[]> = {
  heritage: ['oha-33-1', 'oha-34-1'],
  rail: ['fcm-rac-2013'],
  mtsa: ['pa-16-15', 'pps-2-4-2-2'],
  regulated: ['caa-28-1', 'caa-28-1-1'],
  floodplain: ['pps-5-2-2', 'caa-28-1'],
  greenbelt: ['ga-7-1'],
  holding: ['pa-36-1'],
  fsi: ['pa-34-1-4', 'pa-45-1'],
  iz: ['pa-16-4', 'pa-35-2-1'],
  highway: ['pthia-34-2', 'pthia-38-2'],
  archaeology: ['oha-48-1'],
}

/** Site findings (Decision summary, report), by insight id. */
const INSIGHT_CITES: Record<string, string[]> = {
  'height-over': ['pa-34-1-4', 'pa-45-1'],
  'height-rezoning-assumed': ['pa-34-1-4'],
  'fsi-over': ['pa-34-1-4', 'pa-45-1'],
  holding: ['pa-36-1'],
  heritage: ['oha-33-1', 'oha-34-1'],
  regulated: ['caa-28-1', 'caa-28-1-1'],
  greenbelt: ['ga-7-1'],
  iz: ['pa-16-4', 'pa-35-2-1'],
  'airport-over': ['aa-5-4-2'],
  'airport-check': ['aa-5-4-2'],
}

const resolve = (ids: string[] | undefined) => (ids ?? []).map((id) => byId.get(id)).filter((c): c is Citation => c !== undefined)

export const citationsForCue = (cueId: string) => resolve(CUE_CITES[cueId.startsWith('heritage-') ? 'heritage' : cueId])
export const citationsForInsight = (insightId: string) => resolve(INSIGHT_CITES[insightId])

/** "Planning Act, R.S.O. 1990, c. P.13, s. 36 (1)" */
export const cite = (c: Citation) => `${c.instrument}, ${c.section}`

/** Plain text for a tooltip: the section, then the quote. */
export const citeText = (c: Citation) => `${cite(c)}${c.kind === 'guideline' ? ' (guidance, not law)' : c.kind === 'policy' ? ' (provincial policy)' : ''}: “${c.quote}”${c.secondary ? ` ${c.secondary}` : ''}`

/** Every mapping points at a citation that exists (checked by the tests). */
export const mappedIds = () => [...Object.values(CUE_CITES), ...Object.values(INSIGHT_CITES)].flat()
