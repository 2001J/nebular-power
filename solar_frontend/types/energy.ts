export type Bucket = 'minute' | 'hour' | 'day' | 'month'

export interface AggregatedSeriesPoint {
  bucketStart: string
  avgGenerationWatts: number
  avgConsumptionWatts: number
  generationKWh: number
  consumptionKWh: number
  powerUnit?: string
  energyUnit?: string
}

export interface SystemSeriesPoint extends AggregatedSeriesPoint {
  generationByTypeKWh?: Record<string, number>
  consumptionByTypeKWh?: Record<string, number>
}

