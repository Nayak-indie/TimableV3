export const CLASS_SUBJECTS_KEY = 'timable_class_subject_constants'
export const SUBJECT_META_KEY = 'timable_subject_manual_meta'

export type ClassSubjectMap = Record<string, string[]>
export type SubjectManualMeta = Record<string, { shortName?: string; notes?: string }>

export function readClassSubjectMap(): ClassSubjectMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CLASS_SUBJECTS_KEY)
    return raw ? (JSON.parse(raw) as ClassSubjectMap) : {}
  } catch {
    return {}
  }
}

export function writeClassSubjectMap(map: ClassSubjectMap) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CLASS_SUBJECTS_KEY, JSON.stringify(map))
}

export function readSubjectManualMeta(): SubjectManualMeta {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(SUBJECT_META_KEY)
    return raw ? (JSON.parse(raw) as SubjectManualMeta) : {}
  } catch {
    return {}
  }
}

export function writeSubjectManualMeta(meta: SubjectManualMeta) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SUBJECT_META_KEY, JSON.stringify(meta))
}
