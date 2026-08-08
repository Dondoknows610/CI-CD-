import {
  formatMoney,
  futureValue,
  mortgagePayment,
  principalPaidOverMonths,
  remainingBalance,
  round2,
} from './money'
import { activeRent, type PropertyProfile, type RentAssumption } from './property'

export type LoanInputs = {
  downPaymentPercent: number
  interestRatePercent: number
  loanTermYears: number
  closingCostPercent: number
  sellerCredits: number
  /** Configurable owner-occupancy months before exit decision */
  occupancyMonths: number
}

export type OperatingInputs = {
  propertyTaxAnnualRate: number
  homeInsuranceMonthly: number
  maintenanceMonthly: number
  vacancyPercent: number
  managementPercent: number
  utilitiesMonthly: number
  otherMonthly: number
  appreciationAnnualPercent: number
  sellingCostPercent: number
}

export type RefinanceInputs = {
  newRatePercent: number
  newTermYears: number
  closingCostPercent: number
  cashOutAmount: number
  /** Override value at refinance; null = model value at decision */
  valueOverride: number | null
}

export type HoldHorizonYears = 1 | 3 | 5 | 10

export type CashFlowBreakdown = {
  monthlyRent: number
  grossAnnualRent: number
  mortgagePi: number
  propertyTaxMonthly: number
  insuranceMonthly: number
  hoaMonthly: number
  maintenanceMonthly: number
  vacancyMonthly: number
  managementMonthly: number
  utilitiesMonthly: number
  otherMonthly: number
  totalMonthlyExpenses: number
  totalAnnualExpenses: number
  monthlyCashFlow: number
  annualCashFlow: number
  status: 'positive' | 'breakeven' | 'negative'
}

export type ExitStrategyId = 'rent_hold' | 'sell' | 'refinance' | 'keep_loan'

export type HoldProjection = {
  years: HoldHorizonYears
  endingValue: number
  endingLoanBalance: number
  equity: number
  totalCashFlow: number
  totalReturn: number
}

export type SellResult = {
  propertyValue: number
  loanBalance: number
  equity: number
  sellingCosts: number
  netProceeds: number
  profitVsPurchase: number
}

export type RefinanceResult = {
  propertyValue: number
  currentBalance: number
  maxLoan80: number
  cashOut: number
  newLoanBalance: number
  closingCosts: number
  netCashFromRefi: number
  oldPayment: number
  newPayment: number
  paymentDelta: number
  monthlyCashFlowAfter: number
  annualCashFlowAfter: number
  breakEvenMonths: number | null
}

export type StrategyScore = {
  id: ExitStrategyId
  label: string
  monthlyCashFlow: number | null
  immediateCash: number
  longTermScore: number
  longTermLabel: 'High' | 'Medium' | 'Low' | 'N/A'
  fiveYearWealth: number
  summary: string
}

export type Recommendation = {
  strategyId: ExitStrategyId
  title: string
  rationale: string
}

export type InvestmentAnalysis = {
  purchasePrice: number
  loanAmount: number
  cashToClose: number
  monthlyPi: number
  valueAtDecision: number
  loanAtDecision: number
  equityAtDecision: number
  principalPaidDuringOccupancy: number
  rentUsed: number
  rentIsOverride: boolean
  cashFlow: CashFlowBreakdown
  holdProjections: HoldProjection[]
  sell: SellResult
  refinance: RefinanceResult
  keepLoanCashFlow: CashFlowBreakdown
  strategies: StrategyScore[]
  recommendation: Recommendation
  timeline: { label: string; month: number }[]
}

export const DEFAULT_LOAN: LoanInputs = {
  downPaymentPercent: 0,
  interestRatePercent: 6.25,
  loanTermYears: 30,
  closingCostPercent: 2.5,
  sellerCredits: 16250,
  occupancyMonths: 12,
}

export const DEFAULT_OPERATING: OperatingInputs = {
  propertyTaxAnnualRate: 1.15,
  homeInsuranceMonthly: 180,
  maintenanceMonthly: 200,
  vacancyPercent: 5,
  managementPercent: 8,
  utilitiesMonthly: 0,
  otherMonthly: 0,
  appreciationAnnualPercent: 3,
  sellingCostPercent: 6,
}

export const DEFAULT_REFINANCE: RefinanceInputs = {
  newRatePercent: 5.5,
  newTermYears: 30,
  closingCostPercent: 2,
  cashOutAmount: 0,
  valueOverride: null,
}

export function loanAmount(price: number, downPct: number): number {
  return round2(Math.max(0, price * (1 - downPct / 100)))
}

export function cashToCloseAmount(price: number, loan: LoanInputs): number {
  const down = price * (loan.downPaymentPercent / 100)
  const closing = price * (loan.closingCostPercent / 100)
  return round2(Math.max(0, down + closing - loan.sellerCredits))
}

export function computeCashFlow(
  property: PropertyProfile,
  rentMonthly: number,
  _loan: LoanInputs,
  ops: OperatingInputs,
  loanPrincipal: number,
  ratePercent: number,
  termYears: number,
): CashFlowBreakdown {
  const pi = mortgagePayment(loanPrincipal, ratePercent, termYears)
  const tax = (property.purchasePrice * (ops.propertyTaxAnnualRate / 100)) / 12
  const vacancy = rentMonthly * (ops.vacancyPercent / 100)
  const management = rentMonthly * (ops.managementPercent / 100)
  const expenses =
    pi +
    tax +
    ops.homeInsuranceMonthly +
    property.hoaMonthly +
    ops.maintenanceMonthly +
    vacancy +
    management +
    ops.utilitiesMonthly +
    ops.otherMonthly

  const monthlyCf = rentMonthly - expenses
  const status: CashFlowBreakdown['status'] =
    monthlyCf > 25 ? 'positive' : monthlyCf < -25 ? 'negative' : 'breakeven'

  return {
    monthlyRent: round2(rentMonthly),
    grossAnnualRent: round2(rentMonthly * 12),
    mortgagePi: round2(pi),
    propertyTaxMonthly: round2(tax),
    insuranceMonthly: round2(ops.homeInsuranceMonthly),
    hoaMonthly: round2(property.hoaMonthly),
    maintenanceMonthly: round2(ops.maintenanceMonthly),
    vacancyMonthly: round2(vacancy),
    managementMonthly: round2(management),
    utilitiesMonthly: round2(ops.utilitiesMonthly),
    otherMonthly: round2(ops.otherMonthly),
    totalMonthlyExpenses: round2(expenses),
    totalAnnualExpenses: round2(expenses * 12),
    monthlyCashFlow: round2(monthlyCf),
    annualCashFlow: round2(monthlyCf * 12),
    status,
  }
}

function longTermLabel(score: number): StrategyScore['longTermLabel'] {
  if (score >= 70) return 'High'
  if (score >= 40) return 'Medium'
  if (score > 0) return 'Low'
  return 'N/A'
}

export function analyzeInvestment(
  property: PropertyProfile,
  rent: RentAssumption,
  loan: LoanInputs,
  ops: OperatingInputs,
  refi: RefinanceInputs,
): InvestmentAnalysis {
  const price = property.purchasePrice
  const principal = loanAmount(price, loan.downPaymentPercent)
  const closeCash = cashToCloseAmount(price, loan)
  const pi = mortgagePayment(principal, loan.interestRatePercent, loan.loanTermYears)
  const occ = Math.max(0, loan.occupancyMonths)
  const rentUsed = activeRent(rent)
  const rentIsOverride = rent.manualRent !== null

  const valueAtDecision = futureValue(price, ops.appreciationAnnualPercent, occ)
  const loanAtDecision = remainingBalance(
    principal,
    loan.interestRatePercent,
    loan.loanTermYears,
    occ,
  )
  const principalPaid = principalPaidOverMonths(
    principal,
    loan.interestRatePercent,
    loan.loanTermYears,
    occ,
  )
  const equityAtDecision = round2(valueAtDecision - loanAtDecision)

  const cashFlow = computeCashFlow(
    property,
    rentUsed,
    loan,
    ops,
    principal,
    loan.interestRatePercent,
    loan.loanTermYears,
  )

  const holdProjections: HoldProjection[] = ([1, 3, 5, 10] as HoldHorizonYears[]).map((years) => {
    const months = occ + years * 12
    const endingValue = futureValue(price, ops.appreciationAnnualPercent, months)
    const endingLoan = remainingBalance(
      principal,
      loan.interestRatePercent,
      loan.loanTermYears,
      months,
    )
    const equity = round2(endingValue - endingLoan)
    const totalCashFlow = round2(cashFlow.monthlyCashFlow * years * 12)
    const totalReturn = round2(equity + totalCashFlow - closeCash)
    return {
      years,
      endingValue,
      endingLoanBalance: endingLoan,
      equity,
      totalCashFlow,
      totalReturn,
    }
  })

  const sellingCosts = round2(valueAtDecision * (ops.sellingCostPercent / 100))
  const netProceeds = round2(valueAtDecision - loanAtDecision - sellingCosts)
  const sell: SellResult = {
    propertyValue: valueAtDecision,
    loanBalance: loanAtDecision,
    equity: equityAtDecision,
    sellingCosts,
    netProceeds,
    profitVsPurchase: round2(netProceeds - closeCash),
  }

  const refiValue = refi.valueOverride ?? valueAtDecision
  const maxLoan80 = round2(refiValue * 0.8)
  const desiredCashOut = Math.max(0, refi.cashOutAmount)
  const closingCostsRefi = round2(refiValue * (refi.closingCostPercent / 100))
  // New loan must cover old balance + cash-out + (optionally) closing; capped at 80% LTV
  const uncappedNewLoan = loanAtDecision + desiredCashOut + closingCostsRefi
  const newLoanBalance = round2(Math.min(maxLoan80, uncappedNewLoan))
  const cashOut = round2(Math.max(0, newLoanBalance - loanAtDecision - closingCostsRefi))
  const netCashFromRefi = cashOut
  const newPayment = mortgagePayment(newLoanBalance, refi.newRatePercent, refi.newTermYears)
  const paymentDelta = round2(newPayment - pi)
  const cashFlowAfter = computeCashFlow(
    property,
    rentUsed,
    loan,
    ops,
    newLoanBalance,
    refi.newRatePercent,
    refi.newTermYears,
  )
  const monthlySavings = round2(cashFlowAfter.monthlyCashFlow - cashFlow.monthlyCashFlow)
  const breakEvenMonths =
    closingCostsRefi > 0 && monthlySavings > 0
      ? Math.ceil(closingCostsRefi / monthlySavings)
      : closingCostsRefi > 0 && monthlySavings <= 0
        ? null
        : 0

  const refinance: RefinanceResult = {
    propertyValue: refiValue,
    currentBalance: loanAtDecision,
    maxLoan80,
    cashOut,
    newLoanBalance,
    closingCosts: closingCostsRefi,
    netCashFromRefi,
    oldPayment: round2(pi),
    newPayment: round2(newPayment),
    paymentDelta,
    monthlyCashFlowAfter: cashFlowAfter.monthlyCashFlow,
    annualCashFlowAfter: cashFlowAfter.annualCashFlow,
    breakEvenMonths,
  }

  const fiveYearHold = holdProjections.find((p) => p.years === 5)!
  // Wealth if sell at decision and invest proceeds poorly approximated as cash only
  const sellFiveYearWealth = netProceeds
  // Refi: cash out + continue rental CF for 5y + equity at year 5 under new loan
  const monthsAfterRefi = 5 * 12
  const valueFiveAfterDecision = futureValue(
    price,
    ops.appreciationAnnualPercent,
    occ + monthsAfterRefi,
  )
  const refiBalanceIn5 = remainingBalance(
    newLoanBalance,
    refi.newRatePercent,
    refi.newTermYears,
    monthsAfterRefi,
  )
  const refiFiveWealth = round2(
    netCashFromRefi +
      cashFlowAfter.monthlyCashFlow * monthsAfterRefi +
      (valueFiveAfterDecision - refiBalanceIn5),
  )
  const keepFiveWealth = fiveYearHold.totalReturn

  const strategies: StrategyScore[] = [
    {
      id: 'rent_hold',
      label: 'Rent & hold',
      monthlyCashFlow: cashFlow.monthlyCashFlow,
      immediateCash: 0,
      longTermScore: Math.max(0, Math.min(100, 40 + fiveYearHold.totalReturn / 5000)),
      longTermLabel: 'High',
      fiveYearWealth: keepFiveWealth,
      summary: `${formatMoney(cashFlow.monthlyCashFlow)}/mo CF · 5yr wealth ${formatMoney(keepFiveWealth, true)}`,
    },
    {
      id: 'sell',
      label: 'Sell',
      monthlyCashFlow: null,
      immediateCash: netProceeds,
      longTermScore: 0,
      longTermLabel: 'N/A',
      fiveYearWealth: sellFiveYearWealth,
      summary: `Walk-away ${formatMoney(netProceeds)} after costs`,
    },
    {
      id: 'refinance',
      label: 'Refinance',
      monthlyCashFlow: cashFlowAfter.monthlyCashFlow,
      immediateCash: netCashFromRefi,
      longTermScore: Math.max(0, Math.min(100, 35 + refiFiveWealth / 5000)),
      longTermLabel: longTermLabel(Math.max(0, Math.min(100, 35 + refiFiveWealth / 5000))),
      fiveYearWealth: refiFiveWealth,
      summary: `${formatMoney(netCashFromRefi)} cash-out · CF ${formatMoney(cashFlowAfter.monthlyCashFlow)}/mo`,
    },
    {
      id: 'keep_loan',
      label: 'Keep existing loan',
      monthlyCashFlow: cashFlow.monthlyCashFlow,
      immediateCash: 0,
      longTermScore: Math.max(0, Math.min(100, 42 + keepFiveWealth / 5000)),
      longTermLabel: longTermLabel(Math.max(0, Math.min(100, 42 + keepFiveWealth / 5000))),
      fiveYearWealth: keepFiveWealth,
      summary: `Keep ${loan.interestRatePercent}% VA loan · CF ${formatMoney(cashFlow.monthlyCashFlow)}/mo`,
    },
  ]

  // Rank by 5-year wealth, but prefer keep_loan over rent_hold when tied (same economics, clearer)
  // Sell competes on immediate liquidity vs long-term wealth
  const ranked = [...strategies].sort((a, b) => b.fiveYearWealth - a.fiveYearWealth)
  // If refinance payment worsens CF a lot and cash-out is 0, demote
  const best = ranked[0]
  let recommendation: Recommendation

  if (best.id === 'sell' && keepFiveWealth > netProceeds * 1.15) {
    const alt = ranked.find((s) => s.id === 'keep_loan' || s.id === 'rent_hold')!
    recommendation = {
      strategyId: alt.id,
      title: alt.id === 'keep_loan' ? 'Keep existing loan & rent' : 'Rent and hold',
      rationale: `Selling frees ${formatMoney(netProceeds)} now, but holding as a rental under the current ${loan.interestRatePercent}% loan projects about ${formatMoney(keepFiveWealth)} in 5-year wealth (cash flow + equity), which outpaces selling under your appreciation and rent assumptions.`,
    }
  } else if (
    best.id === 'refinance' &&
    (refinance.monthlyCashFlowAfter < cashFlow.monthlyCashFlow - 50 || refinance.netCashFromRefi <= 0)
  ) {
    recommendation = {
      strategyId: 'keep_loan',
      title: 'Keep existing loan',
      rationale: `Refinancing to ${refi.newRatePercent}% ${refinance.netCashFromRefi > 0 ? `pulls ${formatMoney(refinance.netCashFromRefi)} cash` : 'does not improve cash'} but ${refinance.paymentDelta >= 0 ? 'raises' : 'only modestly changes'} the payment. Keeping the existing VA loan preserves ${formatMoney(cashFlow.monthlyCashFlow)}/mo cash flow and ${formatMoney(keepFiveWealth)} projected 5-year wealth.`,
    }
  } else if (best.id === 'sell') {
    recommendation = {
      strategyId: 'sell',
      title: 'Sell at decision point',
      rationale: `Under current assumptions, selling at month ${occ} unlocks about ${formatMoney(netProceeds)} after loan payoff and selling costs. That immediate liquidity exceeds the modeled 5-year hold wealth of ${formatMoney(keepFiveWealth)}.`,
    }
  } else if (best.id === 'refinance') {
    recommendation = {
      strategyId: 'refinance',
      title: 'Refinance (and rent)',
      rationale: `A refinance at ${refi.newRatePercent}% ${refinance.netCashFromRefi > 0 ? `with ${formatMoney(refinance.netCashFromRefi)} cash-out ` : ''}projects the strongest combined liquidity and 5-year position (${formatMoney(refiFiveWealth)}), with post-refi cash flow of ${formatMoney(refinance.monthlyCashFlowAfter)}/mo.`,
    }
  } else {
    recommendation = {
      strategyId: best.id,
      title: best.id === 'keep_loan' ? 'Keep existing loan & rent' : 'Rent and hold',
      rationale: `Based on ${formatMoney(rentUsed)}/mo rent, the ${loan.interestRatePercent}% loan, ${ops.appreciationAnnualPercent}% appreciation, and equity of ${formatMoney(equityAtDecision)} at the decision point, continuing to hold as a rental produces the strongest projected long-term return (~${formatMoney(keepFiveWealth)} over 5 years after occupancy).`,
    }
  }

  // Refine long-term labels from relative wealth
  const maxWealth = Math.max(...strategies.map((s) => s.fiveYearWealth), 1)
  for (const s of strategies) {
    if (s.id === 'sell') {
      s.longTermLabel = 'N/A'
      s.longTermScore = 0
    } else {
      const pct = (s.fiveYearWealth / maxWealth) * 100
      s.longTermLabel = longTermLabel(pct)
      s.longTermScore = pct
    }
  }

  const timeline = [
    { label: 'Purchase', month: 0 },
    { label: 'Initial occupancy', month: 0 },
    { label: `${occ}-month decision`, month: occ },
    { label: 'Exit strategy', month: occ },
  ]

  return {
    purchasePrice: price,
    loanAmount: principal,
    cashToClose: closeCash,
    monthlyPi: round2(pi),
    valueAtDecision,
    loanAtDecision,
    equityAtDecision,
    principalPaidDuringOccupancy: principalPaid,
    rentUsed,
    rentIsOverride,
    cashFlow,
    holdProjections,
    sell,
    refinance,
    keepLoanCashFlow: cashFlow,
    strategies,
    recommendation,
    timeline,
  }
}

export function cashFlowStatusLabel(status: CashFlowBreakdown['status']): string {
  switch (status) {
    case 'positive':
      return 'Cash-flow positive'
    case 'breakeven':
      return 'Break-even'
    case 'negative':
      return 'Cash-flow negative'
  }
}
