import { Teacher, Subject, Class } from '@/types'
import { analyzeResourcePressure, PressureScore } from './constraint-pressure'
import { analyzeDependencyRisk, DependencyRisk } from './dependency-risk'
import { PrerequisiteEngine } from '../scheduling/prerequisites'

export interface FeasibilityForecast {
  probability: number // 0.0 to 1.0
  status: 'optimal' | 'feasible' | 'risky' | 'infeasible'
  bottlenecks: string[]
  recommendations: string[]
}

/**
 * Predictive Intelligence Orchestrator
 * Analyzes the entire school ecosystem to forecast scheduling success.
 */
export class PredictiveAnalyzer {
  constructor(
    private teachers: Teacher[],
    private classes: Class[],
    private subjects: Subject[],
    private classSubjectLinks: Record<string, string[]>,
    private prereqEngine: PrerequisiteEngine
  ) {}

  analyze(): {
    resourcePressure: PressureScore[]
    dependencyRisk: DependencyRisk[]
    forecast: FeasibilityForecast
  } {
    const resourcePressure = analyzeResourcePressure(
      this.teachers, 
      this.classes, 
      this.subjects, 
      this.classSubjectLinks
    )
    
    const dependencyRisk = analyzeDependencyRisk(
      this.subjects, 
      this.prereqEngine
    )

    const forecast = this.calculateForecast(resourcePressure, dependencyRisk)

    return { resourcePressure, dependencyRisk, forecast }
  }

  private calculateForecast(pressure: PressureScore[], risks: DependencyRisk[]): FeasibilityForecast {
    const criticalPressure = pressure.filter(p => p.severity === 'critical')
    const highRiskDependencies = risks.filter(r => r.riskLevel === 'critical')

    let probability = 1.0
    const bottlenecks: string[] = []
    const recommendations: string[] = []

    // Adjust probability based on pressure
    criticalPressure.forEach(p => {
      probability -= 0.15
      bottlenecks.push(`Saturation at node ${p.id}`)
    })

    // Adjust based on dependencies
    highRiskDependencies.forEach(r => {
      probability -= 0.1
      bottlenecks.push(`Heavy dependency chain starting at subject ${r.id}`)
    })

    probability = Math.max(0.1, probability)

    let status: FeasibilityForecast['status'] = 'optimal'
    if (probability < 0.3) status = 'infeasible'
    else if (probability < 0.6) status = 'risky'
    else if (probability < 0.9) status = 'feasible'

    if (status === 'risky' || status === 'infeasible') {
      recommendations.push('Consider relaxing teacher daily caps.')
      recommendations.push('Review curriculum sequencing for high-risk subjects.')
      recommendations.push('Verify if additional teachers can be assigned to bottleneck subjects.')
    }

    return { probability, status, bottlenecks, recommendations }
  }
}
