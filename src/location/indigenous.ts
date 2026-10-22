// Indigenous context for a site: the historic treaty area it falls in (Indigenous Services Canada's Historic Treaties),
// the Nations that are party to that treaty, and who to contact. Treaty boundaries are approximate and do not define
// rights or consultation obligations; this points people to the Nations and offices that speak to them. Pure data.

export interface Contact { name: string; url: string; why: string }
export interface TreatyContext { treaty: string; summary: string; nations: Contact[] }
export interface IndigenousContext { treaties: TreatyContext[]; acknowledgement: string | null; notes: string[]; contacts: Contact[] }

const WILLIAMS: TreatyContext = {
  treaty: 'Williams Treaties (1923)',
  summary: 'Signed in 1923 with seven First Nations; in 2018 Canada and Ontario reached a settlement recognizing the Nations\' harvesting rights in the treaty area.',
  nations: [
    { name: 'Williams Treaties First Nations (joint site for the seven Nations)', url: 'https://williamstreatiesfirstnations.ca', why: 'Alderville, Curve Lake, Hiawatha, Mississaugas of Scugog Island, Chippewas of Beausoleil, Chippewas of Georgina Island and Chippewas of Rama' },
    { name: 'Mississaugas of Scugog Island First Nation', url: 'https://scugogfirstnation.com', why: 'Closest Williams Treaties Nation to much of Durham Region' },
    { name: 'Alderville First Nation', url: 'https://aldervillefirstnation.ca', why: 'Williams Treaties Nation' },
    { name: 'Curve Lake First Nation', url: 'https://curvelakefirstnation.ca', why: 'Williams Treaties Nation' },
    { name: 'Hiawatha First Nation', url: 'https://www.hiawathafirstnation.com', why: 'Williams Treaties Nation' },
    { name: 'Chippewas of Georgina Island First Nation', url: 'https://www.georginaisland.com', why: 'Williams Treaties Nation' },
    { name: 'Chippewas of Rama First Nation', url: 'https://www.ramafirstnation.ca', why: 'Williams Treaties Nation' },
  ],
}

const SOUTHERN_ONTARIO: TreatyContext = {
  treaty: 'Southern Ontario Treaties (1764-1862)',
  summary: 'The Upper Canada land surrenders. In Toronto this includes Treaty 13 (the Toronto Purchase, 1805), made with the Mississaugas of the Credit, whose 2010 specific claim over the Toronto Purchase was settled with Canada.',
  nations: [
    { name: 'Mississaugas of the Credit First Nation', url: 'https://mncfn.ca', why: 'Treaty 13 (Toronto Purchase) and other treaties across the GTA; has a department for consultation and accommodation' },
  ],
}

const BY_NAME: Record<string, TreatyContext> = { [WILLIAMS.treaty]: WILLIAMS, [SOUTHERN_ONTARIO.treaty]: SOUTHERN_ONTARIO }

/** `treaty` is the site.treaty value (one or more treaty names, comma-separated); `municipality` the site.municipality value. */
export function indigenousContext(treaty: string | null | undefined, municipality: string | null | undefined): IndigenousContext {
  const treaties = (treaty ?? '').split(/,\s*(?=[A-Z])/).map((t) => t.trim()).filter(Boolean)
    .map((t) => BY_NAME[t] ?? { treaty: t, summary: 'A historic treaty area recorded by Indigenous Services Canada.', nations: [] })
  const toronto = municipality === 'toronto'
  return {
    treaties,
    acknowledgement: toronto
      ? 'The City of Toronto acknowledges that the land is the traditional territory of many nations including the Mississaugas of the Credit, the Anishnabeg, the Chippewa, the Haudenosaunee and the Wendat peoples, and is home to many diverse First Nations, Inuit and Métis peoples; and that Toronto is covered by Treaty 13 with the Mississaugas of the Credit.'
      : null,
    notes: [
      'Treaty areas are approximate and come from federal open data. They are not a statement of rights, title or who must be consulted.',
      'The duty to consult rests with the Crown (Canada and Ontario), but municipalities and developers are often part of engagement. Ontario\'s archaeology standards require engaging Indigenous communities during Stage 3 and Stage 4 archaeological assessments.',
      'The Huron-Wendat Nation has an ancestral presence across the GTA and an interest in archaeological sites; the Haudenosaunee share the region under the Dish With One Spoon wampum.',
    ],
    contacts: [
      ...(toronto ? [{ name: 'City of Toronto Indigenous Affairs Office', url: 'https://www.toronto.ca/city-government/accessibility-human-rights/indigenous-affairs-office/', why: 'The City\'s relationships with Indigenous communities and organizations' }] : []),
      { name: 'Huron-Wendat Nation', url: 'https://wendake.ca', why: 'Ancestral presence across the GTA; archaeology' },
      { name: 'Ontario Ministry of Indigenous Affairs and First Nations Economic Reconciliation', url: 'https://www.ontario.ca/page/ministry-indigenous-affairs-and-first-nations-economic-reconciliation', why: 'Provincial relationships, treaties and consultation guidance' },
      { name: 'Crown-Indigenous Relations and Northern Affairs Canada', url: 'https://www.rcaanc-cirnac.gc.ca/eng/1100100028574/1529354437231', why: 'Federal treaties and agreements' },
    ],
  }
}
