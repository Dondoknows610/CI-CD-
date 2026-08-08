export type IncomeInputs = {
  disabilityGross: number
  recoveryDeduction: number
  schoolBahStipend: number
  jobIncome: number
  otherIncome: number
}

export type LivingInputs = {
  livingExpenses: number
}

export type RentInputs = {
  monthlyRent: number
}

export type BuyInputs = {
  homePrice: number
  /** VA loans are typically 0% down */
  downPaymentPercent: number
  loanTermYears: number
  interestRatePercent: number
  propertyTaxAnnualRate: number
  homeInsuranceMonthly: number
  hoaMonthly: number
  /** Gross closing costs before seller credits */
  closingCostPercent: number
  /** Seller concessions applied at closing (can zero out cash to close) */
  sellerCredits: number
  appreciationAnnualPercent: number
  maintenanceMonthly: number
}

export type ScenarioInputs = {
  income: IncomeInputs
  living: LivingInputs
  rent: RentInputs
  buy: BuyInputs
  months: number
}

export type FlowSlice = {
  id: string
  label: string
  amount: number
  kind: 'income' | 'housing' | 'equity' | 'expense' | 'cash' | 'sunk'
}

export type PathResult = {
  label: string
  monthlyHousing: number
  monthlyCashFlow: number
  totalIncome: number
  totalHousingPaid: number
  totalLiving: number
  totalCashSaved: number
  totalSunkCost: number
  equityBuilt: number
  netPosition: number
  upfrontCash: number
  slices: FlowSlice[]
  monthlySlices: FlowSlice[]
}

export type ComparisonResult = {
  months: number
  monthlyIncome: number
  disabilityNet: number
  rent: PathResult
  buy: PathResult
  equityAdvantage: number
  cashAdvantage: number
  netAdvantage: number
}

export const DEFAULT_INCOME: IncomeInputs = {
  disabilityGross: 2400,
  recoveryDeduction: 328,
  schoolBahStipend: 3800,
  jobIncome: 4800,
  otherIncome: 0,
}

export const DEFAULT_LIVING: LivingInputs = {
  livingExpenses: 1800,
}

export const DEFAULT_RENT: RentInputs = {
  monthlyRent: 2900,
}

/**
 * San Diego + VA loan defaults.
 * 0% down; seller credits cover typical closing (funding fee waived with disability).
 */
export const DEFAULT_BUY: BuyInputs = {
  homePrice: 650000,
  downPaymentPercent: 0,
  loanTermYears: 30,
  interestRatePercent: 6.25,
  propertyTaxAnnualRate: 1.15,
  homeInsuranceMonthly: 180,
  hoaMonthly: 350,
  closingCostPercent: 2.5,
  // 2.5% of $650k — matches closing so cash-to-close starts at $0
  sellerCredits: 16250,
  appreciationAnnualPercent: 3,
  maintenanceMonthly: 200,
}

export function closingCosts(buy: BuyInputs): number {
  return buy.homePrice * (buy.closingCostPercent / 100)
}

/** Cash needed at closing after down payment and seller credits */
export function cashToClose(buy: BuyInputs): number {
  const down = buy.homePrice * (buy.downPaymentPercent / 100)
  return Math.max(0, down + closingCosts(buy) - buy.sellerCredits)
}

export function disabilityNet(income: IncomeInputs): number {
  return Math.max(0, income.disabilityGross - income.recoveryDeduction)
}

export function monthlyIncome(income: IncomeInputs): number {
  return (
    disabilityNet(income) +
    income.schoolBahStipend +
    income.jobIncome +
    income.otherIncome
  )
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

/** Principal paid over `months` via standard amortization */
export function principalPaidOverMonths(
  loanAmount: number,
  annualRatePercent: number,
  termYears: number,
  months: number,
): number {
  if (loanAmount <= 0 || months <= 0) return 0
  const payment = mortgagePayment(loanAmount, annualRatePercent, termYears)
  const monthlyRate = annualRatePercent / 100 / 12
  let balance = loanAmount
  let paid = 0
  const limit = Math.min(months, termYears * 12)

  for (let i = 0; i < limit; i += 1) {
    const interest = balance * monthlyRate
    const principal = Math.min(payment - interest, balance)
    paid += Math.max(0, principal)
    balance = Math.max(0, balance - principal)
  }
  return paid
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeRentPath(
  income: IncomeInputs,
  living: LivingInputs,
  rent: RentInputs,
  months: number,
): PathResult {
  const inc = monthlyIncome(income)
  const housing = rent.monthlyRent
  const cashFlow = inc - housing - living.livingExpenses
  const totalIncome = inc * months
  const totalHousing = housing * months
  const totalLiving = living.livingExpenses * months
  const totalCash = cashFlow * months

  return {
    label: 'Rent',
    monthlyHousing: round2(housing),
    monthlyCashFlow: round2(cashFlow),
    totalIncome: round2(totalIncome),
    totalHousingPaid: round2(totalHousing),
    totalLiving: round2(totalLiving),
    totalCashSaved: round2(totalCash),
    totalSunkCost: round2(totalHousing),
    equityBuilt: 0,
    netPosition: round2(totalCash),
    upfrontCash: 0,
    slices: [
      { id: 'rent', label: 'Rent paid', amount: totalHousing, kind: 'sunk' },
      { id: 'living', label: 'Living costs', amount: totalLiving, kind: 'expense' },
      { id: 'cash', label: 'Cash kept', amount: Math.max(0, totalCash), kind: 'cash' },
    ],
    monthlySlices: [
      { id: 'rent', label: 'Rent', amount: housing, kind: 'sunk' },
      { id: 'living', label: 'Living', amount: living.livingExpenses, kind: 'expense' },
      { id: 'cash', label: 'Cash', amount: Math.max(0, cashFlow), kind: 'cash' },
    ],
  }
}

export function computeBuyPath(
  income: IncomeInputs,
  living: LivingInputs,
  buy: BuyInputs,
  months: number,
): PathResult {
  const inc = monthlyIncome(income)
  const downPayment = buy.homePrice * (buy.downPaymentPercent / 100)
  const outOfPocket = cashToClose(buy)
  // Credits beyond cash-to-close don't create free cash here — they only zero the close
  const loan = Math.max(0, buy.homePrice - downPayment)
  const pi = mortgagePayment(loan, buy.interestRatePercent, buy.loanTermYears)
  const taxMonthly = (buy.homePrice * (buy.propertyTaxAnnualRate / 100)) / 12
  const housing =
    pi + taxMonthly + buy.homeInsuranceMonthly + buy.hoaMonthly + buy.maintenanceMonthly

  const cashFlow = inc - housing - living.livingExpenses
  const principalPaid = principalPaidOverMonths(
    loan,
    buy.interestRatePercent,
    buy.loanTermYears,
    months,
  )
  const appreciation =
    buy.homePrice * (Math.pow(1 + buy.appreciationAnnualPercent / 100, months / 12) - 1)
  const equity = downPayment + principalPaid + appreciation

  const totalIncome = inc * months
  const totalHousing = housing * months
  const totalLiving = living.livingExpenses * months
  const operatingCash = cashFlow * months
  const totalCash = operatingCash - outOfPocket
  const interestAndFees = totalHousing - principalPaid
  const sunk = Math.max(0, interestAndFees)

  return {
    label: 'Buy',
    monthlyHousing: round2(housing),
    monthlyCashFlow: round2(cashFlow),
    totalIncome: round2(totalIncome),
    totalHousingPaid: round2(totalHousing),
    totalLiving: round2(totalLiving),
    totalCashSaved: round2(totalCash),
    totalSunkCost: round2(sunk),
    equityBuilt: round2(equity),
    netPosition: round2(totalCash + equity),
    upfrontCash: round2(outOfPocket),
    slices: [
      { id: 'equity', label: 'Equity built', amount: equity, kind: 'equity' },
      { id: 'sunk', label: 'Interest & ownership costs', amount: sunk, kind: 'sunk' },
      { id: 'living', label: 'Living costs', amount: totalLiving, kind: 'expense' },
      {
        id: 'cash',
        label: totalCash >= 0 ? 'Cash kept' : 'Cash shortfall',
        amount: Math.abs(totalCash),
        kind: 'cash',
      },
    ],
    monthlySlices: [
      { id: 'pi', label: 'Mortgage P&I', amount: pi, kind: 'housing' },
      { id: 'tax', label: 'Property tax', amount: taxMonthly, kind: 'housing' },
      {
        id: 'ins',
        label: 'Insurance + HOA + maint.',
        amount: buy.homeInsuranceMonthly + buy.hoaMonthly + buy.maintenanceMonthly,
        kind: 'housing',
      },
      { id: 'living', label: 'Living', amount: living.livingExpenses, kind: 'expense' },
      { id: 'cash', label: 'Cash', amount: Math.max(0, cashFlow), kind: 'cash' },
    ],
  }
}

export function compareScenarios(inputs: ScenarioInputs): ComparisonResult {
  const disability = disabilityNet(inputs.income)
  const inc = monthlyIncome(inputs.income)
  const rent = computeRentPath(inputs.income, inputs.living, inputs.rent, inputs.months)
  const buy = computeBuyPath(inputs.income, inputs.living, inputs.buy, inputs.months)

  return {
    months: inputs.months,
    monthlyIncome: round2(inc),
    disabilityNet: round2(disability),
    rent,
    buy,
    equityAdvantage: round2(buy.equityBuilt - rent.equityBuilt),
    cashAdvantage: round2(buy.totalCashSaved - rent.totalCashSaved),
    netAdvantage: round2(buy.netPosition - rent.netPosition),
  }
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

export function incomeSlices(income: IncomeInputs): FlowSlice[] {
  const slices: FlowSlice[] = [
    {
      id: 'disability',
      label: 'VA disability (net)',
      amount: disabilityNet(income),
      kind: 'income',
    },
    {
      id: 'school',
      label: 'School BAH + stipend',
      amount: income.schoolBahStipend,
      kind: 'income',
    },
    { id: 'job', label: 'Job income', amount: income.jobIncome, kind: 'income' },
  ]
  if (income.otherIncome > 0) {
    slices.push({ id: 'other', label: 'Other', amount: income.otherIncome, kind: 'income' })
  }
  return slices.filter((s) => s.amount > 0)
}
