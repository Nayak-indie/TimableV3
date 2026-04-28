create extension if not exists "uuid-ossp";

create table if not exists terms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_date date not null,
  end_date date not null,
  working_days text[] default array['Mon','Tue','Wed','Thu','Fri'],
  is_active boolean default false,
  created_at timestamptz default now()
);

create table if not exists period_slots (
  id uuid primary key default uuid_generate_v4(),
  number integer not null,
  start_time time not null,
  end_time time not null,
  slot_type text default 'lesson',
  created_at timestamptz default now()
);

create table if not exists teachers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subjects text[] default array[]::text[],
  max_periods_per_day integer default 6,
  availability jsonb default '{}',
  status text default 'active',
  contact_info text,
  created_at timestamptz default now()
);

create table if not exists classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  section text,
  grade_level text,
  periods_per_day integer default 6,
  room_id text,
  created_at timestamptz default now()
);

create table if not exists subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  periods_per_week integer not null default 4,
  teacher_ids uuid[] default array[]::uuid[],
  color_label text default '#6366f1',
  category text default 'core',
  created_at timestamptz default now()
);

create table if not exists timetable_entries (
  id uuid primary key default uuid_generate_v4(),
  term_id uuid references terms(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  teacher_id uuid references teachers(id),
  subject_id uuid references subjects(id),
  day text not null,
  period_number integer not null,
  is_override boolean default false,
  override_note text,
  override_date date,
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  term_id uuid references terms(id),
  name text not null,
  event_date date not null,
  event_type text default 'assembly',
  affected_class_ids uuid[] default array[]::uuid[],
  periods_blocked integer[] default array[]::integer[],
  affects_all_classes boolean default false,
  created_at timestamptz default now()
);

create table if not exists absences (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references teachers(id) on delete cascade,
  absence_date date not null,
  periods_affected integer[] default array[]::integer[],
  substitute_assignments jsonb default '{}',
  note text,
  created_at timestamptz default now()
);

create table if not exists change_log (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  changed_by text default 'admin',
  created_at timestamptz default now()
);

create index if not exists idx_timetable_entries_term on timetable_entries(term_id);
create index if not exists idx_timetable_entries_class on timetable_entries(class_id);
create index if not exists idx_timetable_entries_teacher on timetable_entries(teacher_id);
create index if not exists idx_timetable_entries_day_period on timetable_entries(day, period_number);
create index if not exists idx_absences_date on absences(absence_date);
create index if not exists idx_events_date on events(event_date);
