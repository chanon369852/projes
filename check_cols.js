const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkColumns() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase.from('chat_conversations').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns in chat_conversations:', Object.keys(data[0]));
  } else {
    // If empty, we can't see columns this way easily without the API. 
    // But we can try to insert a dummy row.
    console.log('Table is empty, trying to insert dummy');
    const { data: insData, error: insErr } = await supabase.from('chat_conversations').insert({title: 'test'}).select();
    if (insErr) {
      console.log('Insert error:', insErr.message);
    } else {
      console.log('Inserted columns:', Object.keys(insData[0]));
      // Clean up
      await supabase.from('chat_conversations').delete().eq('id', insData[0].id);
    }
  }
}
checkColumns();
