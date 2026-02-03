import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

console.log('\n🔧 RESETEANDO VIAJE TESTG99F A ESTADO INICIAL\n');

// Reset completo del viaje
db.prepare(`
    UPDATE viajes 
    SET voting_phase = NULL,
        voting_start_date = NULL,
        current_round = NULL
    WHERE codigo = ?
`).run('TESTG99F');

console.log('✅ Fase reseteada a NULL (PLANNING)');
console.log('✅ Fecha de votación eliminada');
console.log('✅ Ronda actual reseteada');

const viaje = db.prepare('SELECT id, voting_phase, voting_start_date, current_round FROM viajes WHERE codigo = ?').get('TESTG99F');

console.log('\n📊 ESTADO FINAL:');
console.log('Voting Phase:', viaje.voting_phase || 'NULL (PLANNING)');
console.log('Voting Start Date:', viaje.voting_start_date || 'NULL');
console.log('Current Round:', viaje.current_round || 'NULL');

const candidatos = db.prepare('SELECT COUNT(*) as total FROM candidaturas WHERE viaje_id = ?').get(viaje.id);
console.log('\n🏙️  Candidatos disponibles:', candidatos.total);

console.log('\n✅ LISTO PARA USAR CON CÓDIGO: TESTG99F\n');

db.close();
