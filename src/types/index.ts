export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
export type SlotType = "lesson" | "break" | "lunch";
export type TeacherStatus = "active" | "on_leave" | "inactive";
export type EventType = "assembly" | "exam" | "sports" | "holiday";
export type SubjectCategory = "core" | "elective";

export interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  working_days: DayOfWeek[];
  is_active: boolean;
  created_at: string;
}

export interface Teacher {
  id: string;
  name: string;
  subjects: string[];
  max_periods_per_day: number;
  availability: Record<DayOfWeek, number[]>;
  status: TeacherStatus;
  contact_info?: string;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  section?: string;
  grade_level?: string;
  periods_per_day: number;
  room_id?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  periods_per_week: number;
  teacher_ids: string[];
  color_label: string;
  category: SubjectCategory;
  created_at: string;
}

export interface PeriodSlot {
  id: string;
  number: number;
  start_time: string;
  end_time: string;
  slot_type: SlotType;
  created_at: string;
}

export interface TimetableEntry {
  id: string;
  term_id: string;
  class_id: string;
  teacher_id: string | null;
  subject_id: string | null;
  day: DayOfWeek;
  period_number: number;
  is_override: boolean;
  override_note?: string;
  override_date?: string;
  created_at: string;
  teacher?: Teacher;
  subject?: Subject;
  class?: Class;
}

export interface Event {
  id: string;
  term_id: string | null;
  name: string;
  event_date: string;
  event_type: EventType;
  affected_class_ids: string[];
  periods_blocked: number[];
  affects_all_classes: boolean;
  created_at: string;
}

export interface ConflictWarning {
  type: "double_booking" | "periods_unmet" | "unavailable";
  message: string;
  teacherId?: string;
  classId?: string;
  day?: DayOfWeek;
  period?: number;
}

export interface SubstituteSuggestion {
  teacher: Teacher;
  periodsToday: number;
  subjectMatch: boolean;
  isAvailable: boolean;
}
