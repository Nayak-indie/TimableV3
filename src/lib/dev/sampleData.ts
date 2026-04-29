import type { AppSupabaseClient } from '@/lib/supabase/types'
import { stringifyTeacherMeta } from '@/lib/teacher-meta'
import { replaceClassSubjectMap } from '@/lib/setup-links'
import type { ClassSubjectMap } from '@/lib/setup-constants'
import type { DayOfWeek } from '@/types'
import { EMPTY_DEV_DB, cloneDevDb, createDevId, hasPublicSupabaseConfig, type DevDb } from './dev-db'
import { writeDevDbFile } from './dev-db.server'

export const DEV_SAMPLE_TAG = '[DEV_SAMPLE_TIMABLE_V3]'

type SubjectCategory = 'core' | 'elective'

interface InsertedEntity {
  id: string
  name: string
  contact_info?: string
  teacher_ids?: string[] | null
}

interface ClassSeed {
  name: string
  gradeLevel: string
  section: string | null
  periodsPerDay: number
  roomId: string
  subjects: string[]
}

interface SubjectSeed {
  name: string
  periodsPerWeek: number
  colorLabel: string
  category: SubjectCategory
}

interface TeacherSeed {
  name: string
  code: string
  subjectNames: string[]
  classNames: string[]
  blocked?: Partial<Record<DayOfWeek, number[]>>
}

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

function colorByName(name: string) {
  const colors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899']
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function buildAvailability(blocked: Partial<Record<DayOfWeek, number[]>> = {}) {
  return DAYS.reduce<Record<DayOfWeek, number[]>>((acc, day) => {
    const blockedPeriods = new Set(blocked[day] ?? [])
    acc[day] = ALL_PERIODS.filter((period) => !blockedPeriods.has(period))
    return acc
  }, { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] })
}

const PRIMARY_CURRICULUM = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Art', 'Music', 'Physical Education']
const PRIMARY_WITH_CS = [...PRIMARY_CURRICULUM, 'Computer Science']
const MIDDLE_CURRICULUM = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer Science', 'History', 'Geography', 'Physical Education']
const SECONDARY_CURRICULUM = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'Physical Education']
const SCIENCE_STREAM = ['English', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'Physical Education']
const COMMERCE_STREAM = ['English', 'Economics', 'Business Studies', 'Accountancy', 'Mathematics', 'Computer Science', 'Political Science', 'Physical Education']
const HUMANITIES_STREAM = ['English', 'History', 'Geography', 'Political Science', 'Economics', 'Mathematics', 'Computer Science', 'Physical Education']

function assertSupabaseOk(result: any, label: string) {
  if (!result) return
  if (result.error) {
    const message = typeof result.error?.message === 'string' ? result.error.message : String(result.error)
    throw new Error(`${label} failed: ${message}`)
  }
}

export const SAMPLE_DATASET = {
  classes: [
    { name: 'Grade 1', gradeLevel: '1', section: null, periodsPerDay: 8, roomId: 'A-101', subjects: PRIMARY_CURRICULUM },
    { name: 'Grade 2', gradeLevel: '2', section: null, periodsPerDay: 8, roomId: 'A-102', subjects: PRIMARY_CURRICULUM },
    { name: 'Grade 3', gradeLevel: '3', section: null, periodsPerDay: 8, roomId: 'A-103', subjects: PRIMARY_WITH_CS },
    { name: 'Grade 4', gradeLevel: '4', section: null, periodsPerDay: 8, roomId: 'A-104', subjects: PRIMARY_WITH_CS },
    { name: 'Grade 5', gradeLevel: '5', section: null, periodsPerDay: 8, roomId: 'A-105', subjects: PRIMARY_WITH_CS },
    { name: 'Grade 6', gradeLevel: '6', section: null, periodsPerDay: 8, roomId: 'B-201', subjects: MIDDLE_CURRICULUM },
    { name: 'Grade 7', gradeLevel: '7', section: null, periodsPerDay: 8, roomId: 'B-202', subjects: MIDDLE_CURRICULUM },
    { name: 'Grade 8', gradeLevel: '8', section: null, periodsPerDay: 8, roomId: 'B-203', subjects: MIDDLE_CURRICULUM },
    { name: 'Grade 9', gradeLevel: '9', section: null, periodsPerDay: 8, roomId: 'C-301', subjects: SECONDARY_CURRICULUM },
    { name: 'Grade 10', gradeLevel: '10', section: null, periodsPerDay: 8, roomId: 'C-302', subjects: SECONDARY_CURRICULUM },
    { name: '11 Science', gradeLevel: '11', section: 'Science', periodsPerDay: 8, roomId: 'D-401', subjects: SCIENCE_STREAM },
    { name: '11 Commerce', gradeLevel: '11', section: 'Commerce', periodsPerDay: 8, roomId: 'D-402', subjects: COMMERCE_STREAM },
    { name: '11 Humanities', gradeLevel: '11', section: 'Humanities', periodsPerDay: 8, roomId: 'D-403', subjects: HUMANITIES_STREAM },
    { name: '12 Science', gradeLevel: '12', section: 'Science', periodsPerDay: 8, roomId: 'E-501', subjects: SCIENCE_STREAM },
    { name: '12 Commerce', gradeLevel: '12', section: 'Commerce', periodsPerDay: 8, roomId: 'E-502', subjects: COMMERCE_STREAM },
    { name: '12 Humanities', gradeLevel: '12', section: 'Humanities', periodsPerDay: 8, roomId: 'E-503', subjects: HUMANITIES_STREAM },
  ] as ClassSeed[],
  subjects: [
    { name: 'Mathematics', periodsPerWeek: 6, colorLabel: colorByName('Mathematics'), category: 'core' },
    { name: 'Physics', periodsPerWeek: 5, colorLabel: colorByName('Physics'), category: 'core' },
    { name: 'Chemistry', periodsPerWeek: 5, colorLabel: colorByName('Chemistry'), category: 'core' },
    { name: 'Biology', periodsPerWeek: 5, colorLabel: colorByName('Biology'), category: 'core' },
    { name: 'English', periodsPerWeek: 6, colorLabel: colorByName('English'), category: 'core' },
    { name: 'Hindi', periodsPerWeek: 5, colorLabel: colorByName('Hindi'), category: 'core' },
    { name: 'Science', periodsPerWeek: 5, colorLabel: colorByName('Science'), category: 'core' },
    { name: 'Social Studies', periodsPerWeek: 4, colorLabel: colorByName('Social Studies'), category: 'core' },
    { name: 'Computer Science', periodsPerWeek: 4, colorLabel: colorByName('Computer Science'), category: 'core' },
    { name: 'Economics', periodsPerWeek: 4, colorLabel: colorByName('Economics'), category: 'core' },
    { name: 'Business Studies', periodsPerWeek: 4, colorLabel: colorByName('Business Studies'), category: 'core' },
    { name: 'Accountancy', periodsPerWeek: 4, colorLabel: colorByName('Accountancy'), category: 'core' },
    { name: 'Political Science', periodsPerWeek: 4, colorLabel: colorByName('Political Science'), category: 'core' },
    { name: 'History', periodsPerWeek: 4, colorLabel: colorByName('History'), category: 'core' },
    { name: 'Geography', periodsPerWeek: 4, colorLabel: colorByName('Geography'), category: 'core' },
    { name: 'Physical Education', periodsPerWeek: 3, colorLabel: colorByName('Physical Education'), category: 'elective' },
    { name: 'Art', periodsPerWeek: 2, colorLabel: colorByName('Art'), category: 'elective' },
    { name: 'Music', periodsPerWeek: 2, colorLabel: colorByName('Music'), category: 'elective' },
  ] as SubjectSeed[],
  teachers: [
    { name: 'Mridul Sharma', code: 'TCH-001', subjectNames: ['Science'], classNames: ['Grade 3', 'Grade 4', 'Grade 10'], blocked: { Tue: [1, 2], Thu: [7, 8] } },
    { name: 'Aakash Verma', code: 'TCH-002', subjectNames: ['Chemistry'], classNames: ['11 Science', '12 Science'], blocked: { Mon: [1], Wed: [4, 5] } },
    { name: 'Neha Kapoor', code: 'TCH-003', subjectNames: ['Mathematics'], classNames: ['Grade 6', 'Grade 7', 'Grade 8'], blocked: { Tue: [8], Fri: [1, 2] } },
    { name: 'Riya Sen', code: 'TCH-004', subjectNames: ['English'], classNames: ['Grade 5', 'Grade 9', 'Grade 10'], blocked: { Mon: [3], Thu: [2, 3] } },
    { name: 'Kunal Mehta', code: 'TCH-005', subjectNames: ['Physics'], classNames: ['11 Science', '12 Science'], blocked: { Wed: [1, 2, 3], Fri: [7, 8] } },
    { name: 'Priya Nair', code: 'TCH-006', subjectNames: ['Biology'], classNames: ['Grade 9', 'Grade 10', '11 Science'], blocked: { Mon: [7, 8], Thu: [1, 2] } },
    { name: 'Arjun Rao', code: 'TCH-007', subjectNames: ['Computer Science'], classNames: ['Grade 8', 'Grade 9', '11 Science'], blocked: { Tue: [4, 5], Fri: [6, 7] } },
    { name: 'Simran Kaur', code: 'TCH-008', subjectNames: ['History'], classNames: ['Grade 6', 'Grade 7', 'Grade 8'], blocked: { Wed: [7, 8], Thu: [4] } },
    { name: 'Dev Malhotra', code: 'TCH-009', subjectNames: ['Economics'], classNames: ['11 Commerce', '12 Commerce'], blocked: { Mon: [1, 2], Thu: [6, 7] } },
    { name: 'Sneha Joshi', code: 'TCH-010', subjectNames: ['Political Science'], classNames: ['11 Humanities', '12 Humanities'], blocked: { Tue: [6, 7], Fri: [3, 4] } },
    { name: 'Rahul Iyer', code: 'TCH-011', subjectNames: ['Mathematics', 'Physics'], classNames: ['Grade 9', 'Grade 10', '11 Science'], blocked: { Wed: [1], Fri: [2, 3] } },
    { name: 'Anjali Das', code: 'TCH-012', subjectNames: ['English', 'History'], classNames: ['Grade 7', 'Grade 8', '11 Humanities'], blocked: { Mon: [6], Thu: [1, 8] } },
    { name: 'Vivek Sinha', code: 'TCH-013', subjectNames: ['Accountancy', 'Business Studies'], classNames: ['11 Commerce', '12 Commerce'], blocked: { Tue: [1, 2, 3], Fri: [6] } },
    { name: 'Maya Pillai', code: 'TCH-014', subjectNames: ['Geography', 'Social Studies'], classNames: ['Grade 6', 'Grade 7', 'Grade 8'], blocked: { Mon: [4], Wed: [2, 3], Fri: [8] } },
    { name: 'Nitin Arora', code: 'TCH-015', subjectNames: ['Physical Education'], classNames: ['Grade 5', 'Grade 6', 'Grade 7'], blocked: { Tue: [1, 2], Thu: [5, 6] } },
    { name: 'Ishita Roy', code: 'TCH-016', subjectNames: ['Art', 'Music'], classNames: ['Grade 3', 'Grade 4', 'Grade 5'], blocked: { Wed: [6, 7], Fri: [1] } },
    { name: 'Tarun Gill', code: 'TCH-017', subjectNames: ['Hindi', 'English'], classNames: ['Grade 8', 'Grade 9', 'Grade 10'], blocked: { Mon: [1, 2], Thu: [4, 5] } },
    { name: 'Pooja Menon', code: 'TCH-018', subjectNames: ['Biology', 'Chemistry'], classNames: ['11 Science', '12 Science'], blocked: { Tue: [7, 8], Fri: [4, 5] } },
    { name: 'Rohan Batra', code: 'TCH-019', subjectNames: ['Computer Science', 'Mathematics'], classNames: ['Grade 10', '11 Science', '12 Science'], blocked: { Wed: [4, 5], Thu: [2, 3] } },
    { name: 'Kriti Jain', code: 'TCH-020', subjectNames: ['Economics', 'Political Science'], classNames: ['11 Commerce', '11 Humanities', '12 Humanities'], blocked: { Mon: [5, 6], Fri: [2, 3] } },
    { name: 'Samar Kohli', code: 'TCH-021', subjectNames: ['Social Studies'], classNames: ['Grade 5', 'Grade 6', 'Grade 7'], blocked: { Tue: [3], Thu: [7] } },
    { name: 'Aditi Bansal', code: 'TCH-022', subjectNames: ['Science', 'Mathematics'], classNames: ['Grade 4', 'Grade 5', 'Grade 6'], blocked: { Mon: [7, 8], Wed: [1] } },
    { name: 'Hemant Joshi', code: 'TCH-023', subjectNames: ['Physics', 'Computer Science'], classNames: ['11 Science', '12 Science'], blocked: { Tue: [2, 3], Fri: [1, 2] } },
    { name: 'Lavanya Rao', code: 'TCH-024', subjectNames: ['English', 'Economics'], classNames: ['Grade 10', '11 Commerce', '12 Commerce'], blocked: { Mon: [2], Thu: [6, 7] } },
  ] as TeacherSeed[],
  periodSlots: [
    ['08:00', '08:45'],
    ['08:50', '09:35'],
    ['09:40', '10:25'],
    ['10:30', '11:15'],
    ['11:35', '12:20'],
    ['12:25', '13:10'],
    ['13:15', '14:00'],
    ['14:05', '14:50'],
  ] as Array<[string, string]>,
}

export const SAMPLE_CLASS_SUBJECT_ASSIGNMENTS = Object.fromEntries(
  SAMPLE_DATASET.classes.map((classSeed) => [classSeed.name, classSeed.subjects])
) as Record<string, string[]>

export const SAMPLE_TEACHER_CLASS_ASSIGNMENTS = Object.fromEntries(
  SAMPLE_DATASET.teachers.map((teacherSeed) => [teacherSeed.code, teacherSeed.classNames])
) as Record<string, string[]>

interface GeneratedSampleData {
  tag: string
  dataset: typeof SAMPLE_DATASET
  classSubjectAssignments: Record<string, string[]>
  teacherClassAssignments: Record<string, string[]>
  counts: {
    classes: number
    subjects: number
    teachers: number
    periodSlots: number
    terms: number
    classSubjectLinks: number
    events: number
  }
  classSubjectMap: ClassSubjectMap
  teacherClassAssignment: Record<string, string[]>
}

interface GeneratedSampleSnapshot {
  db: DevDb
  payload: GeneratedSampleData
}

function buildDevSampleSnapshot(): GeneratedSampleSnapshot {
  const createdAt = new Date().toISOString()
  const today = new Date()
  const dateOffset = (days: number) => {
    const nextDate = new Date(today)
    nextDate.setDate(nextDate.getDate() + days)
    return nextDate.toISOString().slice(0, 10)
  }
  const termId = createDevId()

  const classRows = SAMPLE_DATASET.classes.map((classSeed) => ({
    id: createDevId(),
    name: `${DEV_SAMPLE_TAG} ${classSeed.name}`,
    grade_level: classSeed.gradeLevel,
    section: classSeed.section,
    periods_per_day: classSeed.periodsPerDay,
    room_id: classSeed.roomId,
    created_at: createdAt,
  }))
  const classMap = new Map(SAMPLE_DATASET.classes.map((classSeed, index) => [classSeed.name, classRows[index]]))

  const subjectRowsBase = SAMPLE_DATASET.subjects.map((subjectSeed) => ({
    id: createDevId(),
    name: `${DEV_SAMPLE_TAG} ${subjectSeed.name}`,
    periods_per_week: subjectSeed.periodsPerWeek,
    teacher_ids: [] as string[],
    color_label: subjectSeed.colorLabel,
    category: subjectSeed.category,
    created_at: createdAt,
  }))
  const subjectMap = new Map(SAMPLE_DATASET.subjects.map((subjectSeed, index) => [subjectSeed.name, subjectRowsBase[index]]))

  const subjectTeacherMap = new Map<string, string[]>()
  const teacherRows = SAMPLE_DATASET.teachers.map((teacherSeed) => {
    const teacherId = createDevId()
    const subjectIds = teacherSeed.subjectNames
      .map((name) => subjectMap.get(name)?.id)
      .filter((value): value is string => Boolean(value))
    const classIds = teacherSeed.classNames
      .map((name) => classMap.get(name)?.id)
      .filter((value): value is string => Boolean(value))
    const availability = buildAvailability(teacherSeed.blocked)

    subjectIds.forEach((subjectId) => {
      const existing = subjectTeacherMap.get(subjectId) ?? []
      existing.push(teacherId)
      subjectTeacherMap.set(subjectId, existing)
    })

    return {
      id: teacherId,
      name: `${DEV_SAMPLE_TAG} ${teacherSeed.name}`,
      subjects: subjectIds,
      max_periods_per_day: 6,
      availability,
      status: 'active',
      contact_info: stringifyTeacherMeta({ code: teacherSeed.code, classIds, availability }),
      created_at: createdAt,
    }
  })

  const subjectRows = subjectRowsBase.map((subjectRow) => ({
    ...subjectRow,
    teacher_ids: Array.from(new Set(subjectTeacherMap.get(subjectRow.id) ?? [])),
  }))

  const periodSlotRows = SAMPLE_DATASET.periodSlots.map(([start_time, end_time], index) => ({
    id: createDevId(),
    number: index + 101,
    start_time,
    end_time,
    slot_type: 'lesson',
    created_at: createdAt,
  }))

  const classSubjectLinkRows = SAMPLE_DATASET.classes.flatMap((classSeed) => {
    const classRow = classMap.get(classSeed.name)
    if (!classRow) return []
    return classSeed.subjects
      .map((subjectName) => {
        const subjectRow = subjectMap.get(subjectName)
        if (!subjectRow) return null
        return {
          id: createDevId(),
          class_id: classRow.id as string,
          subject_id: subjectRow.id as string,
          created_at: createdAt,
        }
      })
      .filter((value): value is { id: string; class_id: string; subject_id: string; created_at: string } => Boolean(value))
  })

  const eventRows = [
    {
      id: createDevId(),
      term_id: termId,
      name: `${DEV_SAMPLE_TAG} Staff Planning Day`,
      event_date: dateOffset(2),
      event_type: 'meeting',
      affected_class_ids: classRows.slice(0, 4).map((classRow) => classRow.id),
      periods_blocked: [1, 2],
      affects_all_classes: false,
      created_at: createdAt,
    },
    {
      id: createDevId(),
      term_id: termId,
      name: `${DEV_SAMPLE_TAG} Sports Practice`,
      event_date: dateOffset(4),
      event_type: 'activity',
      affected_class_ids: classRows
        .filter((classRow) => classRow.grade_level === '9' || classRow.grade_level === '10')
        .map((classRow) => classRow.id),
      periods_blocked: [6, 7],
      affects_all_classes: false,
      created_at: createdAt,
    },
  ]

  const classSubjectMap = classRows.reduce<ClassSubjectMap>((acc, classRow) => {
    acc[classRow.id] = classSubjectLinkRows
      .filter((link) => link.class_id === classRow.id)
      .map((link) => link.subject_id)
    return acc
  }, {})

  const db = cloneDevDb({
    terms: [
      {
        id: termId,
        name: `${DEV_SAMPLE_TAG} Term 2026`,
        start_date: '2026-06-01',
        end_date: '2027-03-31',
        working_days: DAYS,
        is_active: true,
        created_at: createdAt,
      },
    ],
    period_slots: periodSlotRows,
    teachers: teacherRows,
    classes: classRows,
    subjects: subjectRows,
    timetable_entries: [],
    events: eventRows,
    absences: [],
    change_log: [],
    class_subject_links: classSubjectLinkRows,
  })

  return {
    db,
    payload: {
      tag: DEV_SAMPLE_TAG,
      dataset: SAMPLE_DATASET,
      classSubjectAssignments: SAMPLE_CLASS_SUBJECT_ASSIGNMENTS,
      teacherClassAssignments: SAMPLE_TEACHER_CLASS_ASSIGNMENTS,
      counts: {
        classes: classRows.length,
        subjects: subjectRows.length,
        teachers: teacherRows.length,
        periodSlots: periodSlotRows.length,
        terms: 1,
        classSubjectLinks: classSubjectLinkRows.length,
        events: eventRows.length,
      },
      classSubjectMap,
      teacherClassAssignment: SAMPLE_TEACHER_CLASS_ASSIGNMENTS,
    },
  }
}

export async function resetSampleData(supabase: AppSupabaseClient) {
  if (!hasPublicSupabaseConfig()) {
    await writeDevDbFile(EMPTY_DEV_DB)
    return
  }

  const [sampleClassesRes, sampleSubjectsRes] = await Promise.all([
    supabase.from('classes').select('id').ilike('name', `${DEV_SAMPLE_TAG}%`),
    supabase.from('subjects').select('id').ilike('name', `${DEV_SAMPLE_TAG}%`),
  ])
  assertSupabaseOk(sampleClassesRes, 'List sample classes')
  assertSupabaseOk(sampleSubjectsRes, 'List sample subjects')
  const sampleClassIds = (sampleClassesRes.data ?? []).map((row: any) => row.id)
  const sampleSubjectIds = (sampleSubjectsRes.data ?? []).map((row: any) => row.id)

  if (sampleClassIds.length > 0) {
    const res = await supabase.from('class_subject_links').delete().in('class_id', sampleClassIds)
    assertSupabaseOk(res, 'Delete class_subject_links by class_id')
  }
  if (sampleSubjectIds.length > 0) {
    const res = await supabase.from('class_subject_links').delete().in('subject_id', sampleSubjectIds)
    assertSupabaseOk(res, 'Delete class_subject_links by subject_id')
  }

  assertSupabaseOk(await supabase.from('timetable_entries').delete().ilike('override_note', `${DEV_SAMPLE_TAG}%`), 'Delete sample timetable entries')
  assertSupabaseOk(await supabase.from('events').delete().ilike('name', `${DEV_SAMPLE_TAG}%`), 'Delete sample events')
  assertSupabaseOk(await supabase.from('teachers').delete().ilike('name', `${DEV_SAMPLE_TAG}%`), 'Delete sample teachers')
  assertSupabaseOk(await supabase.from('subjects').delete().ilike('name', `${DEV_SAMPLE_TAG}%`), 'Delete sample subjects')
  assertSupabaseOk(await supabase.from('classes').delete().ilike('name', `${DEV_SAMPLE_TAG}%`), 'Delete sample classes')
  assertSupabaseOk(await supabase.from('period_slots').delete().gte('number', 101), 'Delete sample period slots')
  assertSupabaseOk(await supabase.from('terms').delete().ilike('name', `${DEV_SAMPLE_TAG}%`), 'Delete sample terms')
}

export async function generateSampleData(supabase: AppSupabaseClient) {
  if (!hasPublicSupabaseConfig()) {
    const snapshot = buildDevSampleSnapshot()
    await writeDevDbFile(snapshot.db)
    return snapshot.payload
  }

  await resetSampleData(supabase)

  const termResult = await supabase
    .from('terms')
    .insert({
      name: `${DEV_SAMPLE_TAG} Term 2026`,
      start_date: '2026-06-01',
      end_date: '2027-03-31',
      working_days: DAYS,
      is_active: true,
    })
    .select('*')
    .single()
  assertSupabaseOk(termResult, 'Insert term')
  const term = termResult.data

  const classRows = SAMPLE_DATASET.classes.map((classSeed) => ({
    name: `${DEV_SAMPLE_TAG} ${classSeed.name}`,
    grade_level: classSeed.gradeLevel,
    section: classSeed.section,
    periods_per_day: classSeed.periodsPerDay,
    room_id: classSeed.roomId,
  }))
  const insertedClassesResult = await supabase.from('classes').insert(classRows).select('*')
  assertSupabaseOk(insertedClassesResult, 'Insert classes')
  const insertedClasses = insertedClassesResult.data
  const classEntities = (insertedClasses ?? []) as InsertedEntity[]
  const classMap = new Map(classEntities.map((cls) => [cls.name.replace(`${DEV_SAMPLE_TAG} `, ''), cls]))

  const subjectRows = SAMPLE_DATASET.subjects.map((subjectSeed) => ({
    name: `${DEV_SAMPLE_TAG} ${subjectSeed.name}`,
    periods_per_week: subjectSeed.periodsPerWeek,
    color_label: subjectSeed.colorLabel,
    category: subjectSeed.category,
  }))
  const insertedSubjectsResult = await supabase.from('subjects').insert(subjectRows).select('*')
  assertSupabaseOk(insertedSubjectsResult, 'Insert subjects')
  const insertedSubjects = insertedSubjectsResult.data
  const subjectEntities = (insertedSubjects ?? []) as InsertedEntity[]
  const subjectMap = new Map(subjectEntities.map((subject) => [subject.name.replace(`${DEV_SAMPLE_TAG} `, ''), subject]))

  const teacherRows = SAMPLE_DATASET.teachers.map((teacherSeed) => {
    const subjectIds = teacherSeed.subjectNames
      .map((name) => subjectMap.get(name)?.id)
      .filter((value): value is string => Boolean(value))
    const classIds = teacherSeed.classNames
      .map((name) => classMap.get(name)?.id)
      .filter((value): value is string => Boolean(value))
    const availability = buildAvailability(teacherSeed.blocked)
    return {
      name: `${DEV_SAMPLE_TAG} ${teacherSeed.name}`,
      subjects: subjectIds,
      max_periods_per_day: 6,
      availability,
      status: 'active',
      contact_info: stringifyTeacherMeta({ code: teacherSeed.code, classIds, availability }),
    }
  })
  const insertedTeachersResult = await supabase.from('teachers').insert(teacherRows).select('*')
  assertSupabaseOk(insertedTeachersResult, 'Insert teachers')
  const insertedTeachers = insertedTeachersResult.data
  const teacherEntities = (insertedTeachers ?? []) as InsertedEntity[]

  const teachersByCode = new Map(
    teacherEntities.map((teacher) => {
      const meta = JSON.parse(teacher.contact_info ?? '{}')
      return [meta.code as string, teacher]
    })
  )

  const subjectTeacherMap: Record<string, string[]> = {}
  SAMPLE_DATASET.teachers.forEach((teacherSeed) => {
    teacherSeed.subjectNames.forEach((subjectName) => {
      const subjectId = subjectMap.get(subjectName)?.id
      const teacherId = teachersByCode.get(teacherSeed.code)?.id
      if (!subjectId || !teacherId) return
      if (!subjectTeacherMap[subjectId]) subjectTeacherMap[subjectId] = []
      subjectTeacherMap[subjectId].push(teacherId)
    })
  })
  await Promise.all(
    Object.entries(subjectTeacherMap).map(([subjectId, teacherIds]) =>
      supabase.from('subjects').update({ teacher_ids: Array.from(new Set(teacherIds)) }).eq('id', subjectId)
    )
  )

  const slotsRows = SAMPLE_DATASET.periodSlots.map(([start, end], idx) => ({
    number: idx + 101,
    start_time: start,
    end_time: end,
    slot_type: 'lesson',
  }))
  assertSupabaseOk(await supabase.from('period_slots').insert(slotsRows), 'Insert period slots')

  const classSubjectMap: ClassSubjectMap = {}
  SAMPLE_DATASET.classes.forEach((classSeed) => {
    const classId = classMap.get(classSeed.name)?.id
    if (!classId) return
    classSubjectMap[classId] = classSeed.subjects
      .map((subjectName) => subjectMap.get(subjectName)?.id)
      .filter((value): value is string => Boolean(value))
  })
  await replaceClassSubjectMap(supabase, classSubjectMap)

  const teacherClassAssignment: Record<string, string[]> = {}
  SAMPLE_DATASET.teachers.forEach((teacherSeed) => {
    teacherClassAssignment[teacherSeed.code] = teacherSeed.classNames
  })

  return {
    tag: DEV_SAMPLE_TAG,
    dataset: SAMPLE_DATASET,
    classSubjectAssignments: SAMPLE_CLASS_SUBJECT_ASSIGNMENTS,
    teacherClassAssignments: SAMPLE_TEACHER_CLASS_ASSIGNMENTS,
    counts: {
      classes: insertedClasses?.length ?? 0,
      subjects: insertedSubjects?.length ?? 0,
      teachers: teacherEntities.length,
      periodSlots: slotsRows.length,
      terms: term ? 1 : 0,
      classSubjectLinks: Object.values(classSubjectMap).reduce((total, subjectIds) => total + subjectIds.length, 0),
    },
    classSubjectMap,
    teacherClassAssignment,
  }
}
