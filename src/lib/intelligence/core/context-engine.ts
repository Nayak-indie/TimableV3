import { ExecutionMode } from '../delegation-policy'
import { FeasibilityForecast } from '../predictive-analysis'
import { PressureScore } from '../constraint-pressure'
import { DependencyRisk } from '../dependency-risk'
import { DriftReport } from '../calibration/prediction-drift'

/**
 * Unified Intelligence Context
 * The single source of truth for the system's reasoning state.
 */
export interface IntelligenceContext {
  feasibility: FeasibilityForecast
  pressure: PressureScore[]
  dependencyRisk: DependencyRisk[]
  calibration: {
    calibratedProbability: number
    confidence: number
    drift: DriftReport
  }
  routing: {
    mode: ExecutionMode
    reasoning: string
    strategy: string
  }
  timestamp: string
}

/**
 * Context Engine
 * Orchestrates the creation and propagation of intelligence signals.
 */
export class ContextEngine {
  static synthesize(
    feasibility: FeasibilityForecast,
    pressure: PressureScore[],
    dependencyRisk: DependencyRisk[],
    calibration: { calibratedProbability: number; confidence: number; drift: DriftReport },
    routing: { mode: ExecutionMode; reasoning: string; strategy: string }
  ): IntelligenceContext {
    return {
      feasibility,
      pressure,
      dependencyRisk,
      calibration,
      routing,
      timestamp: new Date().toISOString()
    }
  }
}
