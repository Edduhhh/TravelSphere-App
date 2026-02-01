import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

console.log('🔍 INVESTIGANDO VIAJE 20 - IDENTIDAD DE USUARIOS\n');

// 1. Ver usuarios del viaje
console.log('═══ USUARIOS DEL VIAJE 20 ═══');
const usuarios = db.prepare('SELECT * FROM usuarios WHERE viaje_id = 20').all();
usuarios.forEach(u => {
    console.log(`ID: ${u.id} | Nombre: ${u.nombre} | Admin: ${u.es_admin ? 'SÍ' : 'NO'}`);
});

// 2. Ver votos realizados
console.log('\n═══ VOTOS REALIZADOS ═══');
const votos = db.prepare('SELECT * FROM votos_realizados WHERE viaje_id = 20').all();
if (votos.length === 0) {
    console.log('   (ningún voto aún)');
} else {
    votos.forEach(v => {
        const user = usuarios.find(u => u.id === v.usuario_id);
        console.log(`Usuario ID: ${v.usuario_id} → Nombre: ${user?.nombre || 'DESCONOCIDO'}`);
    });
}

// 3. Ver detalles de votos
console.log('\n═══ DETALLES DE VOTOS ═══');
const detalles = db.prepare('SELECT * FROM votos_detalle WHERE viaje_id = 20').all();
if (detalles.length === 0) {
    console.log('   (ningún detalle aún)');
} else {
    detalles.forEach(d => {
        const user = usuarios.find(u => u.id === d.usuario_id);
        console.log(`Voto ID: ${d.id} | Usuario: ${user?.nombre} (ID ${d.usuario_id}) | Candidatura: ${d.candidatura_id} | Posición: ${d.posicion}`);
    });
}

// 4. Ver candidaturas
console.log('\n═══ CANDIDATURAS ═══');
const candidaturas = db.prepare('SELECT id, ciudad, puntos FROM candidaturas WHERE viaje_id = 20').all();
candidaturas.forEach(c => {
    console.log(`ID: ${c.id} | Ciudad: ${c.ciudad} | Puntos: ${c.puntos}`);
});

console.log('\n════════════════════════════════\n');

db.close();
