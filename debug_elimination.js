
import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

function debugElimination() {
    // 1. Find trip
    const trip = db.prepare("SELECT * FROM viajes ORDER BY id DESC LIMIT 1").get();
    if (!trip) return console.log("No trip found");

    console.log(`TripID: ${trip.id} (Code: ${trip.codigo})`);

    // 2. Count ALL Candidates (Alive + Dead)
    const allCandidates = db.prepare("SELECT * FROM candidaturas WHERE viaje_id = ?").all(trip.id);
    console.log(`\n Total Candidates in DB: ${allCandidates.length}`);

    const active = allCandidates.filter(c => c.eliminada === 0);
    const eliminated = allCandidates.filter(c => c.eliminada === 1);

    console.log(`Alive: ${active.length}`);
    console.log(`Eliminated: ${eliminated.length}`);

    console.log('\n--- Active Cities ---');
    active.forEach(c => console.log(`[ALIVE] ${c.ciudad}`));

    console.log('\n--- Eliminated Cities ---');
    eliminated.forEach(c => console.log(`[DEAD]  ${c.ciudad}`));
}

debugElimination();
