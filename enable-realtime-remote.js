import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY; // Necesita SERVICE_KEY para alterar DB

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltan credenciales de Supabase en .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔄 Intentando habilitar Realtime via SQL...');

const sql = `
do $$
begin
  -- Habilitar realtime
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and tablename = 'trips'
  ) then
    alter publication supabase_realtime add table trips;
  end if;
end
$$;
`;

const run = async () => {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }); // Solo si tienes una funcion exec_sql

    // Si no hay función RPC, intentamos via REST (limitado) o informamos al usuario
    if (error) {
        console.log('⚠️ No se pudo ejecutar SQL directamente (normal si no hay RPC configurado).');
        console.log('👉 POR FAVOR: Ve a tu Dashboard de Supabase -> SQL Editor y ejecuta esto:');
        console.log('\n----------------------------------------');
        console.log("alter publication supabase_realtime add table trips;");
        console.log('\n----------------------------------------\n');
    } else {
        console.log('✅ SQL ejecutado correctamente');
    }
};

run();
