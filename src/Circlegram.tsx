import type { FlowSlice } from './finance'
import { formatMoney } from './finance'

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
  rentNet: number
  buyNet: number
  rentEquity: number
  buyEquity: number
  rentCash: number
  buyCash: number
}

export function OrbitCompare({
  months,
  rentNet,
  buyNet,
  rentEquity,
  buyEquity,
  rentCash,
  buyCash,
}: OrbitCompareProps) {
  const max = Math.max(Math.abs(rentNet), Math.abs(buyNet), 1)
  const rentR = 48 + (Math.abs(rentNet) / max) * 72
  const buyR = 48 + (Math.abs(buyNet) / max) * 72
  const size = 420
  const height = 360
  const cy = height * 0.52
  const rentCx = size * 0.28
  const buyCx = size * 0.72

  return (
    <div className="orbit-compare">
      <svg viewBox={`0 0 ${size} ${height}`} width="100%" role="img" aria-label="Rent vs buy net position">
        <defs>
          <radialGradient id="rentGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--c-sunk)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--c-sunk)" stopOpacity="0.05" />
          </radialGradient>
          <radialGradient id="buyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--c-equity)" stopOpacity="0.65" />
            <stop offset="100%" stopColor="var(--c-equity)" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        <line
          x1={rentCx}
          y1={cy}
          x2={buyCx}
          y2={cy}
          className="orbit-bridge"
        />

        <g className="orbit-node rent-node">
          <circle cx={rentCx} cy={cy} r={rentR * 1.35} fill="url(#rentGlow)" />
          <circle cx={rentCx} cy={cy} r={rentR} className="orbit-disk rent" />
          <text x={rentCx} y={cy - 10} textAnchor="middle" className="orbit-title">
            Rent
          </text>
          <text x={rentCx} y={cy + 14} textAnchor="middle" className="orbit-metric">
            {formatMoney(rentNet, true)}
          </text>
          <text x={rentCx} y={cy + rentR + 28} textAnchor="middle" className="orbit-sub">
            Cash {formatMoney(rentCash, true)} · Equity {formatMoney(rentEquity, true)}
          </text>
        </g>

        <g className="orbit-node buy-node">
          <circle cx={buyCx} cy={cy} r={buyR * 1.35} fill="url(#buyGlow)" />
          <circle cx={buyCx} cy={cy} r={buyR} className="orbit-disk buy" />
          <text x={buyCx} y={cy - 10} textAnchor="middle" className="orbit-title">
            Buy
          </text>
          <text x={buyCx} y={cy + 14} textAnchor="middle" className="orbit-metric">
            {formatMoney(buyNet, true)}
          </text>
          <text x={buyCx} y={cy + buyR + 28} textAnchor="middle" className="orbit-sub">
            Cash {formatMoney(buyCash, true)} · Equity {formatMoney(buyEquity, true)}
          </text>
        </g>

        <text x={size / 2} y={36} textAnchor="middle" className="orbit-caption">
          Net position after {months} months
        </text>
      </svg>
    </div>
  )
}
