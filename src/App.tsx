import { useMemo, useState } from 'react'
import { Circlegram, OrbitCompare } from './Circlegram'
import { Field, MoneyInput, RangeRow } from './Inputs'
import {
  analyzeInvestment,
  cashFlowStatusLabel,
  DEFAULT_LOAN,
  DEFAULT_OPERATING,
  DEFAULT_REFINANCE,
  type LoanInputs,
  type OperatingInputs,
  type RefinanceInputs,
} from './investment'
import { formatMoney, formatPct } from './money'
import {
  activeRent,
  buildRentAssumption,
  conditionLabel,
  DEFAULT_PROPERTY,
  isRentOverridden,
  propertyLabel,
  type PropertyCondition,
  type PropertyProfile,
  type PropertyType,
  type RentAssumption,
} from './property'
import './App.css'

type StepId = 'property' | 'rent' | 'model' | 'decision' | 'strategies'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'property', label: 'Property' },
  { id: 'rent', label: 'Rent' },
  { id: 'model', label: 'Cash flow' },
  { id: 'decision', label: 'Occupancy' },
  { id: 'strategies', label: 'Exit' },
]

export default function App() {
  const [property, setProperty] = useState<PropertyProfile>(DEFAULT_PROPERTY)
  const [manualRent, setManualRent] = useState<number | null>(null)
  const [loan, setLoan] = useState<LoanInputs>(DEFAULT_LOAN)
  const [ops, setOps] = useState<OperatingInputs>(DEFAULT_OPERATING)
  const [refi, setRefi] = useState<RefinanceInputs>(DEFAULT_REFINANCE)
  const [step, setStep] = useState<StepId>('property')

  const rent: RentAssumption = useMemo(
    () => buildRentAssumption(property, manualRent),
    [property, manualRent],
  )

  const analysis = useMemo(
    () => analyzeInvestment(property, rent, loan, ops, refi),
    [property, rent, loan, ops, refi],
  )

  const expenseSlices = useMemo(
    () =>
      [
        { id: 'pi', label: 'Mortgage P&I', amount: analysis.cashFlow.mortgagePi, kind: 'housing' as const },
        { id: 'tax', label: 'Taxes', amount: analysis.cashFlow.propertyTaxMonthly, kind: 'housing' as const },
        {
          id: 'ins',
          label: 'Insurance + HOA + maint.',
          amount:
            analysis.cashFlow.insuranceMonthly +
            analysis.cashFlow.hoaMonthly +
            analysis.cashFlow.maintenanceMonthly,
          kind: 'expense' as const,
        },
        {
          id: 'vac',
          label: 'Vacancy + management',
          amount: analysis.cashFlow.vacancyMonthly + analysis.cashFlow.managementMonthly,
          kind: 'sunk' as const,
        },
        {
          id: 'cf',
          label: analysis.cashFlow.monthlyCashFlow >= 0 ? 'Cash flow' : 'Shortfall',
          amount: Math.abs(analysis.cashFlow.monthlyCashFlow),
          kind: 'cash' as const,
        },
      ].filter((s) => s.amount > 0),
    [analysis.cashFlow],
  )

  const strategySlices = useMemo(
    () =>
      analysis.strategies.map((s) => ({
        id: s.id,
        label: s.label,
        amount: Math.max(0, s.fiveYearWealth),
        kind:
          s.id === 'sell'
            ? ('sunk' as const)
            : s.id === 'refinance'
              ? ('equity' as const)
              : s.id === 'keep_loan'
                ? ('income' as const)
                : ('cash' as const),
      })),
    [analysis.strategies],
  )

  const patchProperty = <K extends keyof PropertyProfile>(key: K, value: PropertyProfile[K]) => {
    setProperty((s) => ({ ...s, [key]: value }))
  }

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden />

      <header className="hero">
        <div className="hero-copy">
          <p className="brand">Orbit</p>
          <h1>Property investment & exit strategy</h1>
          <p className="lede">
            Model a San Diego purchase through VA occupancy, then compare rent, sell, refinance, or
            keep the existing loan — and see which path wins under your assumptions.
          </p>
          <div className="hero-cta">
            <a href="#workflow" className="btn primary">
              Analyze property
            </a>
            <a href="#summary" className="btn ghost">
              Jump to recommendation
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <Circlegram
            title="Strategy wealth"
            subtitle="5-year modeled position"
            slices={strategySlices}
            centerValue={formatMoney(
              Math.max(...analysis.strategies.map((s) => s.fiveYearWealth)),
              true,
            )}
            centerLabel="best path"
            animateKey={analysis.recommendation.strategyId}
          />
        </div>
      </header>

      <nav className="stepper" id="workflow" aria-label="Analysis steps">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={step === s.id ? 'active' : ''}
            onClick={() => {
              setStep(s.id)
              document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <main>
        {/* 1. Property */}
        <section className="section" id="property" aria-labelledby="property-title">
          <div className="section-copy">
            <h2 id="property-title">1. Select property</h2>
            <p>Foundation for rent estimates, cash flow, equity, and every exit strategy.</p>
          </div>
          <div className="control-grid property-grid">
            <div className="control-block wide">
              <h3>Location & identity</h3>
              <Field label="Address">
                <input
                  className="text-input"
                  value={property.address}
                  onChange={(e) => patchProperty('address', e.target.value)}
                />
              </Field>
              <div className="field-row">
                <Field label="City">
                  <input
                    className="text-input"
                    value={property.city}
                    onChange={(e) => patchProperty('city', e.target.value)}
                  />
                </Field>
                <Field label="State">
                  <input
                    className="text-input"
                    value={property.state}
                    onChange={(e) => patchProperty('state', e.target.value)}
                  />
                </Field>
                <Field label="ZIP">
                  <input
                    className="text-input"
                    value={property.zip}
                    onChange={(e) => patchProperty('zip', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Purchase price">
                <MoneyInput
                  value={property.purchasePrice}
                  onChange={(purchasePrice) => patchProperty('purchasePrice', purchasePrice)}
                  step={5000}
                />
              </Field>
            </div>

            <div className="control-block">
              <h3>Specs</h3>
              <Field label="Property type">
                <select
                  className="text-input"
                  value={property.propertyType}
                  onChange={(e) => patchProperty('propertyType', e.target.value as PropertyType)}
                >
                  <option value="condo">Condo</option>
                  <option value="townhome">Townhome</option>
                  <option value="single_family">Single family</option>
                  <option value="multi_family">Multi-family</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <div className="field-row">
                <Field label="Beds">
                  <MoneyInput
                    value={property.bedrooms}
                    onChange={(bedrooms) => patchProperty('bedrooms', bedrooms)}
                    prefix=""
                    step={1}
                  />
                </Field>
                <Field label="Baths">
                  <MoneyInput
                    value={property.bathrooms}
                    onChange={(bathrooms) => patchProperty('bathrooms', bathrooms)}
                    prefix=""
                    step={0.5}
                  />
                </Field>
              </div>
              <Field label="Square feet">
                <MoneyInput
                  value={property.squareFeet}
                  onChange={(squareFeet) => patchProperty('squareFeet', squareFeet)}
                  prefix=""
                  suffix="sqft"
                  step={50}
                />
              </Field>
              <Field label="Lot size">
                <MoneyInput
                  value={property.lotSqFt}
                  onChange={(lotSqFt) => patchProperty('lotSqFt', lotSqFt)}
                  prefix=""
                  suffix="sqft"
                  step={100}
                />
              </Field>
              <Field label="Year built">
                <MoneyInput
                  value={property.yearBuilt}
                  onChange={(yearBuilt) => patchProperty('yearBuilt', yearBuilt)}
                  prefix=""
                  step={1}
                />
              </Field>
              <Field label="Garage / parking spaces">
                <MoneyInput
                  value={property.garageSpaces}
                  onChange={(garageSpaces) => patchProperty('garageSpaces', garageSpaces)}
                  prefix=""
                  step={1}
                />
              </Field>
            </div>

            <div className="control-block">
              <h3>Condition & extras</h3>
              <Field label="Condition">
                <select
                  className="text-input"
                  value={property.condition}
                  onChange={(e) =>
                    patchProperty('condition', e.target.value as PropertyCondition)
                  }
                >
                  <option value="needs_work">Needs work</option>
                  <option value="fair">Fair</option>
                  <option value="good">Good</option>
                  <option value="updated">Updated</option>
                  <option value="luxury">Luxury</option>
                </select>
              </Field>
              <Field label="HOA / month">
                <MoneyInput
                  value={property.hoaMonthly}
                  onChange={(hoaMonthly) => patchProperty('hoaMonthly', hoaMonthly)}
                  step={25}
                />
              </Field>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={property.furnished}
                  onChange={(e) => patchProperty('furnished', e.target.checked)}
                />
                Furnished
              </label>
              <Field label="Renovations / upgrades">
                <textarea
                  className="text-input area"
                  rows={3}
                  value={property.renovations}
                  onChange={(e) => patchProperty('renovations', e.target.value)}
                />
              </Field>
              <Field label="Notes">
                <textarea
                  className="text-input area"
                  rows={3}
                  value={property.notes}
                  onChange={(e) => patchProperty('notes', e.target.value)}
                />
              </Field>
            </div>
          </div>
          <p className="property-chipline">
            {propertyLabel(property.propertyType)} · {property.bedrooms}bd/{property.bathrooms}ba ·{' '}
            {property.squareFeet.toLocaleString()} sqft · {conditionLabel(property.condition)} ·{' '}
            {formatMoney(property.purchasePrice)}
          </p>
        </section>

        {/* 2. Rent */}
        <section className="section" id="rent" aria-labelledby="rent-title">
          <div className="section-copy">
            <h2 id="rent-title">2. Rental income analysis</h2>
            <p>
              Market range from property traits. Override with your own rent — the model always
              shows which number is driving the math.
            </p>
          </div>
          <div className="rent-grid">
            <div className="rent-range" role="list">
              <div role="listitem">
                <span>Conservative</span>
                <strong>{formatMoney(rent.marketConservative)}</strong>
              </div>
              <div role="listitem" className="expected">
                <span>Expected (software)</span>
                <strong>{formatMoney(rent.marketExpected)}</strong>
              </div>
              <div role="listitem">
                <span>Optimistic</span>
                <strong>{formatMoney(rent.marketOptimistic)}</strong>
              </div>
            </div>
            <div className="control-block">
              <h3>Your rental assumption</h3>
              <p className="inline-note">
                Active rent:{' '}
                <strong>{formatMoney(activeRent(rent))}</strong>
                {isRentOverridden(rent) ? (
                  <span className="tag override"> Manual override</span>
                ) : (
                  <span className="tag market"> Using market expected</span>
                )}
              </p>
              <Field label="Manual monthly rent" hint="leave blank via Reset to use market">
                <MoneyInput
                  value={manualRent ?? rent.marketExpected}
                  onChange={(n) => setManualRent(n)}
                  step={50}
                />
              </Field>
              <p className="inline-note">
                <button type="button" className="chip" onClick={() => setManualRent(null)}>
                  Use market expected
                </button>{' '}
                <button
                  type="button"
                  className="chip"
                  onClick={() => setManualRent(rent.marketOptimistic)}
                >
                  Use optimistic
                </button>{' '}
                <button
                  type="button"
                  className="chip"
                  onClick={() => setManualRent(rent.marketConservative)}
                >
                  Use conservative
                </button>
              </p>
              <h4 className="subhead">Estimate factors</h4>
              <ul className="factor-list">
                {rent.factors.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="inline-note">{rent.compsNote}</p>
            </div>
          </div>
        </section>

        {/* 3. Financial model */}
        <section className="section" id="model" aria-labelledby="model-title">
          <div className="section-copy">
            <h2 id="model-title">3. Property financial model</h2>
            <p>Loan + operating costs against rental income. Tune any lever; circles update live.</p>
          </div>

          <div className="control-grid">
            <div className="control-block">
              <h3>VA loan</h3>
              <RangeRow
                label="Down payment"
                value={loan.downPaymentPercent}
                min={0}
                max={20}
                step={0.5}
                format={(n) => formatPct(n)}
                onChange={(downPaymentPercent) => setLoan((s) => ({ ...s, downPaymentPercent }))}
              />
              <p className="inline-note">
                <button
                  type="button"
                  className="chip"
                  onClick={() => setLoan((s) => ({ ...s, downPaymentPercent: 0 }))}
                >
                  VA 0% down
                </button>
              </p>
              <RangeRow
                label="Interest rate"
                value={loan.interestRatePercent}
                min={3}
                max={9}
                step={0.125}
                format={(n) => formatPct(n, 3)}
                onChange={(interestRatePercent) => setLoan((s) => ({ ...s, interestRatePercent }))}
              />
              <RangeRow
                label="Closing costs (gross)"
                value={loan.closingCostPercent}
                min={0}
                max={5}
                step={0.1}
                format={(n) =>
                  `${formatPct(n)} · ${formatMoney(property.purchasePrice * (n / 100))}`
                }
                onChange={(closingCostPercent) => setLoan((s) => ({ ...s, closingCostPercent }))}
              />
              <Field label="Seller credits">
                <MoneyInput
                  value={loan.sellerCredits}
                  onChange={(sellerCredits) => setLoan((s) => ({ ...s, sellerCredits }))}
                  step={250}
                />
              </Field>
              <p className="inline-note">
                <button
                  type="button"
                  className="chip"
                  onClick={() =>
                    setLoan((s) => ({
                      ...s,
                      sellerCredits: Math.round(
                        property.purchasePrice * (s.closingCostPercent / 100),
                      ),
                    }))
                  }
                >
                  Cover all closing
                </button>
                {' · '}
                Cash to close: <strong>{formatMoney(analysis.cashToClose)}</strong>
              </p>
            </div>

            <div className="control-block">
              <h3>Operating costs</h3>
              <RangeRow
                label="Property tax rate"
                value={ops.propertyTaxAnnualRate}
                min={0.5}
                max={2}
                step={0.05}
                format={(n) => formatPct(n)}
                onChange={(propertyTaxAnnualRate) =>
                  setOps((s) => ({ ...s, propertyTaxAnnualRate }))
                }
              />
              <Field label="Insurance / month">
                <MoneyInput
                  value={ops.homeInsuranceMonthly}
                  onChange={(homeInsuranceMonthly) =>
                    setOps((s) => ({ ...s, homeInsuranceMonthly }))
                  }
                  step={10}
                />
              </Field>
              <Field label="Maintenance / month">
                <MoneyInput
                  value={ops.maintenanceMonthly}
                  onChange={(maintenanceMonthly) => setOps((s) => ({ ...s, maintenanceMonthly }))}
                  step={25}
                />
              </Field>
              <RangeRow
                label="Vacancy"
                value={ops.vacancyPercent}
                min={0}
                max={15}
                step={0.5}
                format={(n) => formatPct(n)}
                onChange={(vacancyPercent) => setOps((s) => ({ ...s, vacancyPercent }))}
              />
              <RangeRow
                label="Property management"
                value={ops.managementPercent}
                min={0}
                max={12}
                step={0.5}
                format={(n) => formatPct(n)}
                onChange={(managementPercent) => setOps((s) => ({ ...s, managementPercent }))}
              />
              <Field label="Utilities / month" hint="if landlord-paid">
                <MoneyInput
                  value={ops.utilitiesMonthly}
                  onChange={(utilitiesMonthly) => setOps((s) => ({ ...s, utilitiesMonthly }))}
                  step={25}
                />
              </Field>
              <Field label="Other / month">
                <MoneyInput
                  value={ops.otherMonthly}
                  onChange={(otherMonthly) => setOps((s) => ({ ...s, otherMonthly }))}
                  step={25}
                />
              </Field>
              <RangeRow
                label="Appreciation"
                value={ops.appreciationAnnualPercent}
                min={0}
                max={10}
                step={0.25}
                format={(n) => formatPct(n)}
                onChange={(appreciationAnnualPercent) =>
                  setOps((s) => ({ ...s, appreciationAnnualPercent }))
                }
              />
            </div>

            <div className="control-block highlight-block">
              <h3>Performance</h3>
              <p className={`status-pill ${analysis.cashFlow.status}`}>
                {cashFlowStatusLabel(analysis.cashFlow.status)}
              </p>
              <ul className="metric-list">
                <li>
                  <span>Gross rent / yr</span>
                  <strong>{formatMoney(analysis.cashFlow.grossAnnualRent)}</strong>
                </li>
                <li>
                  <span>Total expenses / mo</span>
                  <strong>{formatMoney(analysis.cashFlow.totalMonthlyExpenses)}</strong>
                </li>
                <li>
                  <span>Cash flow / mo</span>
                  <strong>{formatMoney(analysis.cashFlow.monthlyCashFlow)}</strong>
                </li>
                <li>
                  <span>Cash flow / yr</span>
                  <strong>{formatMoney(analysis.cashFlow.annualCashFlow)}</strong>
                </li>
                <li>
                  <span>Mortgage P&I</span>
                  <strong>{formatMoney(analysis.monthlyPi)}</strong>
                </li>
              </ul>
            </div>
          </div>

          <Circlegram
            title="Monthly rental stack"
            subtitle={
              analysis.rentIsOverride
                ? `Using your rent ${formatMoney(analysis.rentUsed)}`
                : `Using market rent ${formatMoney(analysis.rentUsed)}`
            }
            slices={expenseSlices}
            centerValue={formatMoney(analysis.cashFlow.monthlyCashFlow, true)}
            centerLabel="cash flow"
            animateKey={analysis.cashFlow.monthlyCashFlow}
          />
        </section>

        {/* 4. Occupancy timeline */}
        <section className="section" id="decision" aria-labelledby="decision-title">
          <div className="section-copy">
            <h2 id="decision-title">4. VA occupancy → decision point</h2>
            <p>
              Occupancy length is configurable (not legal advice). After it, Orbit compares exit
              strategies using value, loan balance, and rent.
            </p>
          </div>
          <div className="control-block horizon">
            <RangeRow
              label="Owner-occupancy months"
              value={loan.occupancyMonths}
              min={0}
              max={36}
              step={1}
              format={(n) => `${n} mo`}
              onChange={(occupancyMonths) => setLoan((s) => ({ ...s, occupancyMonths }))}
            />
            <div className="horizon-toggles" role="group" aria-label="Occupancy presets">
              {[6, 12, 24].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={loan.occupancyMonths === m ? 'active' : ''}
                  onClick={() => setLoan((s) => ({ ...s, occupancyMonths: m }))}
                >
                  {m} months
                </button>
              ))}
            </div>
            <ol className="timeline">
              {analysis.timeline.map((t) => (
                <li key={`${t.label}-${t.month}`}>
                  <strong>{t.label}</strong>
                  <span>Month {t.month}</span>
                </li>
              ))}
            </ol>
            <div className="stat-strip" role="list">
              <div role="listitem">
                <span>Value at decision</span>
                <strong>{formatMoney(analysis.valueAtDecision)}</strong>
              </div>
              <div role="listitem">
                <span>Loan balance</span>
                <strong>{formatMoney(analysis.loanAtDecision)}</strong>
              </div>
              <div role="listitem">
                <span>Equity</span>
                <strong>{formatMoney(analysis.equityAtDecision)}</strong>
              </div>
              <div role="listitem">
                <span>Principal paid</span>
                <strong>{formatMoney(analysis.principalPaidDuringOccupancy)}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Exit strategies */}
        <section className="section" id="strategies" aria-labelledby="strategies-title">
          <div className="section-copy">
            <h2 id="strategies-title">5. Exit strategy analysis</h2>
            <p>Compare rent/hold, sell, refinance, and keeping the existing loan.</p>
          </div>

          <OrbitCompare
            months={loan.occupancyMonths}
            leftLabel="Hold 5yr"
            rightLabel="Sell now"
            leftNet={analysis.strategies.find((s) => s.id === 'rent_hold')!.fiveYearWealth}
            rightNet={analysis.strategies.find((s) => s.id === 'sell')!.immediateCash}
            leftEquity={analysis.equityAtDecision}
            rightEquity={0}
            leftCash={analysis.cashFlow.annualCashFlow}
            rightCash={analysis.sell.netProceeds}
            caption={`Hold wealth vs sell proceeds after ${loan.occupancyMonths} mo occupancy`}
          />

          <div className="strategy-grid">
            <article className="control-block">
              <h3>A · Rent & hold</h3>
              <ul className="metric-list">
                <li>
                  <span>Monthly CF</span>
                  <strong>{formatMoney(analysis.cashFlow.monthlyCashFlow)}</strong>
                </li>
                <li>
                  <span>Annual CF</span>
                  <strong>{formatMoney(analysis.cashFlow.annualCashFlow)}</strong>
                </li>
              </ul>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Horizon</th>
                      <th>Equity</th>
                      <th>CF total</th>
                      <th>Wealth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.holdProjections.map((p) => (
                      <tr key={p.years}>
                        <td>{p.years} yr</td>
                        <td>{formatMoney(p.equity)}</td>
                        <td>{formatMoney(p.totalCashFlow)}</td>
                        <td>{formatMoney(p.totalReturn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="control-block">
              <h3>B · Sell</h3>
              <ul className="metric-list">
                <li>
                  <span>Value</span>
                  <strong>{formatMoney(analysis.sell.propertyValue)}</strong>
                </li>
                <li>
                  <span>Loan payoff</span>
                  <strong>{formatMoney(analysis.sell.loanBalance)}</strong>
                </li>
                <li>
                  <span>Selling costs ({formatPct(ops.sellingCostPercent)})</span>
                  <strong>{formatMoney(analysis.sell.sellingCosts)}</strong>
                </li>
                <li>
                  <span>Walk-away cash</span>
                  <strong>{formatMoney(analysis.sell.netProceeds)}</strong>
                </li>
                <li>
                  <span>Vs cash to close</span>
                  <strong>{formatMoney(analysis.sell.profitVsPurchase)}</strong>
                </li>
              </ul>
              <RangeRow
                label="Selling cost %"
                value={ops.sellingCostPercent}
                min={2}
                max={8}
                step={0.25}
                format={(n) => formatPct(n)}
                onChange={(sellingCostPercent) => setOps((s) => ({ ...s, sellingCostPercent }))}
              />
            </article>

            <article className="control-block">
              <h3>C · Refinance</h3>
              <RangeRow
                label="New rate"
                value={refi.newRatePercent}
                min={3}
                max={9}
                step={0.125}
                format={(n) => formatPct(n, 3)}
                onChange={(newRatePercent) => setRefi((s) => ({ ...s, newRatePercent }))}
              />
              <RangeRow
                label="New term (years)"
                value={refi.newTermYears}
                min={10}
                max={30}
                step={5}
                format={(n) => `${n} yr`}
                onChange={(newTermYears) => setRefi((s) => ({ ...s, newTermYears }))}
              />
              <Field label="Cash-out amount">
                <MoneyInput
                  value={refi.cashOutAmount}
                  onChange={(cashOutAmount) => setRefi((s) => ({ ...s, cashOutAmount }))}
                  step={1000}
                />
              </Field>
              <Field label="Value override" hint="blank = model value">
                <MoneyInput
                  value={refi.valueOverride ?? analysis.valueAtDecision}
                  onChange={(valueOverride) => setRefi((s) => ({ ...s, valueOverride }))}
                  step={5000}
                />
              </Field>
              <p className="inline-note">
                <button
                  type="button"
                  className="chip"
                  onClick={() => setRefi((s) => ({ ...s, valueOverride: null }))}
                >
                  Use modeled value
                </button>
              </p>
              <RangeRow
                label="Refi closing %"
                value={refi.closingCostPercent}
                min={0}
                max={4}
                step={0.25}
                format={(n) => formatPct(n)}
                onChange={(closingCostPercent) => setRefi((s) => ({ ...s, closingCostPercent }))}
              />
              <ul className="metric-list">
                <li>
                  <span>New payment</span>
                  <strong>{formatMoney(analysis.refinance.newPayment)}</strong>
                </li>
                <li>
                  <span>Payment Δ</span>
                  <strong>{formatMoney(analysis.refinance.paymentDelta)}</strong>
                </li>
                <li>
                  <span>Cash from refi</span>
                  <strong>{formatMoney(analysis.refinance.netCashFromRefi)}</strong>
                </li>
                <li>
                  <span>CF after refi</span>
                  <strong>{formatMoney(analysis.refinance.monthlyCashFlowAfter)}</strong>
                </li>
                <li>
                  <span>Break-even</span>
                  <strong>
                    {analysis.refinance.breakEvenMonths === null
                      ? 'N/A'
                      : analysis.refinance.breakEvenMonths === 0
                        ? 'Immediate'
                        : `${analysis.refinance.breakEvenMonths} mo`}
                  </strong>
                </li>
              </ul>
            </article>

            <article className="control-block">
              <h3>D · Keep existing loan</h3>
              <p className="inline-note">
                Same rental math as hold — useful when refi looks tempting but the VA rate already
                wins.
              </p>
              <ul className="metric-list">
                <li>
                  <span>Current rate</span>
                  <strong>{formatPct(loan.interestRatePercent, 3)}</strong>
                </li>
                <li>
                  <span>Payment</span>
                  <strong>{formatMoney(analysis.monthlyPi)}</strong>
                </li>
                <li>
                  <span>Monthly CF</span>
                  <strong>{formatMoney(analysis.keepLoanCashFlow.monthlyCashFlow)}</strong>
                </li>
                <li>
                  <span>vs Refi CF</span>
                  <strong>
                    {formatMoney(
                      analysis.keepLoanCashFlow.monthlyCashFlow -
                        analysis.refinance.monthlyCashFlowAfter,
                    )}
                  </strong>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* Scenario shortcuts */}
        <section className="section" aria-labelledby="scenario-title">
          <div className="section-copy">
            <h2 id="scenario-title">Scenario stress tests</h2>
            <p>One-click assumption shocks — then tweak further above.</p>
          </div>
          <div className="scenario-chips">
            <button
              type="button"
              className="chip"
              onClick={() => setManualRent(Math.max(0, activeRent(rent) - 500))}
            >
              Rent −$500
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => setOps((s) => ({ ...s, appreciationAnnualPercent: 10 }))}
            >
              Appreciate 10%/yr
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => setOps((s) => ({ ...s, appreciationAnnualPercent: 0 }))}
            >
              No appreciation
            </button>
            <button
              type="button"
              className="chip"
              onClick={() =>
                setRefi((s) => ({
                  ...s,
                  newRatePercent: Math.max(3, loan.interestRatePercent - 2),
                }))
              }
            >
              Refi rate −2%
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                setManualRent(null)
                setOps(DEFAULT_OPERATING)
                setRefi(DEFAULT_REFINANCE)
                setLoan((s) => ({
                  ...DEFAULT_LOAN,
                  occupancyMonths: s.occupancyMonths,
                  sellerCredits: Math.round(
                    property.purchasePrice * (DEFAULT_LOAN.closingCostPercent / 100),
                  ),
                }))
              }}
            >
              Reset assumptions
            </button>
          </div>
        </section>

        {/* Summary */}
        <section className="section summary" id="summary" aria-labelledby="summary-title">
          <div className="section-copy">
            <h2 id="summary-title">Investment summary</h2>
            <p>Decision snapshot for this property under your current assumptions.</p>
          </div>

          <div className="summary-cards">
            <div className="control-block">
              <h3>Property snapshot</h3>
              <ul className="metric-list">
                <li>
                  <span>Purchase price</span>
                  <strong>{formatMoney(analysis.purchasePrice)}</strong>
                </li>
                <li>
                  <span>Value at decision</span>
                  <strong>{formatMoney(analysis.valueAtDecision)}</strong>
                </li>
                <li>
                  <span>Estimated rent</span>
                  <strong>
                    {formatMoney(analysis.rentUsed)}
                    {analysis.rentIsOverride ? ' (yours)' : ' (market)'}
                  </strong>
                </li>
                <li>
                  <span>Mortgage P&I</span>
                  <strong>{formatMoney(analysis.monthlyPi)}</strong>
                </li>
                <li>
                  <span>Expenses / mo</span>
                  <strong>{formatMoney(analysis.cashFlow.totalMonthlyExpenses)}</strong>
                </li>
                <li>
                  <span>Cash flow / mo</span>
                  <strong>{formatMoney(analysis.cashFlow.monthlyCashFlow)}</strong>
                </li>
                <li>
                  <span>Equity at decision</span>
                  <strong>{formatMoney(analysis.equityAtDecision)}</strong>
                </li>
              </ul>
            </div>

            <div className="control-block recommend">
              <h3>Recommended strategy</h3>
              <p className="recommend-title">{analysis.recommendation.title}</p>
              <p className="recommend-body">{analysis.recommendation.rationale}</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Monthly cash flow</th>
                  <th>Immediate cash</th>
                  <th>Long-term</th>
                  <th>5-yr wealth</th>
                </tr>
              </thead>
              <tbody>
                {analysis.strategies.map((s) => (
                  <tr
                    key={s.id}
                    className={
                      s.id === analysis.recommendation.strategyId ? 'is-recommended' : undefined
                    }
                  >
                    <td>{s.label}</td>
                    <td>
                      {s.monthlyCashFlow === null ? 'N/A' : formatMoney(s.monthlyCashFlow)}
                    </td>
                    <td>{formatMoney(s.immediateCash)}</td>
                    <td>{s.longTermLabel}</td>
                    <td>{formatMoney(s.fiveYearWealth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          Orbit · illustrative San Diego investment model — not financial, tax, or VA legal advice.
          Occupancy rules and market rents are assumptions you control.
        </p>
      </footer>
    </div>
  )
}
