'use client'

import { useState } from 'react'
import type { DayOfWeek, PeriodSlot, Subject, Teacher, TimetableEntry } from '@/types'
import { updateSessionState } from '@/lib/app-memory'

interface TimetableGridProps {
  entries: TimetableEntry[]
  periodSlots: PeriodSlot[]
  teachers: Teacher[]
  subjects: Subject[]
  initialDay?: DayOfWeek
}

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function TimetableGrid({ entries, periodSlots, teachers, subjects, initialDay }: TimetableGridProps) {
  const [activeDay, setActiveDay] = useState<DayOfWeek>(initialDay ?? 'Mon')

  const getEntry = (period: number) => entries.find((entry) => entry.day === activeDay && entry.period_number === period)

  return (
    <div>
      <div className="flex gap-1 px-4 py-3 bg-white border-b border-indigo-100 overflow-x-auto">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => {
              setActiveDay(day)
              updateSessionState({ lastTimetableDay: day })
            }}
            className={activeDay === day ? 'px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white' : 'px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-indigo-50'}
          >
            {day}
          </button>
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {periodSlots.filter((slot) => slot.slot_type === 'lesson').map((slot) => {
          const entry = getEntry(slot.number)
          const subject = subjects.find((value) => value.id === entry?.subject_id)
          const teacher = teachers.find((value) => value.id === entry?.teacher_id)
          return (
            <div key={slot.id} className="w-full flex items-center gap-4 px-4 py-4 bg-white">
              <div className="w-14 text-center"><p className="text-lg font-bold">{slot.number}</p></div>
              <div
                className="flex-1 rounded-2xl px-3 py-2.5 border"
                style={{
                  backgroundColor: subject ? `${subject.color_label}18` : '#f8fafc',
                  borderColor: subject ? `${subject.color_label}40` : '#e5e7eb',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: subject?.color_label ?? '#475569' }}>{subject?.name ?? 'Free period'}</p>
                <p className="text-xs text-gray-500">{teacher?.name ?? ''}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
