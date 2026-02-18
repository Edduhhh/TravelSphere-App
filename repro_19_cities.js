import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

// CLEANUP
db.prepare('DELETE FROM viajes WHERE codigo = "TEST19"').run();
db.prepare('DELETE FROM candidaturas WHERE viaje_id = (SELECT id FROM viajes WHERE codigo = "TEST19")').run();

// SETUP TRIP
db.prepare(`
    INSERT INTO viajes (codigo, destino, voting_phase, total_cities_initial) 
    VALUES ('TEST19', 'Test City', 'ELIMINATION', 19)
`).run();

const viajeId = db.prepare('SELECT id FROM viajes WHERE codigo = "TEST19"').get().id;

// ADD 19 CITIES
const stmt = db.prepare('INSERT INTO candidaturas (viaje_id, usuario_id, ciudad, puntos, eliminada) VALUES (?, ?, ?, ?, 0)');
for (let i = 1; i <= 19; i++) {
    stmt.run(viajeId, 1, `City ${i}`, 0);
}

// SETUP VOTES (Dummy votes to ensure logic runs)
db.prepare('INSERT INTO votos_realizados (viaje_id, usuario_id) VALUES (?, ?)').run(viajeId, 1);
db.prepare('INSERT INTO votos_detalle (viaje_id, usuario_id, candidatura_id, posicion) VALUES (?, ?, ?, ?)').run(viajeId, 1, 1, 1); // Vote for City 1

console.log(`Setup complete. Trip ID: ${viajeId} with 19 cities.`);

// LOGIC TO TEST (COPIED FROM SERVER.JS)
function runEliminationRound(viajeId) {
    console.log(`🚀 ENTERING runEliminationRound for ${viajeId}`);

    const candidaturas = db.prepare('SELECT * FROM candidaturas WHERE viaje_id = ? AND eliminada = 0').all(viajeId);
    const totalCities = candidaturas.length;

    // LÓGICA DE REGLAS
    let eliminateCount = 1;
    let phase = 'ELIMINATION';
    const count = parseInt(totalCities, 10);

    console.log(`   📊 COUNT: ${count}`);

    if (count <= 3) {
        phase = 'FINAL';
        eliminateCount = 0;
    } else if (count > 8) {
        const excess = count - 8;
        eliminateCount = Math.max(1, Math.min(3, excess));
        console.log(`   🧮 CALC: Excess=${excess}, Eliminate=${eliminateCount}`);
    } else {
        console.log(`   🧮 CALC: <=8, Eliminate=1`);
    }

    return { totalCities, eliminateCount, phase };
}

// RUN
const result = runEliminationRound(viajeId);
console.log('RESULT:', result);
