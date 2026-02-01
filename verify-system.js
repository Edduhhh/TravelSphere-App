// 🔍 SCRIPT DE VERIFICACIÓN COMPLETA
// Ejecuta: node verify-system.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n🔍 VERIFICACIÓN COMPLETA DEL SISTEMA\n');

// 1. Verificar conexión a Supabase
console.log('1️⃣ Verificando conexión a Supabase...');
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('   ❌ Faltan credenciales de Supabase');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { data: testConnection, error: connError } = await supabase.from('trips').select('code').limit(1);
if (connError) {
    console.error('   ❌ Error conectando:', connError.message);
    process.exit(1);
}
console.log('   ✅ Conexión a Supabase exitosa');

// 2. Verificar SQLite local
console.log('\n2️⃣ Verificando base de datos local...');
const db = new Database('viajes_pro.db');
const localTrips = db.prepare('SELECT COUNT(*) as count FROM viajes').get();
console.log(`   ✅ Base local OK (${localTrips.count} viajes)`);

// 3. Verificar códigos de 6 caracteres
console.log('\n3️⃣ Verificando códigos de 6 caracteres...');
const shortCodes = db.prepare('SELECT codigo FROM viajes WHERE LENGTH(codigo) < 6').all();
if (shortCodes.length > 0) {
    console.warn(`   ⚠️  Encontrados ${shortCodes.length} códigos antiguos de 4 chars:`, shortCodes);
} else {
    console.log('   ✅ Todos los códigos tienen 6 caracteres');
}

// 4. Verificar sincronización SQLite <-> Supabase
console.log('\n4️⃣ Verificando sincronización...');
const allLocalCodes = db.prepare('SELECT codigo FROM viajes').all().map(v => v.codigo);
let syncIssues = 0;

for (const codigo of allLocalCodes) {
    const { data: cloudTrip } = await supabase
        .from('trips')
        .select('code, voting_start_date, is_voting_open')
        .eq('code', codigo)
        .maybeSingle();

    if (!cloudTrip) {
        console.warn(`   ⚠️  Código ${codigo} en SQLite pero NO en Supabase`);
        syncIssues++;
    }
}

if (syncIssues === 0) {
    console.log('   ✅ Todos los viajes están sincronizados');
} else {
    console.warn(`   ⚠️  ${syncIssues} viajes no sincronizados`);
}

// 5. Verificar viajes con fechas
console.log('\n5️⃣ Verificando fechas de votación...');
const { data: tripsWithDates } = await supabase
    .from('trips')
    .select('code, voting_start_date, is_voting_open')
    .not('voting_start_date', 'is', null);

console.log(`   📊 ${tripsWithDates?.length || 0} viajes con fecha configurada:`);
tripsWithDates?.forEach(t => {
    console.log(`      - ${t.code}: ${t.voting_start_date} (abierto: ${t.is_voting_open})`);
});

// 6. Verificar RLS (Row Level Security)
console.log('\n6️⃣ Verificando permisos de Supabase...');
const testCode = 'TEST' + Math.random().toString(36).substring(2, 6).toUpperCase();
const { error: insertError } = await supabase.from('trips').insert({
    code: testCode,
    name: 'Test Verificación',
    is_voting_open: false,
    current_round: 1
});

if (insertError) {
    console.error('   ❌ No se puede insertar:', insertError.message);
} else {
    console.log('   ✅ Permisos de INSERT OK');

    // Test UPDATE
    const { error: updateError } = await supabase
        .from('trips')
        .update({ voting_start_date: new Date().toISOString() })
        .eq('code', testCode);

    if (updateError) {
        console.error('   ❌ No se puede actualizar:', updateError.message);
    } else {
        console.log('   ✅ Permisos de UPDATE OK');
    }

    // Limpiar
    await supabase.from('trips').delete().eq('code', testCode);
}

console.log('\n✅ VERIFICACIÓN COMPLETA\n');
console.log('Si todos los checks son ✅, el sistema está listo.');
console.log('Si hay ⚠️  o ❌, revisa los detalles arriba.\n');
