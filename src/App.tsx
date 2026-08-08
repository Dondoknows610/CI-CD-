import { useMemo, useState } from 'react'
import { Circlegram, OrbitCompare } from './Circlegram'
import { Field, MoneyInput, RangeRow } from './Inputs'
import {
  compareScenarios,
  DEFAULT_BUY,
  DEFAULT_INCOME,
  DEFAULT_LIVING,
  DEFAULT_RENT,
  formatMoney,
  incomeSlices,
  type BuyInputs,
  type IncomeInputs,
  type LivingInputs,
  type RentInputs,
} from './finance'
import './App.css'

export default function App() {
  const [income, setIncome] = useState<IncomeInputs>(DEFAULT_INCOME)
  const [living, setLiving] = useState<LivingInputs>(DEFAULT_LIVING)
  const [rent, setRent] = useState<RentInputs>(DEFAULT_RENT)
  const [buy, setBuy] = useState<BuyInputs>(DEFAULT_BUY)
  const [months, setMonths] = useState(6)
  const [panel, setPanel] = useState<'rent' | 'buy'>('rent')

  const result = useMemo(
    () => compareScenarios({ income, living, rent, buy, months }),
    [income, living, rent, buy, months],
  )

  const inSlices = useMemo(() => incomeSlices(income), [income])
  const path = panel === 'rent' ? result.rent : result.buy
  const ahead = result.netAdvantage >= 0 ? 'Buy' : 'Rent'

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden />

      <header className="hero">
        <p className="brand">Orbit</p>
        <h1>Where your San Diego money goes</h1>
        <p className="lede">
          Circlegrams that weigh renting against buying — disability, school BAH, and paycheck
          flowing into cash or equity over time.
        </p>
        <div className="hero-cta">
          <a href="#compare" className="btn primary">
            Compare paths
          </a>
          <a href="#inputs" className="btn ghost">
            Tune numbers
          </a>
        </div>
      </header>

      <main>
        <section className="section income-section" aria-labelledby="income-title">
          <div className="section-copy">
            <h2 id="income-title">Monthly inflow</h2>
            <p>
              Net disability after lump-sum recovery, school housing stipend, and job income —
              San Diego baseline.
            </p>
          </div>
          <Circlegram
            title="Income ring"
            subtitle="Every month before housing"
            slices={inSlices}
            centerValue={formatMoney(result.monthlyIncome, true)}
            centerLabel="/ month"
            animateKey={result.monthlyIncome}
          />
        </section>

        <section className="section controls" id="inputs" aria-labelledby="controls-title">
          <div className="section-copy">
            <h2 id="controls-title">Your levers</h2>
            <p>Change rent, home price, or horizon — the circles recalculate instantly.</p>
          </div>

          <div className="control-grid">
            <div className="control-block">
              <h3>Income</h3>
              <Field label="VA disability (gross)" hint="80% rating">
                <MoneyInput
                  value={income.disabilityGross}
                  onChange={(disabilityGross) => setIncome((s) => ({ ...s, disabilityGross }))}
                  step={10}
                />
              </Field>
              <Field label="Lump-sum recovery deduction" hint="monthly withhold">
                <MoneyInput
                  value={income.recoveryDeduction}
                  onChange={(recoveryDeduction) =>
                    setIncome((s) => ({ ...s, recoveryDeduction }))
                  }
                  step={1}
                />
              </Field>
              <p className="inline-note">
                Disability net: <strong>{formatMoney(result.disabilityNet)}</strong>
              </p>
              <Field label="School BAH + stipend">
                <MoneyInput
                  value={income.schoolBahStipend}
                  onChange={(schoolBahStipend) => setIncome((s) => ({ ...s, schoolBahStipend }))}
                  step={50}
                />
              </Field>
              <Field label="Job income" hint="FOR">
                <MoneyInput
                  value={income.jobIncome}
                  onChange={(jobIncome) => setIncome((s) => ({ ...s, jobIncome }))}
                  step={50}
                />
              </Field>
              <Field label="Other monthly income">
                <MoneyInput
                  value={income.otherIncome}
                  onChange={(otherIncome) => setIncome((s) => ({ ...s, otherIncome }))}
                  step={50}
                />
              </Field>
              <Field label="Living costs (food, transport, etc.)">
                <MoneyInput
                  value={living.livingExpenses}
                  onChange={(livingExpenses) => setLiving({ livingExpenses })}
                  step={50}
                />
              </Field>
            </div>

            <div className="control-block">
              <h3>Rent path</h3>
              <RangeRow
                label="Monthly rent"
                value={rent.monthlyRent}
                min={1800}
                max={4500}
                step={50}
                format={(n) => formatMoney(n)}
                onChange={(monthlyRent) => setRent({ monthlyRent })}
              />
              <Field label="Exact rent">
                <MoneyInput
                  value={rent.monthlyRent}
                  onChange={(monthlyRent) => setRent({ monthlyRent })}
                  step={25}
                />
              </Field>
              <p className="inline-note">
                Try <button type="button" className="chip" onClick={() => setRent({ monthlyRent: 2900 })}>$2,900</button>
                {' '}or{' '}
                <button type="button" className="chip" onClick={() => setRent({ monthlyRent: 3500 })}>$3,500</button>
              </p>
            </div>

            <div className="control-block">
              <h3>Buy path · San Diego</h3>
              <Field label="Home price">
                <MoneyInput
                  value={buy.homePrice}
                  onChange={(homePrice) => setBuy((s) => ({ ...s, homePrice }))}
                  step={5000}
                />
              </Field>
              <RangeRow
                label="Down payment"
                value={buy.downPaymentPercent}
                min={0}
                max={30}
                step={0.5}
                format={(n) => `${n}%`}
                onChange={(downPaymentPercent) => setBuy((s) => ({ ...s, downPaymentPercent }))}
              />
              <RangeRow
                label="Interest rate"
                value={buy.interestRatePercent}
                min={3}
                max={9}
                step={0.125}
                format={(n) => `${n.toFixed(3)}%`}
                onChange={(interestRatePercent) =>
                  setBuy((s) => ({ ...s, interestRatePercent }))
                }
              />
              <Field label="HOA / month">
                <MoneyInput
                  value={buy.hoaMonthly}
                  onChange={(hoaMonthly) => setBuy((s) => ({ ...s, hoaMonthly }))}
                  step={25}
                />
              </Field>
              <Field label="Insurance / month">
                <MoneyInput
                  value={buy.homeInsuranceMonthly}
                  onChange={(homeInsuranceMonthly) =>
                    setBuy((s) => ({ ...s, homeInsuranceMonthly }))
                  }
                  step={10}
                />
              </Field>
              <Field label="Maintenance / month">
                <MoneyInput
                  value={buy.maintenanceMonthly}
                  onChange={(maintenanceMonthly) =>
                    setBuy((s) => ({ ...s, maintenanceMonthly }))
                  }
                  step={25}
                />
              </Field>
              <RangeRow
                label="Annual appreciation"
                value={buy.appreciationAnnualPercent}
                min={0}
                max={8}
                step={0.25}
                format={(n) => `${n}%`}
                onChange={(appreciationAnnualPercent) =>
                  setBuy((s) => ({ ...s, appreciationAnnualPercent }))
                }
              />
              <RangeRow
                label="Property tax rate"
                value={buy.propertyTaxAnnualRate}
                min={0.5}
                max={2}
                step={0.05}
                format={(n) => `${n}%`}
                onChange={(propertyTaxAnnualRate) =>
                  setBuy((s) => ({ ...s, propertyTaxAnnualRate }))
                }
              />
            </div>
          </div>

          <div className="horizon">
            <h3>Time horizon</h3>
            <div className="horizon-toggles" role="group" aria-label="Months to project">
              {[6, 12, 24, 36].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={months === m ? 'active' : ''}
                  onClick={() => setMonths(m)}
                >
                  {m < 12 ? `${m} months` : m === 12 ? '1 year' : `${m / 12} years`}
                </button>
              ))}
            </div>
            <RangeRow
              label="Custom months"
              value={months}
              min={1}
              max={60}
              step={1}
              format={(n) => `${n} mo`}
              onChange={setMonths}
            />
          </div>
        </section>

        <section className="section compare" id="compare" aria-labelledby="compare-title">
          <div className="section-copy">
            <h2 id="compare-title">Rent vs buy over {months} months</h2>
            <p>
              {ahead} leads by{' '}
              <strong>{formatMoney(Math.abs(result.netAdvantage))}</strong> in net position
              (cash + equity, after upfront buy costs).
            </p>
          </div>

          <OrbitCompare
            months={months}
            rentNet={result.rent.netPosition}
            buyNet={result.buy.netPosition}
            rentEquity={result.rent.equityBuilt}
            buyEquity={result.buy.equityBuilt}
            rentCash={result.rent.totalCashSaved}
            buyCash={result.buy.totalCashSaved}
          />

          <div className="stat-strip" role="list">
            <div role="listitem">
              <span>Rent sunk</span>
              <strong>{formatMoney(result.rent.totalSunkCost)}</strong>
            </div>
            <div role="listitem">
              <span>Buy equity</span>
              <strong>{formatMoney(result.buy.equityBuilt)}</strong>
            </div>
            <div role="listitem">
              <span>Buy housing / mo</span>
              <strong>{formatMoney(result.buy.monthlyHousing)}</strong>
            </div>
            <div role="listitem">
              <span>Upfront to buy</span>
              <strong>{formatMoney(result.buy.upfrontCash)}</strong>
            </div>
          </div>
        </section>

        <section className="section outflow" aria-labelledby="outflow-title">
          <div className="section-copy row">
            <div>
              <h2 id="outflow-title">Money destinations</h2>
              <p>Toggle a path to see how the full {months}-month stack splits.</p>
            </div>
            <div className="path-toggle" role="tablist" aria-label="Path">
              <button
                type="button"
                role="tab"
                aria-selected={panel === 'rent'}
                className={panel === 'rent' ? 'active' : ''}
                onClick={() => setPanel('rent')}
              >
                Rent
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panel === 'buy'}
                className={panel === 'buy' ? 'active' : ''}
                onClick={() => setPanel('buy')}
              >
                Buy
              </button>
            </div>
          </div>

          <div className="outflow-grid">
            <Circlegram
              title={`${path.label} total`}
              subtitle={`${months} months of flow`}
              slices={path.slices}
              centerValue={formatMoney(path.netPosition, true)}
              centerLabel="net"
              animateKey={`${panel}-${months}-${path.netPosition}`}
            />
            <Circlegram
              title={`${path.label} monthly`}
              subtitle="Typical month split"
              slices={path.monthlySlices}
              centerValue={formatMoney(path.monthlyCashFlow, true)}
              centerLabel="cash left"
              animateKey={`${panel}-mo-${path.monthlyCashFlow}`}
            />
          </div>

          <div className="detail-panels">
            <article>
              <h3>If you rent</h3>
              <ul>
                <li>
                  Housing: {formatMoney(result.rent.monthlyHousing)}/mo ·{' '}
                  {formatMoney(result.rent.totalHousingPaid)} total
                </li>
                <li>Cash kept: {formatMoney(result.rent.totalCashSaved)}</li>
                <li>Equity: {formatMoney(0)} — rent does not build ownership</li>
                <li>Net position: {formatMoney(result.rent.netPosition)}</li>
              </ul>
            </article>
            <article>
              <h3>If you buy</h3>
              <ul>
                <li>
                  Housing: {formatMoney(result.buy.monthlyHousing)}/mo ·{' '}
                  {formatMoney(result.buy.totalHousingPaid)} total
                </li>
                <li>
                  Cash after upfront: {formatMoney(result.buy.totalCashSaved)}
                  <span className="dim">
                    {' '}
                    (down + closing {formatMoney(result.buy.upfrontCash)})
                  </span>
                </li>
                <li>
                  Equity built: {formatMoney(result.buy.equityBuilt)}
                  <span className="dim"> down + principal + appreciation</span>
                </li>
                <li>Net position: {formatMoney(result.buy.netPosition)}</li>
              </ul>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          Orbit · illustrative model for San Diego planning — not financial advice. Rates, taxes,
          and appreciation are editable assumptions.
        </p>
      </footer>
    </div>
  )
}
