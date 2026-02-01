import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function cleanSupabase() {
    console.log('🧹 Limpiando datos residuales en Supabase...\n');

    // Códigos problemáticos identificados
    const problematicCodes = ['9N6O', 'NA35', 'XN7X', 'BVDV'];

    console.log(`Reseteando ${problematicCodes.length} viajes problemáticos:\n`);
    problematicCodes.forEach(code => console.log(`  - ${code}`));
    console.log('');

    const { data, error } = await supabase
        .from('trips')
        .update({ is_voting_open: false })
        .in('code', problematicCodes)
        .select();

    if (error) {
        console.error('❌ Error:', error.message);
        return false;
    }

    console.log(`✅ Limpiados ${data.length} viajes exitosamente\n`);

    // Verificar limpieza
    console.log('🔍 Verificando limpieza...\n');
    const { data: allTrips } = await supabase
        .from('trips')
        .select('code, is_voting_open, voting_start_date');

    const stillProblematic = allTrips.filter(t => {
        if (!t.is_voting_open || !t.voting_start_date) return false;
        return new Date(t.voting_start_date) > new Date();
    });

    if (stillProblematic.length === 0) {
        console.log('✅ ¡Perfecto! No hay viajes con is_voting_open=true y fechas futuras.\n');
        return true;
    } else {
        console.log(`⚠️  Todavía hay ${stillProblematic.length} viajes problemáticos:\n`);
        stillProblematic.forEach(t => {
            console.log(`  - Code: ${t.code}, Fecha: ${t.voting_start_date}`);
        });
        return false;
    }
}

cleanSupabase().then(success => {
    if (success) {
        console.log('🎉 Limpieza completada exitosamente');
        process.exit(0);
    } else {
        console.log('⚠️  Limpieza completada con advertencias');
        process.exit(1);
    }
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
