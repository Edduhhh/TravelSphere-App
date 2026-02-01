import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

const viaje = db.prepare('SELECT codigo, destino FROM viajes WHERE id = 20').get();

if (viaje) {
    console.log('\n════════════════════════════════════════');
    console.log('📋 CÓDIGO DEL VIAJE 20:');
    console.log('════════════════════════════════════════');
    console.log(`\n   CÓDIGO: ${viaje.codigo}`);
    console.log(`   DESTINO: ${viaje.destino}\n`);
    console.log('════════════════════════════════════════\n');
} else {
    console.log('❌ Viaje 20 no encontrado');
}

db.close();
