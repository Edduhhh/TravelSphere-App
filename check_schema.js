
import Database from 'better-sqlite3';
const db = new Database('viajes_pro.db');
const columns = db.prepare("PRAGMA table_info(candidaturas)").all();
console.log('Columns:', columns.map(c => c.name));
