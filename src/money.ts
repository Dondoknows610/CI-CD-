/** Shared money helpers used across Orbit investment modules */

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatMoney(n: number, compact = false): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (compact && abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  }
  return (
    sign +
    abs.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    })
  )
}

export function formatPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}

export function mortgagePayment(
  principal: number,
  annualRatePercent: number,
  termYears: number,
): number {
  if (principal <= 0) return 0
  const monthlyRate = annualRatePercent / 100 / 12
  const n = termYears * 12
  if (monthlyRate === 0) return principal / n
  const factor = Math.pow(1 + monthlyRate, n)
  return (principal * monthlyRate * factor) / (factor - 1)
}

export function remainingBalance(
  loanAmount: number,
  annualRatePercent: number,
  termYears: number,
  monthsElapsed: number,
): number {
  if (loanAmount <= 0) return 0
  const payment = mortgagePayment(loanAmount, annualRatePercent, termYears)
  const monthlyRate = annualRatePercent / 100 / 12
  let balance = loanAmount
  const limit = Math.min(Math.max(0, monthsElapsed), termYears * 12)
  for (let i = 0; i < limit; i += 1) {
    const interest = balance * monthlyRate
    const principal = Math.min(payment - interest, balance)
    balance = Math.max(0, balance - principal)
  }
  return round2(balance)
}

export function principalPaidOverMonths(
  loanAmount: number,
  annualRatePercent: number,
  termYears: number,
  months: number,
): number {
  if (loanAmount <= 0 || months <= 0) return 0
  return round2(loanAmount - remainingBalance(loanAmount, annualRatePercent, termYears, months))
}

export function futureValue(
  present: number,
  annualAppreciationPercent: number,
  months: number,
): number {
  return round2(present * Math.pow(1 + annualAppreciationPercent / 100, months / 12))
}
