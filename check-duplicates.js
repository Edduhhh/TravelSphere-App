import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const db = new Database('./database.db');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function checkDuplicates() {
    console.log('🔍 Verificando duplicados de códigos...\n');

    // Códigos en SQLite local
    const localTrips = db.prepare('SELECT id, codigo, destino FROM viajes ORDER BY id').all();
    console.log(`📁 SQLite Local: ${localTrips.length} viajes\n`);

    // Códigos en Supabase
    const { data: cloudTrips } = await supabase.from('trips').select('code, name, created_at');
    console.log(`☁️  Supabase: ${cloudTrips.length} viajes\n`);

    // Detectar duplicados en local
    const localCodes = {};
    const localDuplicates = [];
    localTrips.forEach(t => {
        if (localCodes[t.codigo]) {
            localDuplicates.push(t.codigo);
        }
        localCodes[t.codigo] = (localCodes[t.codigo] || 0) + 1;
    });

    if (localDuplicates.length > 0) {
        console.log('⚠️  DUPLICADOS EN SQLITE LOCAL:');
        localDuplicates.forEach(code => {
            console.log(`   - Código ${code}: ${localCodes[code]} viajes`);
        });
        console.log('');
    } else {
        console.log('✅ No hay duplicados en SQLite local\n');
    }

    // Detectar duplicados en Supabase
    const cloudCodes = {};
    const cloudDuplicates = [];
    cloudTrips.forEach(t => {
        if (cloudCodes[t.code]) {
            cloudDuplicates.push(t.code);
        }
        cloudCodes[t.code] = (cloudCodes[t.code] || 0) + 1;
    });

    if (cloudDuplicates.length > 0) {
        console.log('⚠️  DUPLICADOS EN SUPABASE:');
        cloudDuplicates.forEach(code => {
            console.log(`   - Código ${code}: ${cloudCodes[code]} viajes`);
        });
        console.log('');
    } else {
        console.log('✅ No hay duplicados en Supabase\n');
    }

    // Mostrar todos los códigos
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CÓDIGOS EN SQLITE LOCAL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    localTrips.forEach(t => {
        console.log(`${t.codigo} → ${t.destino} (ID: ${t.id})`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CÓDIGOS EN SUPABASE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    cloudTrips.forEach(t => {
        const date = new Date(t.created_at).toLocaleString('es-ES');
        console.log(`${t.code} → ${t.name} (${date})`);
    });

    // Verificar probabilidad de colisión
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ANÁLISIS DE RIESGO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const totalCodes = Math.pow(36, 4);
    const existingCodes = cloudTrips.length;
    const collisionProbability = (existingCodes / totalCodes * 100).toFixed(4);

    console.log(`Combinaciones posibles: ${totalCodes.toLocaleString()}`);
    console.log(`Códigos generados: ${existingCodes}`);
    console.log(`Probabilidad de colisión en próximo código: ~${collisionProbability}%`);

    if (existingCodes > 100) {
        console.log('\n⚠️  WARNING: Con más de 100 códigos, las colisiones son estadísticamente probables.');
    }
    if (existingCodes > 1000) {
        console.log('\n🚨 CRITICAL: Con más de 1000 códigos, las colisiones son INEVITABLES.');
    }
}

checkDuplicates().then(() => {
    console.log('\n✅ Análisis completo');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
