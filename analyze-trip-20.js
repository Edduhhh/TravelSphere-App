import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

console.log('\n═══════════════════════════════════════════════');
console.log('       🔍 ANÁLISIS COMPLETO - VIAJE 20');
console.log('═══════════════════════════════════════════════\n');

// 1. USUARIOS DEL VIAJE
console.log('📋 USUARIOS REGISTRADOS:');
console.log('─────────────────────────────────────────────────');
const usuarios = db.prepare('SELECT * FROM usuarios WHERE viaje_id = 20').all();
usuarios.forEach(u => {
    console.log(`ID: ${u.id.toString().padEnd(3)} | Nombre: ${u.nombre.padEnd(15)} | Admin: ${u.es_admin ? 'SÍ' : 'NO'} | Tesorero: ${u.es_tesorero ? 'SÍ' : 'NO'}`);
});

// 2. VOTOS REALIZADOS
console.log('\n📊 VOTOS REALIZADOS:');
console.log('─────────────────────────────────────────────────');
const votos = db.prepare('SELECT vr.*, u.nombre FROM votos_realizados vr JOIN usuarios u ON vr.usuario_id = u.id WHERE vr.viaje_id = 20').all();
if (votos.length === 0) {
    console.log('   (ningún voto registrado)');
} else {
    votos.forEach(v => {
        console.log(`Usuario ID: ${v.usuario_id.toString().padEnd(3)} → Nombre: ${v.nombre.padEnd(15)} | Votó el: ${v.fecha_voto || 'N/A'}`);
    });
}

// 3. DETALLES DE VOTOS (quién votó qué)
console.log('\n🗳️  DETALLES DE VOTOS:');
console.log('─────────────────────────────────────────────────');
const detalles = db.prepare(`
    SELECT vd.*, u.nombre as usuario_nombre, c.ciudad 
    FROM votos_detalle vd 
    JOIN usuarios u ON vd.usuario_id = u.id 
    JOIN candidaturas c ON vd.candidatura_id = c.id 
    WHERE vd.viaje_id = 20 
    ORDER BY vd.usuario_id, vd.posicion
`).all();

if (detalles.length === 0) {
    console.log('   (ningún detalle de voto)');
} else {
    let currentUser = null;
    detalles.forEach(d => {
        if (d.usuario_nombre !== currentUser) {
            currentUser = d.usuario_nombre;
            console.log(`\n   👤 ${currentUser} (ID: ${d.usuario_id}):`);
        }
        console.log(`      ${d.posicion}. ${d.ciudad}`);
    });
}

// 4. ORDEN DE REGISTRO
console.log('\n\n⏰ ORDEN DE REGISTRO (por ID):');
console.log('─────────────────────────────────────────────────');
usuarios.forEach((u, index) => {
    console.log(`${index + 1}. ${u.nombre} (ID: ${u.id}) - ${u.es_admin ? 'ADMIN' : 'Guest'}`);
});

console.log('\n═══════════════════════════════════════════════\n');

db.close();
