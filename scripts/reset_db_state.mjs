import Database from 'better-sqlite3';
const db = new Database('travel_sphere.db');

console.log('🔄 STARTING DB REPAIR (ESM)...');

// 1. Reset Candidaturas (Resurrect All)
const info = db.prepare('UPDATE candidaturas SET eliminada = 0').run();
console.log(`✅ Resurrected ${info.changes} candidates (eliminada = 0)`);

// 2. Clear Votes
const votes = db.prepare('DELETE FROM votos_realizados').run();
console.log(`✅ Cleared ${votes.changes} vote records`);

const details = db.prepare('DELETE FROM votos_detalle').run();
console.log(`✅ Cleared ${details.changes} vote details`);

console.log('✅ DATABASE REPAIR COMPLETE.');
