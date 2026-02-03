
import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

function completeTo12() {
    // 1. Get trip
    const trip = db.prepare("SELECT * FROM viajes ORDER BY id DESC LIMIT 1").get();
    if (!trip) return;

    console.log(`🔧 Trip: ${trip.codigo}`);

    // 2. Count
    const count = db.prepare("SELECT COUNT(*) as c FROM candidaturas WHERE viaje_id = ?").get(trip.id).c;
    console.log(`Current Count: ${count}`);

    if (count >= 12) {
        console.log("Already has 12 or more.");
        return;
    }

    const needed = 12 - count;
    console.log(`Need to add: ${needed}`);

    // 3. Add Cities
    const extras = [
        { ciudad: 'Berlin', pais: 'Alemania' },
        { ciudad: 'Amsterdam', pais: 'Países Bajos' },
        { ciudad: 'Roma', pais: 'Italia' }, // Fallbacks
        { ciudad: 'Madrid', pais: 'España' }
    ];

    // (Moved stmt declaration below)

    // Get an admin user ID to assign (or generic)
    let userId = 1;
    const user = db.prepare("SELECT id FROM usuarios WHERE viaje_id = ? LIMIT 1").get(trip.id);

    if (user) {
        userId = user.id;
    } else {
        console.log("⚠️ No users found in trip. Using ID 9999 (Force)");
        // Try simple insert (might fail FK)
        userId = 9999;
    }

    let added = 0;
    const stmt = db.prepare("INSERT INTO candidaturas (viaje_id, ciudad, usuario_id, eliminada) VALUES (?, ?, ?, 0)");

    for (const city of extras) {
        if (added >= needed) break;
        // Check if exists
        const exists = db.prepare("SELECT 1 FROM candidaturas WHERE viaje_id = ? AND ciudad = ?").get(trip.id, city.ciudad);
        if (!exists) {
            try {
                stmt.run(trip.id, city.ciudad, userId);
                console.log(`   + Added: ${city.ciudad}`);
                added++;
            } catch (e) {
                console.error(`   ❌ Failed to add ${city.ciudad}: ${e.message}`);
                // If FK error, try inserting ignoring user check? Or maybe I need to fix usuarios first.
            }
        }
    }
}

completeTo12();
