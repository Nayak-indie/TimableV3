import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fetchClassSubjectMap, replaceClassSubjectMap } from '@/lib/setup-links'

interface SubjectRow {
  id: string
  name: string
  teacher_ids: string[] | null
  created_at: string
}

interface TeacherRow {
  id: string
  subjects: string[] | null
}

interface TimetableEntryRow {
  id: string
  subject_id: string | null
}

function normalizeSubjectName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export async function POST() {
  const supabase = createServerSupabaseClient()

  const [subjectsRes, teachersRes, entriesRes] = await Promise.all([
    supabase.from('subjects').select('id,name,teacher_ids,created_at').order('created_at'),
    supabase.from('teachers').select('id,subjects'),
    supabase.from('timetable_entries').select('id,subject_id'),
  ])

  if (subjectsRes.error || teachersRes.error || entriesRes.error) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch data for subject merge.' }, { status: 500 })
  }

  const subjects = (subjectsRes.data ?? []) as SubjectRow[]
  const teachers = (teachersRes.data ?? []) as TeacherRow[]
  const entries = (entriesRes.data ?? []) as TimetableEntryRow[]

  const grouped = new Map<string, SubjectRow[]>()
  subjects.forEach((subject) => {
    const key = normalizeSubjectName(subject.name)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)?.push(subject)
  })

  const mergeMap: Record<string, string> = {}
  const mergedGroups: Array<{ canonicalId: string; removedIds: string[]; normalizedName: string }> = []

  grouped.forEach((items, normalizedName) => {
    if (items.length <= 1) return
    const sorted = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const canonical = sorted[0]
    const duplicates = sorted.slice(1)
    duplicates.forEach((dup) => {
      mergeMap[dup.id] = canonical.id
    })
    mergedGroups.push({
      canonicalId: canonical.id,
      removedIds: duplicates.map((dup) => dup.id),
      normalizedName,
    })
  })

  if (mergedGroups.length === 0) {
    return NextResponse.json({ ok: true, mergedGroups: [], mergeMap, message: 'No duplicate subjects found.' })
  }

  for (const teacher of teachers) {
    const oldSubjects = teacher.subjects ?? []
    const nextSubjects = Array.from(
      new Set(oldSubjects.map((subjectId) => mergeMap[subjectId] ?? subjectId))
    )
    if (JSON.stringify(oldSubjects) !== JSON.stringify(nextSubjects)) {
      await supabase.from('teachers').update({ subjects: nextSubjects }).eq('id', teacher.id)
    }
  }

  for (const entry of entries) {
    const subjectId = entry.subject_id
    if (!subjectId || !mergeMap[subjectId]) continue
    await supabase.from('timetable_entries').update({ subject_id: mergeMap[subjectId] }).eq('id', entry.id)
  }

  for (const group of mergedGroups) {
    const canonical = subjects.find((subject) => subject.id === group.canonicalId)
    const duplicateTeacherIds = subjects
      .filter((subject) => group.removedIds.includes(subject.id))
      .flatMap((subject) => subject.teacher_ids ?? [])
    const mergedTeacherIds = Array.from(new Set([...(canonical?.teacher_ids ?? []), ...duplicateTeacherIds]))
    await supabase.from('subjects').update({ teacher_ids: mergedTeacherIds }).eq('id', group.canonicalId)
  }

  const classSubjectMap = await fetchClassSubjectMap(supabase)
  const remappedClassSubjectMap = Object.fromEntries(
    Object.entries(classSubjectMap).map(([classId, subjectIds]) => [
      classId,
      Array.from(new Set(subjectIds.map((subjectId) => mergeMap[subjectId] ?? subjectId))),
    ])
  )
  await replaceClassSubjectMap(supabase, remappedClassSubjectMap)

  const allDuplicateIds = mergedGroups.flatMap((group) => group.removedIds)
  if (allDuplicateIds.length > 0) {
    await supabase.from('subjects').delete().in('id', allDuplicateIds)
  }

  revalidatePath('/')
  revalidatePath('/setup')
  revalidatePath('/changes')
  revalidatePath('/timetable')

  return NextResponse.json({
    ok: true,
    mergedGroups,
    mergeMap,
    removedCount: allDuplicateIds.length,
  })
}
