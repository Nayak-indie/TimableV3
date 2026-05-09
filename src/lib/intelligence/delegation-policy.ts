import { FeasibilityForecast } from './predictive-analysis'
import { PressureScore } from './constraint-pressure'
import { DependencyRisk } from './dependency-risk'

export type ExecutionMode = 
  | 'PRECISION'        // High feasibility -> Full OR-Tools
  | 'HYBRID'           // Moderate risk -> Heuristic + OR-Tools
  | 'RELAXATION'       // Likely infeasible -> Relaxed constraints
  | 'EMERGENCY_DRAFT'  // High pressure -> Heuristic only
  | 'STAGED'           // High dependency depth -> Sequential solving

export interface DelegationDecision {
  mode: ExecutionMode
  reasoning: string
  strategy: string
}

/**
 * Computational Policy & Execution Governance
 * The orchestration brain that determines how a scheduling problem is solved.
 */
export class DelegationPolicy {
  static decide(
    forecast: FeasibilityForecast,
    pressure: PressureScore[],
    risks: DependencyRisk[]
  ): DelegationDecision {
    const avgPressure = pressure.reduce((acc, p) => acc + p.score, 0) / (pressure.length || 1)
    const maxRisk = Math.max(...risks.map(r => r.score), 0)
    const maxDepth = Math.max(...risks.map(r => r.chainDepth), 0)

    // 1. Emergency Draft Mode (Extreme Pressure / Low Feasibility)
    if (forecast.probability < 0.3 || avgPressure > 0.9) {
      return {
        mode: 'EMERGENCY_DRAFT',
        reasoning: `Feasibility critical (${Math.round(forecast.probability * 100)}%). Pressure extreme (${Math.round(avgPressure * 100)}%).`,
        strategy: 'Bypassing expensive optimization. Generating rapid heuristic draft to ensure system continuity.'
      }
    }

    // 2. Staged Dependency Mode (High Prerequisite Depth)
    if (maxDepth > 3 || maxRisk > 0.8) {
      return {
        mode: 'STAGED',
        reasoning: `Complex curriculum DAG detected (Depth: ${maxDepth}). High risk dependency nodes present.`,
        strategy: 'Executing staged optimization. Foundation subjects prioritized before dependent layers.'
      }
    }

    // 3. Relaxation Mode (Moderate Infeasibility Risk)
    if (forecast.status === 'risky') {
      return {
        mode: 'RELAXATION',
        reasoning: 'Solver feasibility is uncertain. Resource saturation detected in critical nodes.',
        strategy: 'Attempting optimization with progressive constraint relaxation (softening teacher caps).'
      }
    }

    // 4. Hybrid Mode (Moderate Pressure)
    if (avgPressure > 0.6) {
      return {
        mode: 'HYBRID',
        reasoning: 'Moderate resource pressure. Efficiency optimization required.',
        strategy: 'Using heuristic seeding to warm-start the OR-Tools solver for faster convergence.'
      }
    }

    // 5. Precision Mode (Ideal Conditions)
    return {
      mode: 'PRECISION',
      reasoning: 'High feasibility. Stable resource and dependency profiles.',
      strategy: 'Executing full global optimization for maximum pedagogical and resource efficiency.'
    }
  }
}
