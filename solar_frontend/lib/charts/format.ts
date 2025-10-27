/**
 * Minimal chart formatting helpers used by charts pages.
 * Kept tiny and framework-agnostic so it’s easy to test.
 */

export type SeriesPoint = { name: string; value: number }

// Format a kWh value into a human-friendly unit string
export function formatEnergyKWh(value: number): string {
	if (!Number.isFinite(value)) return '0 kWh'
	if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} GWh`
	if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)} MWh`
	return `${value.toFixed(2)} kWh`
}

// Normalize a set of points so their sum equals target (keeping ratios)
export function normalizeSeries(points: SeriesPoint[], targetTotal: number): SeriesPoint[] {
	const total = points.reduce((s, p) => s + (Number.isFinite(p.value) ? p.value : 0), 0)
	if (!Number.isFinite(targetTotal) || targetTotal <= 0 || total <= 0) return points.map(p => ({ ...p, value: 0 }))
	const factor = targetTotal / total
	return points.map(p => ({ ...p, value: +(p.value * factor).toFixed(4) }))
}

// Create an empty series with fixed labels to stabilize layouts
export function createEmptySeries(labels: string[]): SeriesPoint[] {
	return labels.map(l => ({ name: l, value: 0 }))
}

