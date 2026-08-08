import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  hint?: string
  children: ReactNode
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint ? <em>{hint}</em> : null}
      </span>
      {children}
    </label>
  )
}

type MoneyInputProps = {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
}

export function MoneyInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix = '$',
  suffix,
}: MoneyInputProps) {
  return (
    <span className="money-input">
      {prefix ? <span className="affix">{prefix}</span> : null}
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {suffix ? <span className="affix suffix">{suffix}</span> : null}
    </span>
  )
}

type RangeRowProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (n: number) => string
  onChange: (n: number) => void
}

export function RangeRow({
  label,
  value,
  min,
  max,
  step = 1,
  format = (n) => String(n),
  onChange,
}: RangeRowProps) {
  return (
    <div className="range-row">
      <div className="range-head">
        <span>{label}</span>
        <strong>{format(value)}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
