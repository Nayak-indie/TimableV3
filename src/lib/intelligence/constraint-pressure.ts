import { Teacher, Subject, Class } from '@/types'

export interface PressureScore {
  id: string
  score: number // 0.0 to 1.0
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Resource Constraint Pressure Analysis
 * Analyzes the saturation level of teachers and classes.
 */
export function analyzeResourcePressure(
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[],
  classSubjectLinks: Record<string, string[]>
): PressureScore[] {
  const scores: PressureScore[] = []

  // 1. Teacher Saturation
  teachers.forEach(teacher => {
    // Total periods assigned to this teacher across all subjects they teach
    let totalAssignedPeriods = 0
    subjects.forEach(s => {
      if (s.teacher_ids.includes(teacher.id)) {
        // Find how many classes take this subject
        const classesTakingSubject = classes.filter(c => 
          classSubjectLinks[c.id]?.includes(s.id)
        )
        totalAssignedPeriods += s.periods_per_week * classesTakingSubject.length
      }
    })

    const totalAvailableSlots = (teacher.max_periods_per_day || 6) * 5 // 5 days
    const pressure = totalAssignedPeriods / totalAvailableSlots
    
    let severity: PressureScore['severity'] = 'low'
    if (pressure > 0.95) severity = 'critical'
    else if (pressure > 0.85) severity = 'high'
    else if (pressure > 0.70) severity = 'medium'

    scores.push({
      id: teacher.id,
      score: Math.min(pressure, 1.0),
      reason: `Teacher Load: ${totalAssignedPeriods}/${totalAvailableSlots} slots utilized.`,
      severity
    })
  })

  // 2. Class Saturation
  classes.forEach(cls => {
    let totalPeriodsRequired = 0
    const subjectIds = classSubjectLinks[cls.id] || []
    subjectIds.forEach(sid => {
      const sub = subjects.find(s => s.id === sid)
      if (sub) totalPeriodsRequired += sub.periods_per_week
    })

    const classCapacity = (cls.periods_per_day || 6) * 5
    const pressure = totalPeriodsRequired / classCapacity

    let severity: PressureScore['severity'] = 'low'
    if (pressure > 1.0) severity = 'critical'
    else if (pressure > 0.9) severity = 'high'

    scores.push({
      id: cls.id,
      score: Math.min(pressure, 1.0),
      reason: `Class Schedule: ${totalPeriodsRequired}/${classCapacity} slots filled.`,
      severity
    })
  })

  return scores
}
