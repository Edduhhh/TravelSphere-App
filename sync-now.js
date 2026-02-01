// Sincronizar datos de Supabase → SQLite para viajes existentes
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db = new Database('viajes_pro.db');

console.log('🔄 Sincronizando Supabase → SQLite...\n');

const viajes = db.prepare('SELECT id, codigo FROM viajes WHERE codigo IS NOT NULL').all();

for (const viaje of viajes) {
    const { data } = await supabase
        .from('trips')
        .select('voting_start_date, is_voting_open')
        .eq('code', viaje.codigo)
        .single();

    if (data?.voting_start_date) {
        db.prepare('UPDATE viajes SET voting_start_date = ? WHERE id = ?')
            .run(data.voting_start_date, viaje.id);
        console.log(`✅ ${viaje.codigo} → ${data.voting_start_date}`);
    } else {
        console.log(`⏭️  ${viaje.codigo} → sin fecha`);
    }
}

console.log('\n✅ Sincronización completada');
db.close();
