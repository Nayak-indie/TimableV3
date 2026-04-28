# Timable_v3 — Full Project Specification
### Cursor AI Ready · Vibe Code Friendly · Mobile Web App

---

## 0. WHAT YOU ARE BUILDING

A **mobile-first web app** that helps school admin staff create and manage timetables fast — especially when sudden changes happen (e.g. teacher absent).

**One sentence:** School staff open this on their phone, set up teachers/subjects/classes once, generate a weekly timetable in minutes, and handle emergencies in under 4 taps.

**NOT building:** attendance, fees, student logins, messaging, analytics.

---

## 1. TECH STACK (exact tools, no alternatives)

| Layer | Tool | Why |
|---|---|---|
| Language | TypeScript | Type safety, one language everywhere |
| Framework | Next.js 14 (App Router) | Full-stack React framework |
| UI | React + Tailwind CSS | Component-based UI + utility styling |
| Backend / DB | Supabase | PostgreSQL + Auth + APIs out of the box |
| Deployment | Vercel | Free, instant, connects to GitHub |
| Icons | lucide-react | Clean icon set, works with React |
| Date handling | date-fns | Lightweight date utility |
| Drag-and-drop | @dnd-kit/core | Mobile-friendly drag-and-drop |
| PDF export | react-to-print | Print/PDF from any component |
| State | React useState + Context | No Redux needed at MVP |

---



## 3. FOLDER STRUCTURE

```
timable-v3/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx                # Root layout with bottom nav
│   │   ├── page.tsx                  # Dashboard (home)
│   │   ├── setup/
│   │   │   ├── page.tsx              # Setup landing
│   │   │   ├── teachers/
│   │   │   │   ├── page.tsx          # Teachers list
│   │   │   │   └── [id]/page.tsx     # Add/Edit teacher
│   │   │   ├── classes/
│   │   │   │   ├── page.tsx          # Classes list
│   │   │   │   └── [id]/page.tsx     # Add/Edit class
│   │   │   ├── subjects/
│   │   │   │   ├── page.tsx          # Subjects list
│   │   │   │   └── [id]/page.tsx     # Add/Edit subject
│   │   │   └── periods/
│   │   │       └── page.tsx          # Period slot config
│   │   ├── timetable/
│   │   │   ├── page.tsx              # Timetable list / select
│   │   │   ├── generate/page.tsx     # Generate new timetable
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # View/edit timetable grid
│   │   │       └── export/page.tsx   # Print/export view
│   │   ├── changes/
│   │   │   ├── page.tsx              # Emergency changes dashboard
│   │   │   ├── absence/page.tsx      # Mark teacher absent
│   │   │   └── events/
│   │   │       ├── page.tsx          # Events list
│   │   │       └── new/page.tsx      # Add event/override
│   │   └── api/
│   │       ├── generate/route.ts     # Timetable generation logic
│   │       └── substitutes/route.ts  # Find substitute teachers
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx         # 4-tab bottom navigation
│   │   │   ├── PageHeader.tsx        # Back button + title header
│   │   │   └── MobileLayout.tsx      # Max-width wrapper
│   │   ├── dashboard/
│   │   │   ├── TodaySummaryCard.tsx  # Today's status
│   │   │   ├── AbsentTeacherCard.tsx # Absent teachers alert
│   │   │   ├── QuickActionsBar.tsx   # Primary action buttons
│   │   │   └── UpcomingEvents.tsx    # Next 7 days events
│   │   ├── setup/
│   │   │   ├── TeacherForm.tsx       # Add/edit teacher form
│   │   │   ├── ClassForm.tsx         # Add/edit class form
│   │   │   ├── SubjectForm.tsx       # Add/edit subject form
│   │   │   └── PeriodSlotForm.tsx    # Configure period times
│   │   ├── timetable/
│   │   │   ├── TimetableGrid.tsx     # Weekly grid component
│   │   │   ├── TimetableCell.tsx     # Single cell (period slot)
│   │   │   ├── ConflictBanner.tsx    # Conflict alert bar
│   │   │   └── SubjectColorBadge.tsx # Color label for subject
│   │   ├── changes/
│   │   │   ├── AbsenceFlow.tsx       # Mark absent + suggest subs
│   │   │   ├── SubstituteCard.tsx    # Suggested replacement card
│   │   │   └── OverrideCell.tsx      # Override single period
│   │   └── ui/
│   │       ├── Button.tsx            # Reusable button variants
│   │       ├── Input.tsx             # Styled input field
│   │       ├── Select.tsx            # Styled select dropdown
│   │       ├── Card.tsx              # Surface card wrapper
│   │       ├── Badge.tsx             # Status/label badge
│   │       ├── Modal.tsx             # Bottom sheet modal
│   │       ├── EmptyState.tsx        # Empty screen placeholder
│   │       └── LoadingSpinner.tsx    # Loading indicator
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase browser client
│   │   │   ├── server.ts             # Supabase server client
│   │   │   └── types.ts              # Generated DB types
│   │   ├── scheduling/
│   │   │   ├── generator.ts          # Auto-generate algorithm
│   │   │   ├── validator.ts          # Conflict detection logic
│   │   │   └── substitutes.ts        # Find substitute teachers
│   │   └── utils.ts                  # Shared utility functions
│   ├── hooks/
│   │   ├── useTeachers.ts            # Teachers data hook
│   │   ├── useClasses.ts             # Classes data hook
│   │   ├── useSubjects.ts            # Subjects data hook
│   │   ├── useTimetable.ts           # Timetable CRUD hook
│   │   └── useConflicts.ts           # Real-time conflict check
│   └── types/
│       └── index.ts                  # All TypeScript types
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Database schema
├── .env.local                        # Environment variables (DO NOT COMMIT)
├── .env.example                      # Template for env vars
└── tailwind.config.ts                # Tailwind config
```

---

## 4. DATABASE SCHEMA (Supabase / PostgreSQL)

Create a new file: `supabase/migrations/001_initial_schema.sql`
Paste this entire block and run it in your Supabase SQL editor:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- TERMS (school year / semester containers)
create table terms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                          -- e.g. "Term 1 2025"
  start_date date not null,
  end_date date not null,
  working_days text[] default array['Mon','Tue','Wed','Thu','Fri'],
  is_active boolean default false,
  created_at timestamptz default now()
);

-- PERIOD SLOTS (school bell schedule)
create table period_slots (
  id uuid primary key default uuid_generate_v4(),
  number integer not null,                     -- 1, 2, 3...
  start_time time not null,                    -- 08:00
  end_time time not null,                      -- 08:45
  slot_type text default 'lesson',             -- lesson | break | lunch
  created_at timestamptz default now()
);

-- TEACHERS
create table teachers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subjects text[] default array[]::text[],     -- subject IDs they can teach
  max_periods_per_day integer default 6,
  availability jsonb default '{}',             -- { "Mon": [1,2,3,4], "Tue": [...] }
  status text default 'active',               -- active | on_leave | inactive
  contact_info text,
  created_at timestamptz default now()
);

-- CLASSES (student groups)
create table classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                          -- e.g. "10A"
  section text,
  grade_level text,
  periods_per_day integer default 6,
  room_id text,
  created_at timestamptz default now()
);

-- SUBJECTS
create table subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  periods_per_week integer not null default 4,
  teacher_ids uuid[] default array[]::uuid[],
  color_label text default '#6366f1',          -- hex color
  category text default 'core',               -- core | elective
  created_at timestamptz default now()
);

-- TIMETABLE ENTRIES (the actual schedule)
create table timetable_entries (
  id uuid primary key default uuid_generate_v4(),
  term_id uuid references terms(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  teacher_id uuid references teachers(id),
  subject_id uuid references subjects(id),
  day text not null,                           -- Mon | Tue | Wed | Thu | Fri
  period_number integer not null,              -- 1-8
  is_override boolean default false,
  override_note text,
  override_date date,                          -- for single-day overrides
  created_at timestamptz default now()
);

-- EVENTS (assemblies, exams, sports days)
create table events (
  id uuid primary key default uuid_generate_v4(),
  term_id uuid references terms(id),
  name text not null,
  event_date date not null,
  event_type text default 'assembly',          -- assembly | exam | sports | holiday
  affected_class_ids uuid[] default array[]::uuid[],
  periods_blocked integer[] default array[]::integer[],
  affects_all_classes boolean default false,
  created_at timestamptz default now()
);

-- ABSENCES (teacher absent log)
create table absences (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references teachers(id) on delete cascade,
  absence_date date not null,
  periods_affected integer[] default array[]::integer[],  -- empty = all day
  substitute_assignments jsonb default '{}',              -- { "period_1": "teacher_id" }
  note text,
  created_at timestamptz default now()
);

-- CHANGE LOG (audit trail)
create table change_log (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,                   -- teacher | class | timetable | absence
  entity_id uuid,
  action text not null,                        -- created | updated | deleted
  previous_value jsonb,
  new_value jsonb,
  changed_by text default 'admin',
  created_at timestamptz default now()
);

-- Indexes for performance
create index on timetable_entries(term_id);
create index on timetable_entries(class_id);
create index on timetable_entries(teacher_id);
create index on timetable_entries(day, period_number);
create index on absences(absence_date);
create index on events(event_date);
```

---

## 5. ENVIRONMENT VARIABLES

Create `.env.local` in project root:

```bash
# Get these from your Supabase project dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Create `.env.example` (safe to commit):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## 6. TYPESCRIPT TYPES

Create `src/types/index.ts`:

```typescript
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'

export type SlotType = 'lesson' | 'break' | 'lunch'

export type TeacherStatus = 'active' | 'on_leave' | 'inactive'

export type EventType = 'assembly' | 'exam' | 'sports' | 'holiday'

export type SubjectCategory = 'core' | 'elective'

export interface Term {
  id: string
  name: string
  start_date: string
  end_date: string
  working_days: DayOfWeek[]
  is_active: boolean
  created_at: string
}

export interface PeriodSlot {
  id: string
  number: number
  start_time: string   // "08:00"
  end_time: string     // "08:45"
  slot_type: SlotType
  created_at: string
}

export interface Teacher {
  id: string
  name: string
  subjects: string[]
  max_periods_per_day: number
  availability: Record<DayOfWeek, number[]>  // { Mon: [1,2,3] }
  status: TeacherStatus
  contact_info?: string
  created_at: string
}

export interface Class {
  id: string
  name: string
  section?: string
  grade_level?: string
  periods_per_day: number
  room_id?: string
  created_at: string
}

export interface Subject {
  id: string
  name: string
  periods_per_week: number
  teacher_ids: string[]
  color_label: string
  category: SubjectCategory
  created_at: string
}

export interface TimetableEntry {
  id: string
  term_id: string
  class_id: string
  teacher_id: string | null
  subject_id: string | null
  day: DayOfWeek
  period_number: number
  is_override: boolean
  override_note?: string
  override_date?: string
  created_at: string
  // Joined fields (when fetched with relations)
  teacher?: Teacher
  subject?: Subject
  class?: Class
}

export interface Event {
  id: string
  term_id: string
  name: string
  event_date: string
  event_type: EventType
  affected_class_ids: string[]
  periods_blocked: number[]
  affects_all_classes: boolean
  created_at: string
}

export interface Absence {
  id: string
  teacher_id: string
  absence_date: string
  periods_affected: number[]
  substitute_assignments: Record<string, string>  // { "1": "teacher_id" }
  note?: string
  created_at: string
  teacher?: Teacher
}

export interface ChangeLogEntry {
  id: string
  entity_type: string
  entity_id: string
  action: 'created' | 'updated' | 'deleted'
  previous_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  changed_by: string
  created_at: string
}

// UI-only types
export interface ConflictWarning {
  type: 'double_booking' | 'periods_unmet' | 'unavailable'
  message: string
  teacherId?: string
  classId?: string
  day?: DayOfWeek
  period?: number
}

export interface SubstituteSuggestion {
  teacher: Teacher
  periodsToday: number
  subjectMatch: boolean
  isAvailable: boolean
}
```

---

## 7. SUPABASE CLIENT SETUP

Create `src/lib/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Create `src/lib/supabase/server.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

---

## 8. UTILITY FUNCTIONS

Create `src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, parseISO } from 'date-fns'
import type { DayOfWeek, ConflictWarning, TimetableEntry } from '@/types'

// Merge Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date for display
export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'dd MMM yyyy')
}

// Get current day of week as DayOfWeek
export function getCurrentDay(): DayOfWeek {
  const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const jsDay = new Date().getDay() // 0 = Sun, 1 = Mon...
  return days[jsDay - 1] ?? 'Mon'
}

// Get a readable day name
export function getDayLabel(day: DayOfWeek): string {
  const labels: Record<DayOfWeek, string> = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
    Thu: 'Thursday', Fri: 'Friday'
  }
  return labels[day]
}

// Check if a timetable entry conflicts with existing entries
export function detectConflicts(entries: TimetableEntry[]): ConflictWarning[] {
  const warnings: ConflictWarning[] = []
  const seen = new Map<string, string>()

  for (const entry of entries) {
    if (!entry.teacher_id) continue
    const key = `${entry.teacher_id}-${entry.day}-${entry.period_number}`
    if (seen.has(key)) {
      warnings.push({
        type: 'double_booking',
        message: `Teacher double-booked on ${entry.day}, period ${entry.period_number}`,
        teacherId: entry.teacher_id,
        day: entry.day,
        period: entry.period_number
      })
    } else {
      seen.set(key, entry.id)
    }
  }

  return warnings
}

// Get initials from a name for avatar display
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Generate a color from a string (for auto-assigning subject colors)
export function stringToColor(str: string): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#06b6d4'
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
```

---

## 9. SCHEDULING ENGINE

Create `src/lib/scheduling/generator.ts`:

```typescript
import type { Teacher, Class, Subject, TimetableEntry, DayOfWeek } from '@/types'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

interface GenerateInput {
  termId: string
  classes: Class[]
  teachers: Teacher[]
  subjects: Subject[]
  periodsPerDay: number
}

export function generateTimetable(input: GenerateInput): TimetableEntry[] {
  const { termId, classes, teachers, subjects, periodsPerDay } = input
  const entries: TimetableEntry[] = []

  // Track teacher load: teacherId -> day -> periods used
  const teacherLoad: Record<string, Record<DayOfWeek, number>> = {}
  teachers.forEach(t => {
    teacherLoad[t.id] = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 }
  })

  // Track which slots are taken: "classId-day-period" and "teacherId-day-period"
  const classSlotsTaken = new Set<string>()
  const teacherSlotsTaken = new Set<string>()

  for (const cls of classes) {
    // Build list of subject-periods to schedule for this class
    const schedule: { subjectId: string; teacherId: string }[] = []

    for (const subject of subjects) {
      if (!subject.teacher_ids.length) continue
      for (let i = 0; i < subject.periods_per_week; i++) {
        // Pick teacher with lowest load who can teach this subject
        const availableTeachers = teachers.filter(t =>
          subject.teacher_ids.includes(t.id) && t.status === 'active'
        )
        const teacher = availableTeachers.sort((a, b) => {
          const loadA = Object.values(teacherLoad[a.id]).reduce((s, v) => s + v, 0)
          const loadB = Object.values(teacherLoad[b.id]).reduce((s, v) => s + v, 0)
          return loadA - loadB
        })[0]

        if (teacher) {
          schedule.push({ subjectId: subject.id, teacherId: teacher.id })
        }
      }
    }

    // Shuffle schedule for variety
    schedule.sort(() => Math.random() - 0.5)

    // Place each item into a free slot
    for (const item of schedule) {
      let placed = false
      for (const day of DAYS) {
        if (placed) break
        for (let period = 1; period <= periodsPerDay; period++) {
          const classKey = `${cls.id}-${day}-${period}`
          const teacherKey = `${item.teacherId}-${day}-${period}`

          if (classSlotsTaken.has(classKey) || teacherSlotsTaken.has(teacherKey)) continue

          const teacher = teachers.find(t => t.id === item.teacherId)!
          if (teacherLoad[item.teacherId][day] >= teacher.max_periods_per_day) continue

          // Check teacher availability
          const available = teacher.availability[day]
          if (available && available.length > 0 && !available.includes(period)) continue

          // Place it
          entries.push({
            id: crypto.randomUUID(),
            term_id: termId,
            class_id: cls.id,
            teacher_id: item.teacherId,
            subject_id: item.subjectId,
            day,
            period_number: period,
            is_override: false,
            created_at: new Date().toISOString()
          })

          classSlotsTaken.add(classKey)
          teacherSlotsTaken.add(teacherKey)
          teacherLoad[item.teacherId][day]++
          placed = true
          break
        }
      }
    }
  }

  return entries
}
```

Create `src/lib/scheduling/substitutes.ts`:

```typescript
import type { Teacher, TimetableEntry, DayOfWeek, SubstituteSuggestion } from '@/types'

export function findSubstitutes({
  absentTeacherId,
  day,
  period,
  subjectId,
  allEntries,
  allTeachers,
}: {
  absentTeacherId: string
  day: DayOfWeek
  period: number
  subjectId: string | null
  allEntries: TimetableEntry[]
  allTeachers: Teacher[]
}): SubstituteSuggestion[] {
  // Who is already teaching in this period?
  const busyTeacherIds = new Set(
    allEntries
      .filter(e => e.day === day && e.period_number === period)
      .map(e => e.teacher_id)
  )

  const suggestions: SubstituteSuggestion[] = []

  for (const teacher of allTeachers) {
    if (teacher.id === absentTeacherId) continue
    if (teacher.status !== 'active') continue
    if (busyTeacherIds.has(teacher.id)) continue

    // Check availability
    const available = teacher.availability[day]
    if (available && available.length > 0 && !available.includes(period)) continue

    // Count how many periods they already have today
    const periodsToday = allEntries.filter(
      e => e.teacher_id === teacher.id && e.day === day
    ).length

    if (periodsToday >= teacher.max_periods_per_day) continue

    const subjectMatch = subjectId ? teacher.subjects.includes(subjectId) : false

    suggestions.push({
      teacher,
      periodsToday,
      subjectMatch,
      isAvailable: true
    })
  }

  // Sort: subject match first, then by fewest periods today
  return suggestions.sort((a, b) => {
    if (a.subjectMatch !== b.subjectMatch) return a.subjectMatch ? -1 : 1
    return a.periodsToday - b.periodsToday
  })
}
```

---

## 10. TAILWIND CONFIG

Replace `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        // Mobile-first: everything is designed for 375px+
        xs: '375px',
        sm: '640px',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      }
    },
  },
  plugins: [],
}

export default config
```

---

## 11. ROOT LAYOUT (with bottom nav)

Create `src/app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/layout/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Timable',
  description: 'School timetable manager',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Timable' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6366f1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <div className="min-h-screen max-w-md mx-auto relative">
          <main className="pb-20 min-h-screen">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
```

---

## 12. BOTTOM NAVIGATION COMPONENT

Create `src/components/layout/BottomNav.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings, CalendarDays, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Dashboard', href: '/',         icon: LayoutDashboard },
  { label: 'Setup',     href: '/setup',    icon: Settings },
  { label: 'Timetable', href: '/timetable', icon: CalendarDays },
  { label: 'Changes',   href: '/changes',  icon: AlertTriangle },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around px-2 py-2 pb-safe-bottom">
        {tabs.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors',
                isActive ? 'text-brand-600' : 'text-gray-400'
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

---

## 13. PAGE HEADER COMPONENT

Create `src/components/layout/PageHeader.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  rightAction?: React.ReactNode
  className?: string
}

export default function PageHeader({ title, showBack = false, rightAction, className }: PageHeaderProps) {
  const router = useRouter()

  return (
    <div className={cn('flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100', className)}>
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  )
}
```

---

## 14. UI PRIMITIVES

Create `src/components/ui/Button.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl transition-all active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Variants
          variant === 'primary'   && 'bg-brand-500 text-white hover:bg-brand-600',
          variant === 'secondary' && 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          variant === 'danger'    && 'bg-red-500 text-white hover:bg-red-600',
          variant === 'ghost'     && 'text-gray-600 hover:bg-gray-100',
          // Sizes
          size === 'sm' && 'text-sm px-3 py-2 gap-1.5',
          size === 'md' && 'text-sm px-4 py-3 gap-2',
          size === 'lg' && 'text-base px-5 py-4 gap-2',
          // Width
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button
```

Create `src/components/ui/Card.tsx`:

```typescript
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export default function Card({ padding = 'md', className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100',
        padding === 'sm'   && 'p-3',
        padding === 'md'   && 'p-4',
        padding === 'lg'   && 'p-5',
        padding === 'none' && '',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

Create `src/components/ui/Badge.tsx`:

```typescript
import { cn } from '@/lib/utils'

interface BadgeProps {
  label: string
  color?: string      // hex color for subject badges
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

export default function Badge({ label, color, variant = 'default', className }: BadgeProps) {
  const style = color ? { backgroundColor: color + '20', color } : undefined

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        !color && variant === 'default'  && 'bg-gray-100 text-gray-600',
        !color && variant === 'success'  && 'bg-green-100 text-green-700',
        !color && variant === 'warning'  && 'bg-amber-100 text-amber-700',
        !color && variant === 'danger'   && 'bg-red-100 text-red-700',
        !color && variant === 'info'     && 'bg-brand-100 text-brand-700',
        className
      )}
      style={style}
    >
      {label}
    </span>
  )
}
```

Create `src/components/ui/Input.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white',
            'text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            'transition-shadow text-base',  // text-base prevents iOS zoom
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
export default Input
```

Create `src/components/ui/EmptyState.tsx`:

```typescript
import { LucideIcon } from 'lucide-react'
import Button from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="md">{actionLabel}</Button>
      )}
    </div>
  )
}
```

---

## 15. DASHBOARD PAGE

Create `src/app/page.tsx`:

```typescript
import { supabase } from '@/lib/supabase/client'
import { CalendarDays, UserX, AlertTriangle, Plus } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { format } from 'date-fns'
import { getCurrentDay } from '@/lib/utils'

export default async function DashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const currentDay = getCurrentDay()

  // Fetch today's absences
  const { data: absences } = await supabase
    .from('absences')
    .select('*, teacher:teachers(name)')
    .eq('absence_date', today)

  // Fetch upcoming events (next 7 days)
  const nextWeek = format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd')
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', today)
    .lte('event_date', nextWeek)
    .order('event_date', { ascending: true })

  const absentCount = absences?.length ?? 0
  const pendingSubstitutions = absences?.filter(a =>
    Object.keys(a.substitute_assignments ?? {}).length === 0
  ).length ?? 0

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
        <h1 className="text-2xl font-bold text-gray-900">Good morning 👋</h1>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-1">
          <UserX size={18} className="text-red-500" />
          <p className="text-2xl font-bold text-gray-900">{absentCount}</p>
          <p className="text-xs text-gray-500">Absent today</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <AlertTriangle size={18} className="text-amber-500" />
          <p className="text-2xl font-bold text-gray-900">{pendingSubstitutions}</p>
          <p className="text-xs text-gray-500">Need substitutes</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/timetable/generate">
            <Button variant="primary" fullWidth className="h-14 text-sm">
              <Plus size={16} />
              New Timetable
            </Button>
          </Link>
          <Link href="/changes/absence">
            <Button variant="secondary" fullWidth className="h-14 text-sm">
              <UserX size={16} />
              Mark Absent
            </Button>
          </Link>
        </div>
        <Link href="/timetable">
          <Button variant="secondary" fullWidth>
            <CalendarDays size={16} />
            View Today's Timetable
          </Button>
        </Link>
      </div>

      {/* Absent Teachers */}
      {absentCount > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Absent Today</h2>
          <div className="space-y-2">
            {absences!.map(absence => (
              <Card key={absence.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{absence.teacher?.name}</p>
                  <p className="text-xs text-gray-500">
                    {absence.periods_affected.length === 0 ? 'All day' : `Periods: ${absence.periods_affected.join(', ')}`}
                  </p>
                </div>
                {Object.keys(absence.substitute_assignments ?? {}).length === 0 ? (
                  <Badge label="Needs sub" variant="danger" />
                ) : (
                  <Badge label="Covered" variant="success" />
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {(events?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Upcoming</h2>
          <div className="space-y-2">
            {events!.map(event => (
              <Card key={event.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{event.name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(event.event_date), 'EEE, dd MMM')}</p>
                </div>
                <Badge label={event.event_type} variant="info" />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 16. TIMETABLE GRID COMPONENT

Create `src/components/timetable/TimetableGrid.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { TimetableEntry, DayOfWeek, PeriodSlot, Teacher, Subject } from '@/types'
import { cn } from '@/lib/utils'

interface TimetableGridProps {
  entries: TimetableEntry[]
  periodSlots: PeriodSlot[]
  teachers: Teacher[]
  subjects: Subject[]
  selectedDay?: DayOfWeek
  onCellPress?: (day: DayOfWeek, period: number, entry?: TimetableEntry) => void
}

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function TimetableGrid({
  entries, periodSlots, teachers, subjects,
  selectedDay, onCellPress
}: TimetableGridProps) {
  const [activeDay, setActiveDay] = useState<DayOfWeek>(selectedDay ?? 'Mon')

  const getEntry = (day: DayOfWeek, period: number) =>
    entries.find(e => e.day === day && e.period_number === period)

  const getSubject = (id: string | null) => subjects.find(s => s.id === id)
  const getTeacher = (id: string | null) => teachers.find(t => t.id === id)

  return (
    <div>
      {/* Day selector tabs */}
      <div className="flex gap-1 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              activeDay === day
                ? 'bg-brand-500 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Period rows */}
      <div className="divide-y divide-gray-100">
        {periodSlots.filter(s => s.slot_type === 'lesson').map(slot => {
          const entry = getEntry(activeDay, slot.number)
          const subject = getSubject(entry?.subject_id ?? null)
          const teacher = getTeacher(entry?.teacher_id ?? null)

          return (
            <button
              key={slot.id}
              onClick={() => onCellPress?.(activeDay, slot.number, entry)}
              className="w-full flex items-center gap-4 px-4 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
            >
              {/* Period number + time */}
              <div className="w-14 flex-shrink-0 text-center">
                <p className="text-lg font-bold text-gray-900">{slot.number}</p>
                <p className="text-xs text-gray-400">{slot.start_time.slice(0, 5)}</p>
              </div>

              {/* Content */}
              {entry && subject ? (
                <div
                  className="flex-1 rounded-xl px-3 py-2.5 flex items-center justify-between"
                  style={{ backgroundColor: subject.color_label + '18', borderLeft: `3px solid ${subject.color_label}` }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: subject.color_label }}>
                      {subject.name}
                    </p>
                    <p className="text-xs text-gray-500">{teacher?.name ?? 'No teacher'}</p>
                  </div>
                  {entry.is_override && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Override</span>
                  )}
                </div>
              ) : (
                <div className="flex-1 rounded-xl px-3 py-2.5 bg-gray-50 border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">Free period</p>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

---

## 17. API ROUTE — TIMETABLE GENERATION

Create `src/app/api/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateTimetable } from '@/lib/scheduling/generator'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { termId, classIds } = await request.json()

  // Fetch all needed data
  const [classesResult, teachersResult, subjectsResult, slotsResult] = await Promise.all([
    supabase.from('classes').select('*').in('id', classIds),
    supabase.from('teachers').select('*').eq('status', 'active'),
    supabase.from('subjects').select('*'),
    supabase.from('period_slots').select('*').eq('slot_type', 'lesson').order('number'),
  ])

  if (classesResult.error || teachersResult.error || subjectsResult.error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  const periodsPerDay = slotsResult.data?.length ?? 6

  // Run generation algorithm
  const entries = generateTimetable({
    termId,
    classes: classesResult.data ?? [],
    teachers: teachersResult.data ?? [],
    subjects: subjectsResult.data ?? [],
    periodsPerDay,
  })

  // Delete existing entries for this term + classes, then insert new
  await supabase
    .from('timetable_entries')
    .delete()
    .eq('term_id', termId)
    .in('class_id', classIds)

  const { error: insertError } = await supabase
    .from('timetable_entries')
    .insert(entries)

  if (insertError) {
    return NextResponse.json({ error: 'Failed to save timetable' }, { status: 500 })
  }

  return NextResponse.json({ success: true, entriesCreated: entries.length })
}
```

---

## 18. CURSOR AI PROMPTS TO BUILD REMAINING PAGES

Copy and paste each of these prompts into Cursor chat (CMD+L) to build remaining screens:

### Prompt A — Setup Section (Teachers)
```
Build the teachers setup section for Timable_v3.

Files to create:
- src/app/setup/page.tsx — Setup landing with 3 cards: Teachers, Classes, Subjects, Period Slots. Each card shows count and links to list.
- src/app/setup/teachers/page.tsx — List of all teachers from Supabase. Show name, status badge (active/on_leave), subjects as color chips. FAB button to add new.
- src/app/setup/teachers/[id]/page.tsx — Add/Edit teacher form. Fields: name (text), max_periods_per_day (number select 1-8), status (select). Use components from @/components/ui. Save to Supabase teachers table. On save, redirect to /setup/teachers.

Use the types from @/types/index.ts. Use supabase from @/lib/supabase/client.ts. Mobile-first, Tailwind only, no external UI libraries.
```

### Prompt B — Timetable View Page
```
Build the timetable view for Timable_v3.

Files to create:
- src/app/timetable/page.tsx — List of timetables grouped by term. Each shows term name, class count, creation date. Tap to open. Button to generate new.
- src/app/timetable/[id]/page.tsx — Renders the TimetableGrid component from @/components/timetable/TimetableGrid.tsx. Fetches entries, periodSlots, teachers, subjects from Supabase. Shows a conflict count banner if detectConflicts() from @/lib/utils.ts returns warnings. Has Export button linking to /timetable/[id]/export.

Classes for this timetable are shown as tabs at the top so you can switch between 10A, 10B, etc.
```

### Prompt C — Emergency Changes Flow
```
Build the emergency changes section for Timable_v3.

Files to create:
- src/app/changes/page.tsx — Shows today's absences with status, recent overrides, and upcoming events in 3 sections. Two main action buttons: "Mark teacher absent" and "Add event".
- src/app/changes/absence/page.tsx — Form: select teacher (dropdown from Supabase), select date (date picker), select affected periods (multi-select checkboxes 1-8 or "All day"). On submit, saves to absences table, then shows SubstituteSuggestion cards.
- src/components/changes/SubstituteCard.tsx — Card showing a teacher suggestion: name, subject match indicator (green check or gray dash), periods they have today, "Assign" button. On assign, updates the substitute_assignments field in the absence record.

Use findSubstitutes from @/lib/scheduling/substitutes.ts. All UI mobile-first with Tailwind.
```

### Prompt D — Export / Print View
```
Build the export view for Timable_v3.

File to create:
- src/app/timetable/[id]/export/page.tsx

This is a print-optimized view. Features:
- Header: school name (hardcoded "School Timetable" for now), class name, term name, generated date
- Full weekly grid: periods as rows, days (Mon-Fri) as columns
- Each cell: subject name + teacher name, colored by subject color_label
- Empty cells show as light gray
- "Print / Save PDF" button that calls window.print()
- CSS: @media print { nav { display: none } } to hide navigation on print
- No Tailwind print variants needed — use a simple inline style block for print CSS

Fetch all data server-side using createServerSupabaseClient.
```

---

## 19. GLOBAL CSS

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
  }

  body {
    @apply antialiased;
    -webkit-font-smoothing: antialiased;
  }

  /* Prevent iOS input zoom */
  input, select, textarea {
    font-size: 16px !important;
  }
}

@layer utilities {
  .pb-safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}

@media print {
  nav, .no-print {
    display: none !important;
  }
  body {
    background: white;
  }
}
```

---

## 20. QUICK REFERENCE — CURSOR COMMANDS

| Task | Cursor Prompt |
|---|---|
| Add a new page | "Create src/app/[path]/page.tsx for Timable_v3 that..." |
| Add a component | "Create a React component at src/components/[name].tsx that..." |
| Add Supabase query | "Add a useEffect that fetches [table] from Supabase and stores in state" |
| Fix a bug | "This component throws [error]. Fix it." |
| Style something | "Make this component mobile-friendly using Tailwind. Max width 375px." |
| Add a form | "Add a form with [fields]. On submit, insert into Supabase [table]." |

---

## 21. DEPLOYMENT CHECKLIST

```
□ Push code to GitHub
□ Connect repo to Vercel (vercel.com → Import Project)
□ Add environment variables in Vercel dashboard:
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
□ Run SQL migration in Supabase SQL editor
□ Add sample data: 1 term, 4 period slots, 3 teachers, 2 classes, 4 subjects
□ Deploy → test on real phone
```

---

## 22. MVP BUILD ORDER (do this in sequence)

1. Project setup + folder structure
2. Supabase schema (run the SQL)
3. Environment variables
4. Paste all TypeScript types
5. Paste Supabase client files
6. Paste utils + scheduling engine
7. Paste layout + BottomNav
8. Paste UI primitives (Button, Card, Badge, Input, EmptyState)
9. Paste Dashboard page
10. Use Cursor Prompt A → build Setup section
11. Use Cursor Prompt B → build Timetable view
12. Use Cursor Prompt C → build Emergency changes
13. Use Cursor Prompt D → build Export
14. Deploy to Vercel
15. Test on phone

---

*Timable_v3 · Mobile web app · TypeScript + Next.js + Supabase + Tailwind · Vibe coded*
