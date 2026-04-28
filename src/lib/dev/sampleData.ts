import { stringifyTeacherMeta } from '@/lib/teacher-meta'
import type { SupabaseClient } from '@supabase/supabase-js'

export const DEV_SAMPLE_TAG = '[DEV_SAMPLE_TIMABLE_V3]'

interface InsertedEntity {
  id: string
  name: string
  contact_info?: string
}

export const SAMPLE_DATASET = {
  classes: [
    ...Array.from({ length: 10 }, (_, i) => `Grade ${i + 1}`),
    '11 Science',
    '11 Commerce',
    '11 Humanities',
    '12 Science',
    '12 Commerce',
    '12 Humanities',
  ],
  subjects: [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Hindi',
    'Science',
    'Social Studies',
    'Computer Science',
    'Economics',
    'Business Studies',
    'Accountancy',
    'Political Science',
    'History',
    'Geography',
    'Physical Education',
    'Art',
    'Music',
  ],
  teachers: [
    { name: 'Mridul Sharma', code: 'TCH-001', subjectNames: ['Science'], classNames: ['Grade 3', 'Grade 4', 'Grade 10'] },
    { name: 'Aakash Verma', code: 'TCH-002', subjectNames: ['Chemistry'], classNames: ['11 Science', '12 Science'] },
    { name: 'Neha Kapoor', code: 'TCH-003', subjectNames: ['Mathematics'], classNames: ['Grade 6', 'Grade 7', 'Grade 8'] },
    { name: 'Riya Sen', code: 'TCH-004', subjectNames: ['English'], classNames: ['Grade 5', 'Grade 9', 'Grade 10'] },
    { name: 'Kunal Mehta', code: 'TCH-005', subjectNames: ['Physics'], classNames: ['11 Science', '12 Science'] },
    { name: 'Priya Nair', code: 'TCH-006', subjectNames: ['Biology'], classNames: ['Grade 9', 'Grade 10', '11 Science'] },
    { name: 'Arjun Rao', code: 'TCH-007', subjectNames: ['Computer Science'], classNames: ['Grade 8', 'Grade 9', '11 Science'] },
    { name: 'Simran Kaur', code: 'TCH-008', subjectNames: ['History'], classNames: ['Grade 6', 'Grade 7', 'Grade 8'] },
    { name: 'Dev Malhotra', code: 'TCH-009', subjectNames: ['Economics'], classNames: ['11 Commerce', '12 Commerce'] },
    { name: 'Sneha Joshi', code: 'TCH-010', subjectNames: ['Political Science'], classNames: ['11 Humanities', '12 Humanities'] },
    { name: 'Rahul Iyer', code: 'TCH-011', subjectNames: ['Mathematics', 'Physics'], classNames: ['Grade 9', 'Grade 10', '11 Science'] },
    { name: 'Anjali Das', code: 'TCH-012', subjectNames: ['English', 'History'], classNames: ['Grade 7', 'Grade 8', '11 Humanities'] },
    { name: 'Vivek Sinha', code: 'TCH-013', subjectNames: ['Accountancy', 'Business Studies'], classNames: ['11 Commerce', '12 Commerce'] },
    { name: 'Maya Pillai', code: 'TCH-014', subjectNames: ['Geography', 'Social Studies'], classNames: ['Grade 6', 'Grade 7', 'Grade 8'] },
    { name: 'Nitin Arora', code: 'TCH-015', subjectNames: ['Physical Education'], classNames: ['Grade 5', 'Grade 6', 'Grade 7'] },
    { name: 'Ishita Roy', code: 'TCH-016', subjectNames: ['Art', 'Music'], classNames: ['Grade 3', 'Grade 4', 'Grade 5'] },
    { name: 'Tarun Gill', code: 'TCH-017', subjectNames: ['Hindi', 'English'], classNames: ['Grade 8', 'Grade 9', 'Grade 10'] },
    { name: 'Pooja Menon', code: 'TCH-018', subjectNames: ['Biology', 'Chemistry'], classNames: ['11 Science', '12 Science'] },
    { name: 'Rohan Batra', code: 'TCH-019', subjectNames: ['Computer Science', 'Mathematics'], classNames: ['Grade 10', '11 Science', '12 Science'] },
    { name: 'Kriti Jain', code: 'TCH-020', subjectNames: ['Economics', 'Political Science'], classNames: ['11 Commerce', '11 Humanities', '12 Humanities'] },
    { name: 'Samar Kohli', code: 'TCH-021', subjectNames: ['Social Studies'], classNames: ['Grade 5', 'Grade 6', 'Grade 7'] },
    { name: 'Aditi Bansal', code: 'TCH-022', subjectNames: ['Science', 'Mathematics'], classNames: ['Grade 4', 'Grade 5', 'Grade 6'] },
    { name: 'Hemant Joshi', code: 'TCH-023', subjectNames: ['Physics', 'Computer Science'], classNames: ['11 Science', '12 Science'] },
    { name: 'Lavanya Rao', code: 'TCH-024', subjectNames: ['English', 'Economics'], classNames: ['Grade 10', '11 Commerce', '12 Commerce'] },
  ],
  periodSlots: [
    ['08:00', '08:45'],
    ['08:50', '09:35'],
    ['09:40', '10:25'],
    ['10:30', '11:15'],
    ['11:35', '12:20'],
    ['12:25', '13:10'],
    ['13:15', '14:00'],
    ['14:05', '14:50'],
  ],
}

function colorByName(name: string) {
  const colors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899']
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export async function resetSampleData(supabase: SupabaseClient) {
  await supabase.from('timetable_entries').delete().ilike('override_note', `${DEV_SAMPLE_TAG}%`)
  await supabase.from('events').delete().ilike('name', `${DEV_SAMPLE_TAG}%`)
  await supabase.from('teachers').delete().ilike('name', `${DEV_SAMPLE_TAG}%`)
  await supabase.from('subjects').delete().ilike('name', `${DEV_SAMPLE_TAG}%`)
  await supabase.from('classes').delete().ilike('name', `${DEV_SAMPLE_TAG}%`)
  await supabase.from('period_slots').delete().gte('number', 101)
  await supabase.from('terms').delete().ilike('name', `${DEV_SAMPLE_TAG}%`)
}

export async function generateSampleData(supabase: SupabaseClient) {
  await resetSampleData(supabase)

  const { data: term } = await supabase
    .from('terms')
    .insert({
      name: `${DEV_SAMPLE_TAG} Term 2026`,
      start_date: '2026-06-01',
      end_date: '2027-03-31',
      working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      is_active: true,
    })
    .select('*')
    .single()

  const classRows = SAMPLE_DATASET.classes.map((name) => ({
    name: `${DEV_SAMPLE_TAG} ${name}`,
    grade_level: name.startsWith('Grade') ? name.replace('Grade ', '') : name.split(' ')[0],
    section: name.includes(' ') ? name.split(' ').slice(1).join(' ') : null,
    periods_per_day: 8,
    room_id: `R-${Math.floor(Math.random() * 200 + 100)}`,
  }))
  const { data: insertedClasses } = await supabase.from('classes').insert(classRows).select('*')
  const classEntities = (insertedClasses ?? []) as InsertedEntity[]
  const classMap = new Map(classEntities.map((cls) => [cls.name.replace(`${DEV_SAMPLE_TAG} `, ''), cls]))

  const subjectRows = SAMPLE_DATASET.subjects.map((name) => ({
    name: `${DEV_SAMPLE_TAG} ${name}`,
    periods_per_week: ['Physics', 'Chemistry', 'Biology', 'Mathematics'].includes(name) ? 5 : 3,
    color_label: colorByName(name),
    category: ['Art', 'Music', 'Physical Education'].includes(name) ? 'elective' : 'core',
  }))
  const { data: insertedSubjects } = await supabase.from('subjects').insert(subjectRows).select('*')
  const subjectEntities = (insertedSubjects ?? []) as InsertedEntity[]
  const subjectMap = new Map(subjectEntities.map((sub) => [sub.name.replace(`${DEV_SAMPLE_TAG} `, ''), sub]))

  const teacherRows = SAMPLE_DATASET.teachers.map((teacher) => {
    const subjectIds = teacher.subjectNames
      .map((name) => subjectMap.get(name)?.id)
      .filter((value): value is string => Boolean(value))
    const classIds = teacher.classNames
      .map((name) => classMap.get(name)?.id)
      .filter((value): value is string => Boolean(value))
    const availability = {
      Mon: [1, 2, 3, 4, 5, 6],
      Tue: [1, 2, 3, 4, 5, 6, 7],
      Wed: [2, 3, 4, 5, 6, 7, 8],
      Thu: [1, 2, 3, 5, 6, 7],
      Fri: [1, 2, 4, 5, 6, 7, 8],
    }
    return {
      name: `${DEV_SAMPLE_TAG} ${teacher.name}`,
      subjects: subjectIds,
      max_periods_per_day: 6,
      availability,
      status: 'active',
      contact_info: stringifyTeacherMeta({ code: teacher.code, classIds, availability }),
    }
  })
  const { data: insertedTeachers } = await supabase.from('teachers').insert(teacherRows).select('*')
  const teacherEntities = (insertedTeachers ?? []) as InsertedEntity[]

  const teachersByCode = new Map(
    teacherEntities.map((teacher) => {
      const meta = JSON.parse(teacher.contact_info ?? '{}')
      return [meta.code as string, teacher]
    })
  )

  const subjectTeacherMap: Record<string, string[]> = {}
  SAMPLE_DATASET.teachers.forEach((teacher) => {
    teacher.subjectNames.forEach((subjectName) => {
      const subjectId = subjectMap.get(subjectName)?.id
      const teacherId = teachersByCode.get(teacher.code)?.id
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
  await supabase.from('period_slots').insert(slotsRows)

  const classSubjectMap: Record<string, string[]> = {}
  const teacherClassAssignment: Record<string, string[]> = {}
  SAMPLE_DATASET.teachers.forEach((teacher) => {
    const teacherId = teachersByCode.get(teacher.code)?.id
    if (!teacherId) return
    teacherClassAssignment[teacher.code] = teacher.classNames
    teacher.classNames.forEach((className) => {
      const classId = classMap.get(className)?.id
      if (!classId) return
      if (!classSubjectMap[classId]) classSubjectMap[classId] = []
      teacher.subjectNames.forEach((subjectName) => {
        const subjectId = subjectMap.get(subjectName)?.id
        if (subjectId) classSubjectMap[classId].push(subjectId)
      })
    })
  })
  Object.keys(classSubjectMap).forEach((classId) => {
    classSubjectMap[classId] = Array.from(new Set(classSubjectMap[classId]))
  })

  return {
    tag: DEV_SAMPLE_TAG,
    dataset: SAMPLE_DATASET,
    counts: {
      classes: insertedClasses?.length ?? 0,
      subjects: insertedSubjects?.length ?? 0,
      teachers: teacherEntities.length,
      periodSlots: slotsRows.length,
      terms: term ? 1 : 0,
    },
    classSubjectMap,
    teacherClassAssignment,
  }
}
