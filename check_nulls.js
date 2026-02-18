import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

console.log("Checking for NULL eliminada...");

// 1. Check Schema (using PRAGMA)
const columns = db.prepare("PRAGMA table_info(candidaturas)").all();
const eliminadaCol = columns.find(c => c.name === 'eliminada');
console.log("Schema for 'eliminada':", eliminadaCol);

// 2. Check Data
const nulls = db.prepare("SELECT count(*) as count FROM candidaturas WHERE eliminada IS NULL").get();
console.log("Rows with NULL eliminada:", nulls.count);

const activeDetails = db.prepare("SELECT id, ciudad, eliminada FROM candidaturas WHERE eliminada IS NULL OR eliminada = 0").all();
console.log("Total 'Active' (NULL or 0):", activeDetails.length);

const activeStrict = db.prepare("SELECT count(*) as count FROM candidaturas WHERE eliminada = 0").get();
console.log("Total Strict Active (eliminada = 0):", activeStrict.count);

if (activeDetails.length !== activeStrict.count) {
    console.log("🚨 MISMATCH DETECTED! SQL 'WHERE eliminada=0' misses rows!");
} else {
    console.log("✅ No mismatch.");
}
