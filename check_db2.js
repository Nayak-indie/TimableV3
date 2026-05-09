const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: teachers } = await supabase.from('teachers').select('id, name, subjects').limit(2);
  const { data: subjects } = await supabase.from('subjects').select('id, name, teacher_ids').limit(2);
  const { data: links } = await supabase.from('class_subject_links').select('*').limit(2);
  
  console.log("TEACHERS:", JSON.stringify(teachers, null, 2));
  console.log("SUBJECTS:", JSON.stringify(subjects, null, 2));
  console.log("LINKS:", JSON.stringify(links, null, 2));
}

check();
