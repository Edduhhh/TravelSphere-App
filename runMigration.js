// Script para ejecutar la migración de fases en Supabase
// Ejecutar con: node runMigration.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// IMPORTANTE: Para ejecutar DDL (ALTER TABLE), necesitas la service_role_key
// Si solo tienes anon key, deberás ejecutar el SQL manualmente en el Dashboard
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🚀 Iniciando migración de base de datos...\n');

    try {
        // Leer el archivo SQL
        const sqlPath = join(__dirname, 'supabase', 'migrations', '20260119_add_trip_phases.sql');
        const sql = readFileSync(sqlPath, 'utf-8');

        console.log('📄 SQL a ejecutar:');
        console.log('-------------------');
        console.log(sql);
        console.log('-------------------\n');

        // Intentar ejecutar (requiere service_role_key para DDL)
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Error ejecutando migración:', error.message);
            console.log('\n⚠️  NOTA: Para ejecutar ALTER TABLE necesitas usar service_role_key');
            console.log('📋 OPCIÓN ALTERNATIVA: Copia el SQL de arriba y ejecútalo en:');
            console.log('   https://supabase.com/dashboard → SQL Editor\n');
            return false;
        }

        console.log('✅ Migración ejecutada exitosamente!');
        console.log(data);

        // Verificar que las columnas existen
        const { data: columns, error: checkError } = await supabase
            .from('trips')
            .select('*')
            .limit(1);

        if (!checkError && columns) {
            console.log('\n✅ Verificación: Columnas añadidas correctamente');
            if (columns[0]) {
                console.log('   - phase:', columns[0].phase || 'PLANNING (default)');
                console.log('   - voting_start_date:', columns[0].voting_start_date || 'null');
            }
        }

        return true;
    } catch (e) {
        console.error('💥 Error inesperado:', e);
        console.log('\n📋 Por favor, ejecuta el SQL manualmente en Supabase Dashboard');
        return false;
    }
}

// Ejecutar migración
runMigration().then(success => {
    if (success) {
        console.log('\n🎉 ¡Migración completada! Ya puedes recargar la aplicación.');
    } else {
        console.log('\n⚠️  Ejecuta la migración manualmente en el Dashboard de Supabase.');
    }
    process.exit(success ? 0 : 1);
});
