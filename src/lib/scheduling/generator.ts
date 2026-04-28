import type { Class, DayOfWeek, Subject, Teacher, TimetableEntry } from '@/types'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

interface GenerateInput {
  termId: string
  classes: Class[]
  teachers: Teacher[]
  subjects: Subject[]
  periodsPerDay: number
}

export function generateTimetable(input: GenerateInput): TimetableEntry[] {
  const { termId, classes, teachers, subjects, periodsPerDay } = input
  const entries: TimetableEntry[] = []
  const teacherLoad: Record<string, Record<DayOfWeek, number>> = {}

  teachers.forEach((teacher) => {
    teacherLoad[teacher.id] = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 }
  })

  const classSlotsTaken = new Set<string>()
  const teacherSlotsTaken = new Set<string>()

  for (const cls of classes) {
    const schedule: { subjectId: string; teacherId: string }[] = []

    for (const subject of subjects) {
      if (!subject.teacher_ids.length) continue
      for (let i = 0; i < subject.periods_per_week; i += 1) {
        const availableTeachers = teachers.filter(
          (teacher) => subject.teacher_ids.includes(teacher.id) && teacher.status === 'active'
        )
        const selectedTeacher = availableTeachers.sort((a, b) => {
          const loadA = Object.values(teacherLoad[a.id]).reduce((sum, value) => sum + value, 0)
          const loadB = Object.values(teacherLoad[b.id]).reduce((sum, value) => sum + value, 0)
          return loadA - loadB
        })[0]

        if (selectedTeacher) {
          schedule.push({ subjectId: subject.id, teacherId: selectedTeacher.id })
        }
      }
    }

    for (const item of schedule) {
      let placed = false

      for (const day of DAYS) {
        if (placed) break
        for (let period = 1; period <= periodsPerDay; period += 1) {
          const classKey = `${cls.id}-${day}-${period}`
          const teacherKey = `${item.teacherId}-${day}-${period}`

          if (classSlotsTaken.has(classKey) || teacherSlotsTaken.has(teacherKey)) continue

          const teacher = teachers.find((value) => value.id === item.teacherId)
          if (!teacher || teacherLoad[item.teacherId][day] >= teacher.max_periods_per_day) continue

          const available = teacher.availability?.[day]
          if (available && available.length > 0 && !available.includes(period)) continue

          entries.push({
            id: crypto.randomUUID(),
            term_id: termId,
            class_id: cls.id,
            teacher_id: item.teacherId,
            subject_id: item.subjectId,
            day,
            period_number: period,
            is_override: false,
            created_at: new Date().toISOString(),
          })

          classSlotsTaken.add(classKey)
          teacherSlotsTaken.add(teacherKey)
          teacherLoad[item.teacherId][day] += 1
          placed = true
          break
        }
      }
    }
  }

  return entries
}
