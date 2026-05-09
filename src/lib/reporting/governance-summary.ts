import { IntelligenceContext } from '../intelligence/core/context-engine'

/**
 * Institutional Intelligence Reporting
 * Translates low-level orchestration signals into leadership-grade governance insights.
 */
export class InstitutionalReporter {
  static generateGovernanceSummary(context: IntelligenceContext): {
    institutionalRiskScore: number
    topBottlenecks: string[]
    strategicInsights: string[]
  } {
    const riskScore = 1 - context.calibration.calibratedProbability
    
    const topBottlenecks = context.pressure
      .filter(p => p.score > 0.8)
      .map(p => `Saturation at ${p.id} (${Math.round(p.score * 100)}%)`)

    const insights: string[] = []
    if (riskScore > 0.5) {
      insights.push('Structural instability detected in current semester configuration.')
      insights.push('High dependency on specific staff members creates single points of failure.')
    } else {
      insights.push('Institutional resilience is high. Stable scheduling expected.')
    }

    if (context.calibration.confidence < 0.4) {
      insights.push('Report reliability is LOW due to high forecast drift. More execution cycles needed.')
    }

    return {
      institutionalRiskScore: riskScore,
      topBottlenecks,
      strategicInsights: insights
    }
  }
}
