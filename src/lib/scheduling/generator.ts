import type { Class, DayOfWeek, Subject, Teacher, TimetableEntry } from '@/types'

const DEFAULT_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

interface GenerateInput {
  termId: string
  classes: Class[]
  teachers: Teacher[]
  subjects: Subject[]
  periodsPerDay: number
  lessonSlotNumbers?: number[]
  workingDays?: DayOfWeek[]
  classSubjectMap?: Record<string, string[]>
}

interface Candidate {
  classId: string
  subjectId: string
  teacherId: string
  score: number
}

function createDayLoadMap(days: DayOfWeek[]) {
  return days.reduce<Record<DayOfWeek, number>>((acc, day) => {
    acc[day] = 0
    return acc
  }, { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 })
}

function sortUnique(ids: string[]) {
  return Array.from(new Set(ids))
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function getWorkingDays(input?: DayOfWeek[]) {
  return input && input.length > 0 ? input : DEFAULT_DAYS
}

function getLessonSlotNumbers(input: number[] | undefined, periodsPerDay: number) {
  if (Array.isArray(input) && input.length > 0) {
    return [...input].sort((a, b) => a - b)
  }
  return Array.from({ length: periodsPerDay }, (_, index) => index + 1)
}

function buildSubjectPools(classes: Class[], subjects: Subject[], classSubjectMap?: Record<string, string[]>) {
  const allSubjectIds = subjects.map((subject) => subject.id)
  return new Map(
    classes.map((cls) => [
      cls.id,
      sortUnique((classSubjectMap?.[cls.id] ?? allSubjectIds).filter((subjectId) => allSubjectIds.includes(subjectId))),
    ])
  )
}

function buildTeacherPools(subjects: Subject[], teachers: Teacher[]) {
  const teachersById = new Map(teachers.map((teacher) => [teacher.id, teacher]))

  return new Map(
    subjects.map((subject) => {
      const teacherIds = new Set<string>()

      subject.teacher_ids.forEach((teacherId) => {
        if (teachersById.has(teacherId)) teacherIds.add(teacherId)
      })

      teachers.forEach((teacher) => {
        if (teacher.subjects.includes(subject.id)) teacherIds.add(teacher.id)
      })

      return [subject.id, Array.from(teacherIds).map((teacherId) => teachersById.get(teacherId)!).filter(Boolean)]
    })
  )
}

function buildRequirementCounts(classSubjects: string[], subjectsById: Map<string, Subject>, totalSlots: number) {
  const counts = new Map<string, number>()
  const coreIds: string[] = []
  const electiveIds: string[] = []

  classSubjects.forEach((subjectId) => {
    const subject = subjectsById.get(subjectId)
    if (!subject) return
    counts.set(subjectId, Math.max(0, subject.periods_per_week))
    if (subject.category === 'core') coreIds.push(subjectId)
    else electiveIds.push(subjectId)
  })

  const subjectOrder = [
    ...coreIds.sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0) || (subjectsById.get(a)?.periods_per_week ?? 0) - (subjectsById.get(b)?.periods_per_week ?? 0)),
    ...electiveIds.sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0) || (subjectsById.get(a)?.periods_per_week ?? 0) - (subjectsById.get(b)?.periods_per_week ?? 0)),
  ]

  const currentTotal = sum(Array.from(counts.values()))
  if (currentTotal < totalSlots) {
    let remaining = totalSlots - currentTotal
    while (remaining > 0) {
      let progressed = false
      for (const subjectId of subjectOrder) {
        if (remaining <= 0) break
        counts.set(subjectId, (counts.get(subjectId) ?? 0) + 1)
        remaining -= 1
        progressed = true
      }
      if (!progressed) break
    }
  } else if (currentTotal > totalSlots) {
    let overflow = currentTotal - totalSlots
    const reductionOrder = [
      ...electiveIds.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)),
      ...coreIds.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)),
    ]

    while (overflow > 0) {
      const candidate = reductionOrder.find((subjectId) => (counts.get(subjectId) ?? 0) > 1) ?? reductionOrder.find((subjectId) => (counts.get(subjectId) ?? 0) > 0)
      if (!candidate) break
      counts.set(candidate, Math.max(0, (counts.get(candidate) ?? 0) - 1))
      overflow -= 1
    }
  }

  return counts
}

function scoreCandidate(params: {
  subject: Subject
  teacher: Teacher
  classId: string
  day: DayOfWeek
  remaining: number
  classDayUsage: Map<string, Map<DayOfWeek, Map<string, number>>>
  classTotalUsage: Map<string, Map<string, number>>
  teacherDayLoad: Record<string, Record<DayOfWeek, number>>
  teacherTotalLoad: Record<string, number>
  classLastSubject: Map<string, string | null>
}) {
  const {
    subject,
    teacher,
    classId,
    day,
    remaining,
    classDayUsage,
    classTotalUsage,
    teacherDayLoad,
    teacherTotalLoad,
    classLastSubject,
  } = params

  const dayUsage = classDayUsage.get(classId)?.get(day)?.get(subject.id) ?? 0
  const totalUsage = classTotalUsage.get(classId)?.get(subject.id) ?? 0
  const lastSubject = classLastSubject.get(classId)

  const coreBonus = subject.category === 'core' ? -18 : 12
  const remainingBonus = remaining > 0 ? -remaining * 6 : 18
  const repeatPenalty = dayUsage > 0 ? dayUsage * 18 : 0
  const totalRepeatPenalty = totalUsage * 3
  const lastSubjectPenalty = lastSubject === subject.id ? 24 : 0
  const teacherLoadPenalty = (teacherTotalLoad[teacher.id] ?? 0) * 3 + (teacherDayLoad[teacher.id]?.[day] ?? 0) * 8
  const singletonPenalty = teacher.subjects.length <= 1 ? 4 : 0

  return coreBonus + remainingBonus + repeatPenalty + totalRepeatPenalty + lastSubjectPenalty + teacherLoadPenalty + singletonPenalty
}

function buildCandidates(params: {
  classId: string
  day: DayOfWeek
  periodIndex: number
  classSubjectIds: string[]
  subjectsById: Map<string, Subject>
  teacherPools: Map<string, Teacher[]>
  remaining: Map<string, Map<string, number>>
  classDayUsage: Map<string, Map<DayOfWeek, Map<string, number>>>
  classTotalUsage: Map<string, Map<string, number>>
  classLastSubject: Map<string, string | null>
  teacherDayLoad: Record<string, Record<DayOfWeek, number>>
  teacherTotalLoad: Record<string, number>
  teacherBusyThisSlot: Set<string>
  teachers: Teacher[]
  allowOverflow?: boolean
  ignoreAvailability?: boolean
  ignoreDailyLoad?: boolean
}) {
  const {
    classId,
    day,
    periodIndex,
    classSubjectIds,
    subjectsById,
    teacherPools,
    remaining,
    classDayUsage,
    classTotalUsage,
    classLastSubject,
    teacherDayLoad,
    teacherTotalLoad,
    teacherBusyThisSlot,
    teachers,
    allowOverflow = false,
    ignoreAvailability = false,
    ignoreDailyLoad = false,
  } = params

  const remainingForClass = remaining.get(classId)
  if (!remainingForClass) return []

  const candidates: Candidate[] = []

  for (const subjectId of classSubjectIds) {
    const subject = subjectsById.get(subjectId)
    if (!subject) continue
    const remainingCount = remainingForClass.get(subjectId) ?? 0
    if (!allowOverflow && remainingCount <= 0) continue

    const teachersForSubject = teacherPools.get(subjectId) ?? []
    for (const teacher of teachersForSubject) {
      if (teacher.status !== 'active') continue
      if (teacherBusyThisSlot.has(teacher.id)) continue
      const dayAvailability = teacher.availability?.[day]
      const isAvailable = !(Array.isArray(dayAvailability) && dayAvailability.length > 0 && !dayAvailability.includes(periodIndex))
      const withinDailyLoad = (teacherDayLoad[teacher.id]?.[day] ?? 0) < teacher.max_periods_per_day
      if (!ignoreAvailability && !isAvailable) continue
      if (!ignoreDailyLoad && !withinDailyLoad) continue
      if (!teachers.find((item) => item.id === teacher.id)) continue

      const availabilityPenalty = !isAvailable ? 36 : 0
      const dailyLoadPenalty = !withinDailyLoad ? ((teacherDayLoad[teacher.id]?.[day] ?? 0) - teacher.max_periods_per_day + 1) * 18 : 0

      candidates.push({
        classId,
        subjectId,
        teacherId: teacher.id,
        score: scoreCandidate({
          subject,
          teacher,
          classId,
          day,
          remaining: Math.max(remainingCount, 0),
          classDayUsage,
          classTotalUsage,
          teacherDayLoad,
          teacherTotalLoad,
          classLastSubject,
        }) + availabilityPenalty + dailyLoadPenalty,
      })
    }
  }

  return candidates.sort((a, b) => a.score - b.score)
}

function recordUsage(params: {
  classId: string
  subjectId: string
  teacherId: string
  day: DayOfWeek
  remaining: Map<string, Map<string, number>>
  classDayUsage: Map<string, Map<DayOfWeek, Map<string, number>>>
  classTotalUsage: Map<string, Map<string, number>>
  classLastSubject: Map<string, string | null>
  teacherDayLoad: Record<string, Record<DayOfWeek, number>>
  teacherTotalLoad: Record<string, number>
}) {
  const {
    classId,
    subjectId,
    teacherId,
    day,
    remaining,
    classDayUsage,
    classTotalUsage,
    classLastSubject,
    teacherDayLoad,
    teacherTotalLoad,
  } = params

  const classRemaining = remaining.get(classId)
  if (classRemaining) {
    classRemaining.set(subjectId, Math.max(0, (classRemaining.get(subjectId) ?? 0) - 1))
  }

  const classDay = classDayUsage.get(classId)
  if (classDay) {
    const dayUsage = classDay.get(day)
    if (dayUsage) dayUsage.set(subjectId, (dayUsage.get(subjectId) ?? 0) + 1)
  }

  const totalUsage = classTotalUsage.get(classId)
  if (totalUsage) {
    totalUsage.set(subjectId, (totalUsage.get(subjectId) ?? 0) + 1)
  }

  classLastSubject.set(classId, subjectId)
  teacherDayLoad[teacherId][day] += 1
  teacherTotalLoad[teacherId] += 1
}

function pickSubjectForTeacher(params: {
  classId: string
  teacher: Teacher
  day: DayOfWeek
  subjectsById: Map<string, Subject>
  classSubjectIds: string[]
  remaining: Map<string, Map<string, number>>
  classDayUsage: Map<string, Map<DayOfWeek, Map<string, number>>>
  classTotalUsage: Map<string, Map<string, number>>
  classLastSubject: Map<string, string | null>
  teacherDayLoad: Record<string, Record<DayOfWeek, number>>
  teacherTotalLoad: Record<string, number>
  allowOverflow?: boolean
}) {
  const {
    classId,
    teacher,
    day,
    subjectsById,
    classSubjectIds,
    remaining,
    classDayUsage,
    classTotalUsage,
    classLastSubject,
    teacherDayLoad,
    teacherTotalLoad,
    allowOverflow = false,
  } = params

  const classRemaining = remaining.get(classId)
  if (!classRemaining) return null

  const options = classSubjectIds
    .map((subjectId) => {
      const subject = subjectsById.get(subjectId)
      if (!subject) return null
      const remainingCount = classRemaining.get(subjectId) ?? 0
      if (!allowOverflow && remainingCount <= 0) return null
      const teacherCanTeach = subject.teacher_ids.includes(teacher.id) || teacher.subjects.includes(subjectId)
      if (!teacherCanTeach) return null
      return {
        subject,
        remainingCount,
        score:
          (subject.category === 'core' ? -18 : 12) +
          (remainingCount > 0 ? -remainingCount * 6 : 18) +
          ((classDayUsage.get(classId)?.get(day)?.get(subjectId) ?? 0) > 0 ? 18 : 0) +
          ((classTotalUsage.get(classId)?.get(subjectId) ?? 0) * 3) +
          ((classLastSubject.get(classId) === subjectId) ? 24 : 0) +
          ((teacherTotalLoad[teacher.id] ?? 0) * 3) +
          ((teacherDayLoad[teacher.id]?.[day] ?? 0) * 8),
      }
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .sort((a, b) => a.score - b.score)

  return options[0] ?? null
}

function maximizeMatching(classIds: string[], edges: Map<string, string[]>) {
  const teacherToClass = new Map<string, string>()

  const findMatch = (classId: string, seen: Set<string>): boolean => {
    for (const teacherId of edges.get(classId) ?? []) {
      if (seen.has(teacherId)) continue
      seen.add(teacherId)
      const matchedClass = teacherToClass.get(teacherId)
      if (!matchedClass || findMatch(matchedClass, seen)) {
        teacherToClass.set(teacherId, classId)
        return true
      }
    }
    return false
  }

  const orderedClassIds = [...classIds].sort((a, b) => (edges.get(a)?.length ?? 0) - (edges.get(b)?.length ?? 0))
  orderedClassIds.forEach((classId) => {
    findMatch(classId, new Set<string>())
  })

  const classToTeacher = new Map<string, string>()
  teacherToClass.forEach((classId, teacherId) => {
    classToTeacher.set(classId, teacherId)
  })
  return classToTeacher
}

export function generateTimetable(input: GenerateInput): TimetableEntry[] {
  const { termId, classes, teachers, subjects, periodsPerDay } = input
  const workingDays = getWorkingDays(input.workingDays)
  const lessonSlotNumbers = getLessonSlotNumbers(input.lessonSlotNumbers, periodsPerDay)
  const totalSlotsPerClass = workingDays.length * lessonSlotNumbers.length

  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]))
  const teachersById = new Map(teachers.map((teacher) => [teacher.id, teacher]))
  const classSubjectPools = buildSubjectPools(classes, subjects, input.classSubjectMap)
  const teacherPools = buildTeacherPools(subjects, teachers)

  const remaining = new Map<string, Map<string, number>>()
  const classDayUsage = new Map<string, Map<DayOfWeek, Map<string, number>>>()
  const classTotalUsage = new Map<string, Map<string, number>>()
  const classLastSubject = new Map<string, string | null>()

  classes.forEach((cls) => {
    const subjectIds = classSubjectPools.get(cls.id) ?? []
    remaining.set(cls.id, buildRequirementCounts(subjectIds, subjectsById, totalSlotsPerClass))
    classDayUsage.set(
      cls.id,
      workingDays.reduce<Map<DayOfWeek, Map<string, number>>>((acc, day) => {
        acc.set(day, new Map<string, number>())
        return acc
      }, new Map())
    )
    classTotalUsage.set(cls.id, new Map<string, number>())
    classLastSubject.set(cls.id, null)
  })

  const teacherDayLoad: Record<string, Record<DayOfWeek, number>> = {}
  const teacherTotalLoad: Record<string, number> = {}
  teachers.forEach((teacher) => {
    teacherDayLoad[teacher.id] = createDayLoadMap(workingDays)
    teacherTotalLoad[teacher.id] = 0
  })

  const entries: TimetableEntry[] = []
  const dayOrder = new Map(workingDays.map((day, index) => [day, index]))

  for (const day of workingDays) {
    for (let periodIndex = 1; periodIndex <= lessonSlotNumbers.length; periodIndex += 1) {
      const slotNumber = lessonSlotNumbers[periodIndex - 1] ?? periodIndex
      const strictEdges = new Map<string, string[]>()
      const relaxedEdges = new Map<string, string[]>()

      for (const cls of classes) {
        const strictCandidates = buildCandidates({
          classId: cls.id,
          day,
          periodIndex,
          classSubjectIds: classSubjectPools.get(cls.id) ?? [],
          subjectsById,
          teacherPools,
          remaining,
          classDayUsage,
          classTotalUsage,
          classLastSubject,
          teacherDayLoad,
          teacherTotalLoad,
          teacherBusyThisSlot: new Set<string>(),
          teachers,
          allowOverflow: false,
        })

        const relaxedCandidates = buildCandidates({
          classId: cls.id,
          day,
          periodIndex,
          classSubjectIds: classSubjectPools.get(cls.id) ?? [],
          subjectsById,
          teacherPools,
          remaining,
          classDayUsage,
          classTotalUsage,
          classLastSubject,
          teacherDayLoad,
          teacherTotalLoad,
          teacherBusyThisSlot: new Set<string>(),
          teachers,
          allowOverflow: true,
          ignoreAvailability: true,
          ignoreDailyLoad: true,
        })

        strictEdges.set(cls.id, sortUnique(strictCandidates.map((candidate) => candidate.teacherId)))
        relaxedEdges.set(cls.id, sortUnique(relaxedCandidates.map((candidate) => candidate.teacherId)))
      }

      const strictMatch = maximizeMatching(classes.map((cls) => cls.id), strictEdges)
      const relaxedMatch = maximizeMatching(classes.map((cls) => cls.id), relaxedEdges)
      const classToTeacher = relaxedMatch.size > strictMatch.size ? relaxedMatch : strictMatch

      const busyTeachers = new Set<string>()
      for (const cls of classes) {
        const teacherId = classToTeacher.get(cls.id)
        if (!teacherId || busyTeachers.has(teacherId)) continue
        const teacher = teachersById.get(teacherId)
        if (!teacher) continue

        const chosen = pickSubjectForTeacher({
          classId: cls.id,
          teacher,
          day,
          subjectsById,
          classSubjectIds: classSubjectPools.get(cls.id) ?? [],
          remaining,
          classDayUsage,
          classTotalUsage,
          classLastSubject,
          teacherDayLoad,
          teacherTotalLoad,
          allowOverflow: true,
        })

        if (!chosen) continue

        entries.push({
          id: crypto.randomUUID(),
          term_id: termId,
          class_id: cls.id,
          teacher_id: teacherId,
          subject_id: chosen.subject.id,
          day,
          period_number: slotNumber,
          is_override: false,
          created_at: new Date().toISOString(),
        })

        busyTeachers.add(teacherId)
        recordUsage({
          classId: cls.id,
          subjectId: chosen.subject.id,
          teacherId,
          day,
          remaining,
          classDayUsage,
          classTotalUsage,
          classLastSubject,
          teacherDayLoad,
          teacherTotalLoad,
        })
      }
    }
  }

  return entries.sort((a, b) => {
    const dayDiff = (dayOrder.get(a.day) ?? 0) - (dayOrder.get(b.day) ?? 0)
    if (dayDiff !== 0) return dayDiff
    if (a.period_number !== b.period_number) return a.period_number - b.period_number
    return a.class_id.localeCompare(b.class_id)
  })
}
