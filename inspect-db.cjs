const Database = require('better-sqlite3');
const db = new Database('viajes_pro.db');

// List all trips to find the relevant one
const trips = db.prepare('SELECT id, codigo, destino FROM viajes ORDER BY id DESC LIMIT 5').all();
console.log('--- ÚLTIMOS 5 VIAJES ---');
trips.forEach(t => console.log(`${t.id} | ${t.codigo} | ${t.destino}`));

if (trips.length > 0) {
    // Check the latest trip
    const trip = trips[0];
    console.log(`\n--- USUARIOS EN VIAJE ${trip.id} (${trip.destino}) ---`);
    const users = db.prepare('SELECT * FROM usuarios WHERE viaje_id = ?').all(trip.id);
    console.table(users);

    console.log(`--- VOTOS REALIZADOS EN VIAJE ${trip.id} ---`);
    const votes = db.prepare('SELECT * FROM votos_realizados WHERE viaje_id = ?').all(trip.id);
    console.table(votes);

    console.log(`--- DETALLE DE VOTOS (SI HUBIERA PARCIALES) ---`);
    const details = db.prepare('SELECT * FROM votos_detalle WHERE viaje_id = ?').all(trip.id);
    if (details.length > 0) {
        console.table(details.slice(0, 10)); // Show 10
        const userIdsInDetails = new Set(details.map(d => d.usuario_id));
        console.log('Usuarios en detalle:', Array.from(userIdsInDetails));
    } else {
        console.log('No hay detalles.');
    }

    // Check for duplicates by name
    const names = {};
    users.forEach(u => {
        if (names[u.nombre]) {
            console.warn(`⚠️ DUPLICATE USER FOUND: ${u.nombre} (IDs: ${names[u.nombre]}, ${u.id})`);
        }
        names[u.nombre] = u.id;
    });
    // }); remove loop, just one
}
