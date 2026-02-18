const Database = require('better-sqlite3');
const db = new Database('viajes_pro.db');

try {
    // Get the last trip created (our test trip)
    const trip = db.prepare('SELECT * FROM viajes ORDER BY id DESC LIMIT 1').get();

    console.log("--- LAST TRIP STATE ---");
    console.log(`ID: ${trip.id}`);
    console.log(`Code: ${trip.codigo}`);
    console.log(`Phase: ${trip.voting_phase}`);
    console.log(`Last Elimination Data: ${trip.last_elimination_data ? "PRESENT" : "NULL"}`);

    if (trip.last_elimination_data) {
        console.log("Data Content:", trip.last_elimination_data);
    }

    // Get candidate counts
    const total = db.prepare('SELECT COUNT(*) as c FROM candidaturas WHERE viaje_id = ?').get(trip.id).c;
    const eliminated = db.prepare('SELECT COUNT(*) as c FROM candidaturas WHERE viaje_id = ? AND eliminada = 1').get(trip.id).c;
    const active = db.prepare('SELECT COUNT(*) as c FROM candidaturas WHERE viaje_id = ? AND eliminada = 0').get(trip.id).c;

    console.log("\n--- CANDIDATE COUNTS ---");
    console.log(`Total: ${total}`);
    console.log(`Eliminated: ${eliminated}`);
    console.log(`Active: ${active}`);

} catch (e) {
    console.error("Error inspecting DB:", e.message);
}
