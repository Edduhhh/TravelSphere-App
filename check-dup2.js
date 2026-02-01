import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function checkDuplicates() {
    console.log('🔍 Verificando códigos en Supabase...\n');

    const { data: cloudTrips } = await supabase
        .from('trips')
        .select('code, name, created_at')
        .order('created_at', { ascending: true });

    console.log(`☁️  Total de viajes en Supabase: ${cloudTrips.length}\n`);

    // Detectar duplicados
    const cloudCodes = {};
    const cloudDuplicates = [];

    cloudTrips.forEach(t => {
        if (cloudCodes[t.code]) {
            cloudDuplicates.push(t.code);
        }
        cloudCodes[t.code] = (cloudCodes[t.code] || 0) + 1;
    });

    if (cloudDuplicates.length > 0) {
        console.log('🚨 ¡DUPLICADOS ENCONTRADOS!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        cloudDuplicates.forEach(code => {
            console.log(`⚠️  Código ${code} aparece ${cloudCodes[code]} veces`);
            const trips = cloudTrips.filter(t => t.code === code);
            trips.forEach((t, i) => {
                const date = new Date(t.created_at).toLocaleString('es-ES');
                console.log(`   ${i + 1}. ${t.name} - ${date}`);
            });
            console.log('');
        });
    } else {
        console.log('✅ No hay duplicados (por ahora)\n');
    }

    // Mostrar todos los códigos
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TODOS LOS CÓDIGOS EN SUPABASE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    cloudTrips.forEach((t, i) => {
        const date = new Date(t.created_at).toLocaleDateString('es-ES');
        console.log(`${String(i + 1).padStart(2, ' ')}. ${t.code} → ${t.name.substring(0, 40)} (${date})`);
    });

    // Análisis de riesgo
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ANÁLISIS DE RIESGO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const totalCodes = Math.pow(36, 4);
    const existingCodes = cloudTrips.length;
    const birthdayParadox = (1 - Math.exp(-(existingCodes * existingCodes) / (2 * totalCodes))) * 100;

    console.log(`Combinaciones posibles (4 chars): ${totalCodes.toLocaleString()}`);
    console.log(`Códigos generados: ${existingCodes}`);
    console.log(`Espacio ocupado: ${(existingCodes / totalCodes * 100).toFixed(4)}%`);
    console.log(`Probabilidad de colisión: ${birthdayParadox.toFixed(2)}%\n`);

    if (birthdayParadox > 1) {
        console.log('🚨 CRÍTICO: Probabilidad > 1% - ¡Implementa verificación YA!\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 PROYECCIONES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    [50, 100, 500, 1000].forEach(n => {
        const prob = (1 - Math.exp(-(n * n) / (2 * totalCodes))) * 100;
        const icon = prob > 50 ? '🚨' : prob > 10 ? '⚠️ ' : '  ';
        console.log(`${icon} ${String(n).padStart(4, ' ')} códigos: ${prob.toFixed(2)}% colisión`);
    });
}

checkDuplicates().then(() => {
    console.log('\n✅ Análisis completo');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
