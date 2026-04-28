create table if not exists class_subject_links (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  created_at timestamptz default now(),
  unique(class_id, subject_id)
);

create index if not exists idx_class_subject_links_class on class_subject_links(class_id);
create index if not exists idx_class_subject_links_subject on class_subject_links(subject_id);

