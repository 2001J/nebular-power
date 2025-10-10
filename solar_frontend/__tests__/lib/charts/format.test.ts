import { describe, expect, test } from 'vitest'
import { createEmptySeries, formatEnergyKWh, normalizeSeries } from '@/lib/charts/format'

describe('charts/format', () => {
  test('formatEnergyKWh formats units', () => {
    expect(formatEnergyKWh(0)).toBe('0.00 kWh')
    expect(formatEnergyKWh(1500)).toBe('1.50 MWh')
    expect(formatEnergyKWh(2_500_000)).toBe('2.50 GWh')
  })

  test('normalizeSeries scales to target total', () => {
    const pts = [
      { name: 'A', value: 1 },
      { name: 'B', value: 3 },
    ]
    const out = normalizeSeries(pts, 40)
    const total = out.reduce((s, p) => s + p.value, 0)
    expect(total).toBeCloseTo(40, 5)
    // ratio preserved: A:B ~ 1:3
    expect(out[0].value).toBeCloseTo(10, 4)
    expect(out[1].value).toBeCloseTo(30, 4)
  })

  test('createEmptySeries returns zeros', () => {
    expect(createEmptySeries(['x','y'])).toEqual([
      { name: 'x', value: 0 },
      { name: 'y', value: 0 },
    ])
  })
})
