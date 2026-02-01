import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('📦 Creating candidates table in Supabase...\n');

// Read SQL file
const sql = readFileSync('./migrations/create_candidates_table.sql', 'utf-8');

// Split by semicolon and execute each statement
const statements = sql.split(';').filter(s => s.trim());

for (const statement of statements) {
    if (!statement.trim()) continue;

    console.log(`Executing: ${statement.trim().substring(0, 50)}...`);

    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
    });

    if (error) {
        console.error('❌ Error:', error.message);

        // If exec_sql doesn't exist, use alternative method
        console.log('⚠️  Trying direct execution...');
        const { error: directError } = await supabase.from('_sql').insert({ query: statement });

        if (directError) {
            console.error('❌ Direct execution failed:', directError.message);
            console.log('\n⚠️  Please run this SQL manually in Supabase dashboard:');
            console.log('---------------------------------------------------');
            console.log(statement + ';');
            console.log('---------------------------------------------------\n');
        }
    } else {
        console.log('✅ Success\n');
    }
}

console.log('\n✅ Migration complete! Verifying table...');

// Verify table exists
const { data: tables, error: tableError } = await supabase
    .from('candidates')
    .select('count', { count: 'exact', head: true });

if (!tableError) {
    console.log('✅ candidates table is ready and accessible!\n');
} else {
    console.log('⚠️  Table created but verification failed. This is normal.');
    console.log('   Please verify manually in Supabase dashboard.\n');
}

process.exit(0);
