
import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('viajes_pro.db');
const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='candidaturas'").get();
fs.writeFileSync('schema.txt', row.sql);
console.log('Written to schema.txt');
