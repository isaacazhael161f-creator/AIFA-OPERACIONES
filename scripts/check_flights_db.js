
const { createClient } = require('@supabase/supabase-js');

// Config check
const SUPABASE_URL = 'https://fgstncvuuhpgyzmjceyr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnc3RuY3Z1dWhwZ3l6bWpjZXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzQ0NDQsImV4cCI6MjA4MTQ1MDQ0NH0.YEDIKuWt5iKUEI0BAvidINUz0aZBvQM0h6XRJ-uslB8';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing config');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
    console.log('Checking daily_flights_ops...');
    
    // Get all distinct dates
    const { data, error } = await supabase
        .from('daily_flights_ops')
        .select('fecha');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('Table is empty.');
    } else {
        const dates = [...new Set(data.map(r => r.fecha))];
        console.log('Found dates:', dates);
        
        // Show sample rows for the first date
        if (dates.length > 0) {
            const d = dates[0];
            const { data: rows } = await supabase.from('daily_flights_ops').select('*').eq('fecha', d).limit(5);
            console.log(`Sample rows for ${d}:`, rows);
        }
    }
}

checkData();
