import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClassSubjectMap } from '@/lib/setup-constants'

export interface ClassSubjectLinkRow {
  class_id: string
  subject_id: string
}

export async function fetchClassSubjectMap(supabase: SupabaseClient): Promise<ClassSubjectMap> {
  const { data, error } = await supabase.from('class_subject_links').select('class_id, subject_id')
  if (error || !data) return {}

  return data.reduce<ClassSubjectMap>((acc, row) => {
    if (!acc[row.class_id]) acc[row.class_id] = []
    acc[row.class_id].push(row.subject_id)
    return acc
  }, {})
}

export async function replaceClassSubjectLinks(
  supabase: SupabaseClient,
  classId: string,
  subjectIds: string[]
) {
  await supabase.from('class_subject_links').delete().eq('class_id', classId)
  if (subjectIds.length === 0) return

  const rows = subjectIds.map((subjectId) => ({
    class_id: classId,
    subject_id: subjectId,
  }))
  await supabase.from('class_subject_links').insert(rows)
}

export async function replaceClassSubjectMap(
  supabase: SupabaseClient,
  classSubjectMap: ClassSubjectMap
) {
  const classIds = Object.keys(classSubjectMap)
  if (classIds.length > 0) {
    await supabase.from('class_subject_links').delete().in('class_id', classIds)
  }

  const rows = Object.entries(classSubjectMap).flatMap(([classId, subjectIds]) =>
    subjectIds.map((subjectId) => ({
      class_id: classId,
      subject_id: subjectId,
    }))
  )

  if (rows.length > 0) {
    await supabase.from('class_subject_links').insert(rows)
  }
}

