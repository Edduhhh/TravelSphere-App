import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

console.log('\n🔍 DIAGNÓSTICO DEL VIAJE TESTG99F\n');

const viaje = db.prepare('SELECT * FROM viajes WHERE codigo = ?').get('TESTG99F');

if (!viaje) {
    console.log('❌ NO SE ENCONTRÓ EL VIAJE');
    db.close();
    process.exit(1);
}

console.log('📋 VIAJE:');
console.log(`   ID: ${viaje.id}`);
console.log(`   Código: ${viaje.codigo}`);
console.log(`   Voting Phase: ${viaje.voting_phase}`);
console.log(`   Current Round: ${viaje.current_round}`);
console.log(`   Voting Start Date: ${viaje.voting_start_date}`);

const candidatos = db.prepare('SELECT id, ciudad, eliminada FROM candidaturas WHERE viaje_id = ?').all(viaje.id);

console.log(`\n🏙️  CANDIDATOS (${candidatos.length}):`);
candidatos.forEach(c => {
    console.log(`   ${c.ciudad} (ID: ${c.id}, Eliminada: ${c.eliminada})`);
});

const usuarios = db.prepare('SELECT id, nombre, es_admin FROM usuarios WHERE viaje_id = ?').all(viaje.id);

console.log(`\n👥 USUARIOS (${usuarios.length}):`);
usuarios.forEach(u => {
    console.log(`   ${u.nombre} (ID: ${u.id}, Admin: ${u.es_admin})`);
});

console.log('\n');

db.close();
