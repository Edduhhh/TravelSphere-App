
import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

function resurrectAll() {
    // 1. Get latest trip
    const trip = db.prepare("SELECT * FROM viajes ORDER BY id DESC LIMIT 1").get();
    if (!trip) {
        console.log("No trip found!");
        return;
    }

    console.log(`🚑 RESURRECTING TRIP: ${trip.codigo} (ID: ${trip.id})`);

    // 2. Resurrect Candidates
    const restoreInfo = db.prepare("UPDATE candidaturas SET eliminada = 0, puntos = 0, votos_pos1 = 0, votos_pos2 = 0, votos_pos3 = 0 WHERE viaje_id = ?").run(trip.id);
    console.log(`   ✨ Resurrected ${restoreInfo.changes} cities (All Alive)`);

    // 3. Clear Votes
    db.prepare("DELETE FROM votos_realizados WHERE viaje_id = ?").run(trip.id);
    db.prepare("DELETE FROM votos_detalle WHERE viaje_id = ?").run(trip.id);
    console.log(`   🧹 Cleared all votes`);

    // 4. Reset Phase to PLANNING
    db.prepare("UPDATE viajes SET voting_phase = 'PLANNING', voting_start_date = NULL, current_round = 1 WHERE id = ?").run(trip.id);
    console.log(`   ⏮️  Reset phase to PLANNING (Ready to start clean)`);

    console.log("\n✅ DONE. Please refresh the frontend.");
}

resurrectAll();
