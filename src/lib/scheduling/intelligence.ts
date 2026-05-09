import { Class, Teacher, Subject, DayOfWeek } from '@/types'
import { PrerequisiteEngine } from './prerequisites'

export interface AnalysisResult {
  forecast: {
    probability: number
    bottlenecks: string[]
  }
  resourcePressure: number
  dependencyRisk: number
}

/**
 * Predictive Intelligence for scheduling feasibility.
 */
export class PredictiveAnalyzer {
  constructor(
    private teachers: Teacher[],
    private classes: Class[],
    private subjects: Subject[],
    private classSubjectMap: Record<string, string[]>,
    private prereqEngine: PrerequisiteEngine
  ) {}

  analyze(): AnalysisResult {
    const totalPeriodsNeeded = this.subjects.reduce((acc, s) => acc + (s.periods_per_week || 0), 0)
    const totalTeacherCapacity = this.teachers.reduce((acc, t) => acc + (t.max_periods_per_day * 5), 0)
    
    const pressure = totalPeriodsNeeded / (totalTeacherCapacity || 1)
    const risk = this.subjects.filter(s => this.prereqEngine.getPrerequisites(s.id).length > 0).length / (this.subjects.length || 1)

    return {
      forecast: {
        probability: pressure > 0.9 ? 0.3 : 0.8,
        bottlenecks: pressure > 0.9 ? ['Teacher capacity near limit'] : []
      },
      resourcePressure: pressure,
      dependencyRisk: risk
    }
  }
}

/**
 * Delegation Logic: OR-Tools vs Greedy Fallback
 */
export class DelegationPolicy {
  static decide(forecast: any, pressure: number, risk: number) {
    if (pressure > 0.95 || risk > 0.5) {
      return {
        mode: 'OR_TOOLS_PRIORITY',
        strategy: 'CONSTRAINED_OPTIMIZATION',
        reasoning: 'High resource pressure or complex dependencies detected.'
      }
    }
    return {
      mode: 'HYBRID_SOLVER',
      strategy: 'ADAPTIVE_GREEDY',
      reasoning: 'Moderate complexity; prioritizing speed with heuristic fallback.'
    }
  }
}

/**
 * Experiential Intelligence: Learning from past generation traces
 */
export class HistoryEngine {
  static async record(trace: any) {
    // In a real app, this would save to a Supabase 'generation_history' table
    console.log('[HISTORY_ENGINE] Trace recorded:', trace)
  }
}
