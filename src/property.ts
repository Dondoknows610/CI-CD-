import { formatMoney, round2 } from './money'

export type PropertyType =
  | 'single_family'
  | 'condo'
  | 'townhome'
  | 'multi_family'
  | 'other'

export type PropertyCondition = 'needs_work' | 'fair' | 'good' | 'updated' | 'luxury'

export type PropertyProfile = {
  address: string
  city: string
  state: string
  zip: string
  purchasePrice: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  lotSqFt: number
  propertyType: PropertyType
  yearBuilt: number
  garageSpaces: number
  hoaMonthly: number
  condition: PropertyCondition
  renovations: string
  furnished: boolean
  notes: string
}

export type RentEstimate = {
  conservative: number
  expected: number
  optimistic: number
  factors: string[]
  compsNote: string
}

export type RentAssumption = {
  /** Software market estimate (expected) — locked reference */
  marketExpected: number
  marketConservative: number
  marketOptimistic: number
  /** User override; null means use market expected */
  manualRent: number | null
  factors: string[]
  compsNote: string
}

export function activeRent(rent: RentAssumption): number {
  return rent.manualRent ?? rent.marketExpected
}

export function isRentOverridden(rent: RentAssumption): boolean {
  return rent.manualRent !== null && rent.manualRent !== rent.marketExpected
}

const TYPE_BASE: Record<PropertyType, number> = {
  single_family: 1.08,
  condo: 1,
  townhome: 1.04,
  multi_family: 1.12,
  other: 1,
}

const CONDITION_MULT: Record<PropertyCondition, number> = {
  needs_work: 0.88,
  fair: 0.94,
  good: 1,
  updated: 1.08,
  luxury: 1.18,
}

/** Heuristic San Diego–oriented rent range from property traits (not live MLS). */
export function estimateMarketRent(property: PropertyProfile): RentEstimate {
  const beds = Math.max(0, property.bedrooms)
  const baths = Math.max(0, property.bathrooms)
  const sqft = Math.max(400, property.squareFeet)

  // Rough SD metro baseline: bed/bath + sqft component
  let base = 1450 + beds * 520 + baths * 180 + (sqft - 700) * 0.55
  base *= TYPE_BASE[property.propertyType]
  base *= CONDITION_MULT[property.condition]

  if (property.garageSpaces >= 2) base += 120
  else if (property.garageSpaces === 1) base += 60

  if (property.furnished) base += 350
  if (property.hoaMonthly > 400) base += 40 // amenities proxy
  if (property.yearBuilt >= 2015) base += 80
  else if (property.yearBuilt < 1980) base -= 60

  // Mild zip/city nudge for San Diego coastal vs inland
  const zip = property.zip.trim()
  if (/^92(10|107|108|109|111)/.test(zip) || /pacific|la jolla|point loma/i.test(property.address)) {
    base *= 1.12
  } else if (/^92(1[0-9]|2[0-9])/.test(zip) || /san diego/i.test(property.city)) {
    base *= 1.05
  }

  const expected = round2(Math.round(base / 25) * 25)
  const conservative = round2(Math.round((expected * 0.9) / 25) * 25)
  const optimistic = round2(Math.round((expected * 1.12) / 25) * 25)

  const factors = [
    `${property.city || 'Local'} market baseline`,
    `${beds} bed / ${baths} bath`,
    `${sqft.toLocaleString()} sq ft`,
    propertyLabel(property.propertyType),
    `${conditionLabel(property.condition)} condition`,
    property.garageSpaces > 0 ? `${property.garageSpaces}-car parking` : 'Limited parking',
    property.furnished ? 'Furnished premium' : 'Unfurnished',
    property.hoaMonthly > 0 ? `HOA $${property.hoaMonthly}/mo (amenities proxy)` : 'No HOA',
  ]

  const compsNote = `Modeled range ${formatMoney(conservative)}–${formatMoney(optimistic)} from property traits and San Diego–style comps heuristics — not live listings. Override anytime.`

  return { conservative, expected, optimistic, factors, compsNote }
}

export function buildRentAssumption(property: PropertyProfile, manualRent: number | null = null): RentAssumption {
  const est = estimateMarketRent(property)
  return {
    marketExpected: est.expected,
    marketConservative: est.conservative,
    marketOptimistic: est.optimistic,
    manualRent,
    factors: est.factors,
    compsNote: est.compsNote,
  }
}

export function propertyLabel(t: PropertyType): string {
  switch (t) {
    case 'single_family':
      return 'Single family'
    case 'condo':
      return 'Condo'
    case 'townhome':
      return 'Townhome'
    case 'multi_family':
      return 'Multi-family'
    default:
      return 'Other'
  }
}

export function conditionLabel(c: PropertyCondition): string {
  switch (c) {
    case 'needs_work':
      return 'Needs work'
    case 'fair':
      return 'Fair'
    case 'good':
      return 'Good'
    case 'updated':
      return 'Updated'
    case 'luxury':
      return 'Luxury'
  }
}

export const DEFAULT_PROPERTY: PropertyProfile = {
  address: 'Sample condo near campus / military corridor',
  city: 'San Diego',
  state: 'CA',
  zip: '92108',
  purchasePrice: 650000,
  bedrooms: 2,
  bathrooms: 2,
  squareFeet: 1050,
  lotSqFt: 0,
  propertyType: 'condo',
  yearBuilt: 2008,
  garageSpaces: 1,
  hoaMonthly: 350,
  condition: 'good',
  renovations: 'Fresh paint, updated appliances',
  furnished: false,
  notes: 'VA purchase candidate — model occupancy then exit options',
}
