
import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');
const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='candidaturas'").get();
console.log('DDL:', row.sql.replace(/\n/g, ' '));
