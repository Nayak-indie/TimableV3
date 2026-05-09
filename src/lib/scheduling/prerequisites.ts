import { DayOfWeek } from '@/types'

export interface Prerequisite {
  subjectId: string
  dependsOn: string[] // List of subject IDs that must come BEFORE
}

/**
 * Curriculum Intelligence Engine
 * Manages the Directed Acyclic Graph (DAG) of subject dependencies.
 */
export class PrerequisiteEngine {
  private dependencies: Map<string, string[]> = new Map()

  constructor(prereqs: Record<string, string[]> = {}) {
    Object.entries(prereqs).forEach(([sid, deps]) => {
      this.dependencies.set(sid, deps)
    })
  }

  getPrerequisites(subjectId: string): string[] {
    return this.dependencies.get(subjectId) ?? []
  }

  /**
   * Validates if a specific assignment is semantically valid 
   * given the current weekly schedule.
   */
  validateSequence(
    subjectId: string,
    day: DayOfWeek,
    period: number,
    weeklySchedule: Array<{ subjectId: string; day: DayOfWeek; period: number }>,
    daysOrder: DayOfWeek[]
  ): { isValid: boolean; violatedSubject?: string } {
    const prereqs = this.getPrerequisites(subjectId)
    if (prereqs.length === 0) return { isValid: true }

    const dayIndex = (d: DayOfWeek) => daysOrder.indexOf(d)
    const currentAbsPeriod = dayIndex(day) * 100 + period

    for (const prereqId of prereqs) {
      // Find the LATEST instance of the prerequisite in the schedule
      const prereqInstances = weeklySchedule.filter(s => s.subjectId === prereqId)
      
      if (prereqInstances.length === 0) {
        // Prerequisite not scheduled at all!
        return { isValid: false, violatedSubject: prereqId }
      }

      // Check if ALL instances of the prerequisite are BEFORE the current assignment
      // (Or at least ONE, depending on pedagogical policy. Usually, foundational 
      // knowledge must be established before the dependent subject starts.)
      const isBefore = prereqInstances.some(p => {
        const pAbsPeriod = dayIndex(p.day) * 100 + p.period
        return pAbsPeriod < currentAbsPeriod
      })

      if (!isBefore) {
        return { isValid: false, violatedSubject: prereqId }
      }
    }

    return { isValid: true }
  }
}
