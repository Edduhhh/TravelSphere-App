
const Database = require('better-sqlite3');
const db = new Database('travel.db');

try {
    const rows = db.prepare('SELECT id, ciudad, eliminada FROM candidaturas').all();
    console.log('Total Candidates:', rows.length);
    const active = rows.filter(r => !r.eliminada);
    console.log('Active Candidates:', active.length);
    console.log('Active Cities:', active.map(c => c.ciudad).join(', '));
} catch (e) {
    console.error(e);
}
