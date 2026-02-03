const Database = require('better-sqlite3');
const db = new Database('travel_sphere.db');

console.log('🔄 STARTING DB REPAIR...');

// 1. Reset Candidaturas (Resurrect All)
const info = db.prepare('UPDATE candidaturas SET eliminada = 0').run();
console.log(`✅ Resurrected ${info.changes} candidates (eliminada = 0)`);

// 2. Clear Votes (Optional, but good for clean slate)
const votes = db.prepare('DELETE FROM votos_realizados').run();
console.log(`✅ Cleared ${votes.changes} vote records`);

const details = db.prepare('DELETE FROM votos_detalle').run();
console.log(`✅ Cleared ${details.changes} vote details`);

// 3. Reset Trip Phase (Optional, ensures Voting Room is ready)
// db.prepare("UPDATE viajes SET voting_phase = 'VOTING', current_round = 1").run();

console.log('✅ DATABASE REPAIR COMPLETE. You can now restart the process with 13 cities.');
