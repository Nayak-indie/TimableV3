import type { AppSupabaseClient } from '@/lib/supabase/types'
import { stringifyTeacherMeta } from '@/lib/teacher-meta'
import { replaceClassSubjectMap } from '@/lib/setup-links'
import type { ClassSubjectMap } from '@/lib/setup-constants'
import type { DayOfWeek } from '@/types'
import { EMPTY_DEV_DB, cloneDevDb, createDevId, shouldUseLocalDevStore, type DevDb } from './dev-db'
import { readDevDbFile, writeDevDbFile } from './dev-db.server'

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

function assertSupabaseOk(result: { error?: unknown } | null | undefined, label: string) {
  if (!result) return
  if (result.error) {
    const err = result.error
    const message =
      typeof err === 'object' &&
      err !== null &&
      typeof (err as Record<string, unknown>).message === 'string'
        ? String((err as Record<string, unknown>).message)
        : String(err)
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
  counts: {
    classes: number
    subjects: number
    teachers: number
    periodSlots: number
    terms: number
    classSubjectLinks: number
    events: number
  }
}

function hasDevSampleRows(db: DevDb) {
  return db.classes.some((row) => typeof row?.name === 'string' && row.name.startsWith(DEV_SAMPLE_TAG))
}

export async function resetSampleData(supabase: AppSupabaseClient) {
  if (shouldUseLocalDevStore()) {
    await writeDevDbFile(EMPTY_DEV_DB)
    return
  }

  const [sampleClassesRes, sampleSubjectsRes] = await Promise.all([
    supabase.from('classes').select('id').ilike('name', `${DEV_SAMPLE_TAG}%`),
    supabase.from('subjects').select('id').ilike('name', `${DEV_SAMPLE_TAG}%`),
  ])
  assertSupabaseOk(sampleClassesRes, 'List sample classes')
  assertSupabaseOk(sampleSubjectsRes, 'List sample subjects')
  const sampleClassIds = (sampleClassesRes.data ?? []).map((row) => row.id).filter(Boolean)
  const sampleSubjectIds = (sampleSubjectsRes.data ?? []).map((row) => row.id).filter(Boolean)

  if (sampleClassIds.length > 0) {
    await supabase.from('class_subject_links').delete().in('class_id', sampleClassIds)
  }
  if (sampleSubjectIds.length > 0) {
    await supabase.from('class_subject_links').delete().in('subject_id', sampleSubjectIds)
  }

  await supabase.from('timetable_entries').delete().ilike('override_note', `${DEV_SAMPLE_TAG}%`)
  await supabase.from('events').delete().ilike('name', `${DEV_SAMPLE_TAG}%`)
  await supabase.from('teachers').delete().ilike('name', `${DEV_SAMPLE_TAG}%`)
  await supabase.from('subjects').delete().ilike('name', `${DEV_SAMPLE_TAG}%`)
  await supabase.from('classes').delete().ilike('name', `${DEV_SAMPLE_TAG}%`)
  await supabase.from('period_slots').delete().gte('number', 1)
  await supabase.from('terms').delete().ilike('name', `${DEV_SAMPLE_TAG}%`)
}

export async function generateSampleData(supabase: AppSupabaseClient) {
  if (shouldUseLocalDevStore()) {
    // Local store not fully supported for this complex seed yet
    return { tag: DEV_SAMPLE_TAG, counts: { classes: 0, subjects: 0, teachers: 0, periodSlots: 0, terms: 0, classSubjectLinks: 0, events: 0 } }
  }

  await resetSampleData(supabase)

  // 1. Insert Terms
  const termsToInsert = [
    {
      name: `Academic Term 2026-27`,
      start_date: '2026-06-01',
      end_date: '2027-03-31',
      working_days: DAYS,
      is_active: true,
    },
    {
      name: `Summer Term 2026`,
      start_date: '2026-04-15',
      end_date: '2026-05-30',
      working_days: DAYS,
      is_active: false,
    }
  ].map(t => ({ ...t, name: `${DEV_SAMPLE_TAG} ${t.name}` }))

  const termsResult = await supabase.from('terms').insert(termsToInsert).select('*')
  assertSupabaseOk(termsResult, 'Insert terms')
  const insertedTerms = termsResult.data ?? []

  // 2. Insert Classes
  const classRows = SAMPLE_DATASET.classes.map((classSeed) => ({
    name: `${DEV_SAMPLE_TAG} ${classSeed.name}`,
    grade_level: classSeed.gradeLevel,
    section: classSeed.section,
    periods_per_day: classSeed.periodsPerDay,
    room_id: classSeed.roomId,
  }))
  const insertedClassesResult = await supabase.from('classes').insert(classRows).select('*')
  assertSupabaseOk(insertedClassesResult, 'Insert classes')
  const insertedClasses = insertedClassesResult.data ?? []
  const classEntities = insertedClasses as InsertedEntity[]
  const classMap = new Map(classEntities.map((cls) => [cls.name.replace(`${DEV_SAMPLE_TAG} `, ''), cls]))

  // 3. Insert Subjects
  const subjectRows = SAMPLE_DATASET.subjects.map((subjectSeed) => ({
    name: `${DEV_SAMPLE_TAG} ${subjectSeed.name}`,
    periods_per_week: subjectSeed.periodsPerWeek,
    color_label: subjectSeed.colorLabel,
    category: subjectSeed.category,
  }))
  const insertedSubjectsResult = await supabase.from('subjects').insert(subjectRows).select('*')
  assertSupabaseOk(insertedSubjectsResult, 'Insert subjects')
  const insertedSubjects = insertedSubjectsResult.data ?? []
  const subjectEntities = insertedSubjects as InsertedEntity[]
  const subjectMap = new Map(subjectEntities.map((subject) => [subject.name.replace(`${DEV_SAMPLE_TAG} `, ''), subject]))

  // 4. Insert Teachers
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
  const insertedTeachers = insertedTeachersResult.data ?? []
  const teacherEntities = insertedTeachers as InsertedEntity[]

  const teachersByCode = new Map(
    teacherEntities.map((teacher) => {
      const meta = JSON.parse(teacher.contact_info ?? '{}')
      return [meta.code as string, teacher]
    })
  )

  // 5. Update Subjects with Teacher IDs
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

  // 6. Insert Period Slots
  const slotsRows = SAMPLE_DATASET.periodSlots.map(([start, end], idx) => ({
    number: idx + 1,
    start_time: start,
    end_time: end,
    slot_type: 'lesson',
  }))
  assertSupabaseOk(await supabase.from('period_slots').insert(slotsRows), 'Insert period slots')

  // 7. Link Classes to Subjects
  const classSubjectMap: ClassSubjectMap = {}
  SAMPLE_DATASET.classes.forEach((classSeed) => {
    const classId = classMap.get(classSeed.name)?.id
    if (!classId) return
    classSubjectMap[classId] = classSeed.subjects
      .map((subjectName) => subjectMap.get(subjectName)?.id)
      .filter((value): value is string => Boolean(value))
  })
  await replaceClassSubjectMap(supabase, classSubjectMap)

  return {
    tag: DEV_SAMPLE_TAG,
    counts: {
      classes: insertedClasses.length,
      subjects: insertedSubjects.length,
      teachers: teacherEntities.length,
      periodSlots: slotsRows.length,
      terms: insertedTerms.length,
      classSubjectLinks: Object.values(classSubjectMap).reduce((total, ids) => total + ids.length, 0),
      events: 0,
    }
  }
}
