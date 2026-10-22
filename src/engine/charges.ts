// City of Toronto development charges, from the City's published schedule (per unit, and per m² of ground-floor
// non-residential GFA), and the 2026 DC Reduction Program. Pure data and arithmetic; the verification cases check the
// project cost lines against it.

export const TORONTO_DC = {
  effective: '2025-06-26', // indexing skipped in 2025 and 2026, so still current at 2026-10-22
  source: 'City of Toronto, Development Charge Rates – Effective June 26, 2025 (By-law 1137-2022, as amended by 594-2025 and 845-2025)',
  url: 'https://www.toronto.ca/wp-content/uploads/2025/08/9709-DC-Rates-June-26-2025.pdf',
  /** Purpose-built rental apartments, per unit. */
  rental: { oneBedOrBachelor: 33_497, twoBed: 48_299, threeBedPlus: 45_280, dwellingRoom: 23_759 },
  /** Non-rental apartments, per unit. */
  nonRental: { oneBedOrBachelor: 52_676, twoBedPlus: 80_690, dwellingRoom: 37_356 },
  /** Per m² of non-residential GFA on the ground floor only. */
  nonResidentialPerM2: 805.64,
} as const

/** DC Reduction Program (Council 2026.CC43.9): conditional on the Transfer Payment Agreement with Ontario. */
export const TORONTO_DCRP = { oneBedOrLess: 0.4, twoBedPlus: 0.6, status: 'adopted by Council, conditional on the Ontario Transfer Payment Agreement' } as const

export interface ApartmentCounts { oneBedOrBachelor: number; twoBed: number; threeBedPlus: number }

/** Rental apartment DCs: the gross schedule amount and the DCRP discount (a negative number). Affordable units are exempt: leave them out. */
export function torontoRentalDc(n: ApartmentCounts): { gross: number; dcrpDiscount: number } {
  const r = TORONTO_DC.rental
  const small = n.oneBedOrBachelor * r.oneBedOrBachelor
  const large = (n.twoBed * r.twoBed) + (n.threeBedPlus * r.threeBedPlus)
  return { gross: small + large, dcrpDiscount: -((small * TORONTO_DCRP.oneBedOrLess) + (large * TORONTO_DCRP.twoBedPlus)) }
}
