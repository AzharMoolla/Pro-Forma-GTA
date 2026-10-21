// C3: compute in float64, round every posted ledger amount to cents (half-even).

const TIE_EPSILON = 1e-7

export function roundCents(amount: number): number {
  const cents = amount * 100
  const floor = Math.floor(cents)
  const fraction = cents - floor
  let rounded: number
  if (fraction > 0.5 + TIE_EPSILON) rounded = floor + 1
  else if (fraction < 0.5 - TIE_EPSILON) rounded = floor
  else rounded = floor % 2 === 0 ? floor : floor + 1
  return rounded / 100 + 0 // + 0 turns -0 into 0
}

export function sumCents(amounts: number[]): number {
  return roundCents(amounts.reduce((total, amount) => total + amount, 0))
}
