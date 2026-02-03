
import Database from 'better-sqlite3';
const db = new Database('viajes_pro.db');

const CODE = 'D0XDQ5';

try {
    const viaje = db.prepare('SELECT * FROM viajes WHERE codigo = ?').get(CODE);
    if (!viaje) {
        console.log('Viaje NOT FOUND');
    } else {
        console.log('Viaje Code:', viaje.codigo);
        console.log('Viaje Phase:', viaje.voting_phase);
        console.log('Viaje Start Date:', viaje.voting_start_date);
        const cities = db.prepare('SELECT * FROM candidaturas WHERE viaje_id = ?').all(viaje.id);
        console.log('Total Cities:', cities.length);
        console.log('Active Cities:', cities.filter(c => !c.eliminada).length);
        console.log('Cities List:', cities.map(c => `${c.ciudad} (Elim: ${c.eliminada})`).join(', '));
    }
} catch (e) {
    console.error(e);
}
