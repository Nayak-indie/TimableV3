import { ExecutionTrace } from '../history/execution-history'

export interface DriftReport {
  meanDrift: number
  reliability: number // 0 to 1
  sampleSize: number
}

/**
 * Prediction Drift Observatory
 * Measures the variance between forecasted feasibility and actual execution outcomes.
 */
export class PredictionDrift {
  static calculateDrift(history: ExecutionTrace[]): DriftReport {
    if (history.length === 0) return { meanDrift: 0, reliability: 0, sampleSize: 0 }

    let totalDrift = 0
    history.forEach(trace => {
      const outcome = trace.success ? 1.0 : 0.0
      const drift = outcome - trace.forecastProbability
      totalDrift += drift
    })

    const meanDrift = totalDrift / history.length
    
    // Reliability is higher when sample size is large and drift is small
    const reliability = Math.max(0, 1 - Math.abs(meanDrift)) * (Math.min(history.length / 50, 1.0))

    return {
      meanDrift,
      reliability,
      sampleSize: history.length
    }
  }
}
