const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('timetable_entries').select('*, subject:subjects(name), teacher:teachers(name)').limit(10);
  console.log(JSON.stringify(data, null, 2));
}

check();
