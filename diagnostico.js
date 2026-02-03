import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

const viaje = db.prepare('SELECT id, codigo, voting_phase, voting_start_date, current_round FROM viajes WHERE codigo = ?').get('TESTG99F');

console.log('\n📊 ESTADO DEL VIAJE:\n');
console.log('ID:', viaje.id);
console.log('Código:', viaje.codigo);
console.log('Voting Phase:', viaje.voting_phase);
console.log('Voting Start Date:', viaje.voting_start_date);
console.log('Current Round:', viaje.current_round);

const candidatos = db.prepare('SELECT COUNT(*) as total FROM candidaturas WHERE viaje_id = ?').get(viaje.id);
console.log('\nCandidatos:', candidatos.total);

console.log('\n💡 SOLUCIÓN: Resetear fase a NULL para volver a PLANNING\n');

db.close();
