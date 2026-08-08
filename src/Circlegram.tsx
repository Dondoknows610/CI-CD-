import type { FlowSlice } from './types'
import { formatMoney } from './money'

const KIND_COLORS: Record<FlowSlice['kind'], string> = {
  income: 'var(--c-income)',
  housing: 'var(--c-housing)',
  equity: 'var(--c-equity)',
  expense: 'var(--c-expense)',
  cash: 'var(--c-cash)',
  sunk: 'var(--c-sunk)',
}

type Arc = {
  slice: FlowSlice
  start: number
  end: number
  color: string
}

function toArcs(slices: FlowSlice[], gap = 0.04): Arc[] {
  const total = slices.reduce((s, x) => s + Math.max(0, x.amount), 0)
  if (total <= 0) return []
  const usable = Math.PI * 2 - gap * slices.length
  let angle = -Math.PI / 2
  return slices
    .filter((s) => s.amount > 0)
    .map((slice) => {
      const sweep = (slice.amount / total) * usable
      const arc: Arc = {
        slice,
        start: angle,
        end: angle + sweep,
        color: KIND_COLORS[slice.kind],
      }
      angle += sweep + gap
      return arc
    })
}

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function donutPath(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  start: number,
  end: number,
): string {
  const large = end - start > Math.PI ? 1 : 0
  const o1 = polar(cx, cy, outer, start)
  const o2 = polar(cx, cy, outer, end)
  const i1 = polar(cx, cy, inner, end)
  const i2 = polar(cx, cy, inner, start)
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ')
}

type CirclegramProps = {
  title: string
  subtitle?: string
  slices: FlowSlice[]
  centerValue: string
  centerLabel: string
  size?: number
  animateKey?: string | number
}

export function Circlegram({
  title,
  subtitle,
  slices,
  centerValue,
  centerLabel,
  size = 320,
  animateKey,
}: CirclegramProps) {
  const cx = size / 2
  const cy = size / 2
  const outer = size * 0.42
  const inner = size * 0.26
  const arcs = toArcs(slices)

  return (
    <figure className="circlegram" data-key={animateKey}>
      <figcaption>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </figcaption>
      <div className="circlegram-stage">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          role="img"
          aria-label={`${title}: ${centerValue}`}
        >
          <defs>
            <filter id={`soft-${title.replace(/\s/g, '')}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.18" />
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={outer + 8} className="circlegram-halo" />
          <g className="circlegram-rings" filter={`url(#soft-${title.replace(/\s/g, '')})`}>
            {arcs.map((arc, i) => (
              <path
                key={arc.slice.id}
                d={donutPath(cx, cy, inner, outer, arc.start, arc.end)}
                fill={arc.color}
                className="circlegram-arc"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <title>
                  {arc.slice.label}: {formatMoney(arc.slice.amount)}
                </title>
              </path>
            ))}
          </g>
          <circle cx={cx} cy={cy} r={inner - 4} className="circlegram-core" />
          <text x={cx} y={cy - 8} textAnchor="middle" className="circlegram-value">
            {centerValue}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" className="circlegram-label">
            {centerLabel}
          </text>
        </svg>
        <ul className="circlegram-legend">
          {slices
            .filter((s) => s.amount > 0)
            .map((s) => (
              <li key={s.id}>
                <span className="swatch" style={{ background: KIND_COLORS[s.kind] }} />
                <span className="legend-label">{s.label}</span>
                <span className="legend-amt">{formatMoney(s.amount, true)}</span>
              </li>
            ))}
        </ul>
      </div>
    </figure>
  )
}

type OrbitCompareProps = {
  months: number
  leftLabel?: string
  rightLabel?: string
  leftNet: number
  rightNet: number
  leftEquity: number
  rightEquity: number
  leftCash: number
  rightCash: number
  caption?: string
}

export function OrbitCompare({
  months,
  leftLabel = 'Left',
  rightLabel = 'Right',
  leftNet,
  rightNet,
  leftEquity,
  rightEquity,
  leftCash,
  rightCash,
  caption,
}: OrbitCompareProps) {
  const max = Math.max(Math.abs(leftNet), Math.abs(rightNet), 1)
  const leftR = 48 + (Math.abs(leftNet) / max) * 72
  const rightR = 48 + (Math.abs(rightNet) / max) * 72
  const size = 420
  const height = 360
  const cy = height * 0.52
  const leftCx = size * 0.28
  const rightCx = size * 0.72

  return (
    <div className="orbit-compare">
      <svg
        viewBox={`0 0 ${size} ${height}`}
        width="100%"
        role="img"
        aria-label={`${leftLabel} vs ${rightLabel}`}
      >
        <defs>
          <radialGradient id="leftGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--c-income)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--c-income)" stopOpacity="0.05" />
          </radialGradient>
          <radialGradient id="rightGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--c-equity)" stopOpacity="0.65" />
            <stop offset="100%" stopColor="var(--c-equity)" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        <line x1={leftCx} y1={cy} x2={rightCx} y2={cy} className="orbit-bridge" />

        <g className="orbit-node rent-node">
          <circle cx={leftCx} cy={cy} r={leftR * 1.35} fill="url(#leftGlow)" />
          <circle cx={leftCx} cy={cy} r={leftR} className="orbit-disk rent" />
          <text x={leftCx} y={cy - 10} textAnchor="middle" className="orbit-title">
            {leftLabel}
          </text>
          <text x={leftCx} y={cy + 14} textAnchor="middle" className="orbit-metric">
            {formatMoney(leftNet, true)}
          </text>
          <text x={leftCx} y={cy + leftR + 28} textAnchor="middle" className="orbit-sub">
            Cash {formatMoney(leftCash, true)} · Equity {formatMoney(leftEquity, true)}
          </text>
        </g>

        <g className="orbit-node buy-node">
          <circle cx={rightCx} cy={cy} r={rightR * 1.35} fill="url(#rightGlow)" />
          <circle cx={rightCx} cy={cy} r={rightR} className="orbit-disk buy" />
          <text x={rightCx} y={cy - 10} textAnchor="middle" className="orbit-title">
            {rightLabel}
          </text>
          <text x={rightCx} y={cy + 14} textAnchor="middle" className="orbit-metric">
            {formatMoney(rightNet, true)}
          </text>
          <text x={rightCx} y={cy + rightR + 28} textAnchor="middle" className="orbit-sub">
            Cash {formatMoney(rightCash, true)} · Equity {formatMoney(rightEquity, true)}
          </text>
        </g>

        <text x={size / 2} y={36} textAnchor="middle" className="orbit-caption">
          {caption ?? `Comparison after ${months} months`}
        </text>
      </svg>
    </div>
  )
}
