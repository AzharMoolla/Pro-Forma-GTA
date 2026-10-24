// New income streams for the Revenue page. Counts, rents and prices start at zero (nothing is earned until entered);
// the few rates the engine needs to run (cap rate, pace, deposits, vacancy) start at stated, editable placeholders.

import type { Component } from '../engine/project'

export type StreamKind = 'rental' | 'condo' | 'retail' | 'office' | 'industrial'

export function NEW_STREAM(kind: StreamKind, id: string): Component {
  if (kind === 'rental') return { kind: 'rental', id, unitMix: [NEW_UNIT('rental', 'unit-1') as RentalUnit], otherIncomeMonthly: 0, opexPerUnitMonthly: 0, leaseUpMonths: 12, rentGrowth: 0, opexInflation: 0, exitCapRate: 0.045 }
  if (kind === 'condo') return { kind: 'condo', id, units: [NEW_UNIT('condo', 'unit-1') as CondoUnit], salesStartMonth: 0, salesPerMonth: 5, depositFraction: 0.2, depositsUsable: false, occupancyMonths: 6, occupancyFeePerUnitMonthly: 0, commissionFraction: 0.04, unsoldAtExit: { bulkSaleDiscount: 0.1 } }
  return { kind: 'commercial', id, use: kind, netLeasableSqft: 0, rentPerSqftYear: 0, rentGrowth: 0, vacancy: 0.05, leaseUpMonths: 6, freeRentMonths: 0, tiPerSqft: 0, leasingCommissionPerSqft: 0, unrecoveredOpexPerSqftYear: 0, exitCapRate: 0.06 }
}

export const STREAM_LABEL: Record<StreamKind, string> = { rental: 'Rental homes', condo: 'Condo homes for sale', retail: 'Retail space', office: 'Office space', industrial: 'Industrial space' }

/** An id not already used by another stream (rental, rental-2, …). */
export const uniqueStreamId = (base: string, taken: string[]) => { let id = base; for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`; return id }

type RentalUnit = Extract<Component, { kind: 'rental' }>['unitMix'][number]
type CondoUnit = Extract<Component, { kind: 'condo' }>['units'][number]

/** A unit type row: everything zero until entered, except a stated vacancy placeholder for rentals. */
export const NEW_UNIT = (kind: 'rental' | 'condo', id: string): RentalUnit | CondoUnit =>
  kind === 'rental' ? { id, count: 0, netSqftPerUnit: 0, monthlyRent: 0, vacancy: 0.03 } : { id, count: 0, netSqftPerUnit: 0, pricePerSqft: 0 }
