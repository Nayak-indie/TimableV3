'use client'

import { useState } from 'react'
import { Edit2, MoreHorizontal, Trash2, Info } from 'lucide-react'
import type { DayOfWeek, PeriodSlot, Subject, Teacher, TimetableEntry } from '@/types'
import { updateSessionState } from '@/lib/app-memory'
import MoreOptions from '@/components/ui/MoreOptions'

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
                className="flex-1 rounded-2xl px-3 py-2.5 border relative group transition-all"
                style={{
                  backgroundColor: subject ? `${subject.color_label}12` : 'var(--surface-secondary)',
                  borderColor: subject ? `${subject.color_label}30` : 'var(--border-color)',
                }}
              >
                <div className="pr-8">
                  <p className="text-sm font-semibold truncate" style={{ color: subject?.color_label ?? 'var(--text-primary)' }}>
                    {subject?.name ?? 'Free period'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{teacher?.name ?? ''}</p>
                </div>

                <div className="absolute right-2 top-2">
                  <MoreOptions 
                    options={[
                      { label: 'Edit Period', icon: <Edit2 size={14} />, onClick: () => alert('Edit period logic here') },
                      { label: 'View Details', icon: <Info size={14} />, onClick: () => alert('View details') },
                      { label: 'Remove', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => confirm('Remove this entry?') },
                    ]}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
