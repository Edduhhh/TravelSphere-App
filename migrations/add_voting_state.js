/**
 * Migration: Add voting state columns to viajes table
 * 
 * Run with: node migrations/add_voting_state.js
 */

import Database from 'better-sqlite3';

const db = new Database('./viajes_pro.db');

console.log('🔄 Adding voting state columns to viajes table...\n');

const columns = [
    {
        name: 'voting_start_date',
        sql: "ALTER TABLE viajes ADD COLUMN voting_start_date TEXT DEFAULT NULL"
    },
    {
        name: 'voting_phase',
        sql: "ALTER TABLE viajes ADD COLUMN voting_phase TEXT DEFAULT 'PLANNING'"
    },
    {
        name: 'current_round',
        sql: "ALTER TABLE viajes ADD COLUMN current_round INTEGER DEFAULT 1"
    },
    {
        name: 'total_cities_initial',
        sql: "ALTER TABLE viajes ADD COLUMN total_cities_initial INTEGER DEFAULT 0"
    }
];

let successCount = 0;
let skipCount = 0;

for (const column of columns) {
    try {
        db.prepare(column.sql).run();
        console.log(`✅ Added column: ${column.name}`);
        successCount++;
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log(`⚠️  Column ${column.name} already exists (skipping)`);
            skipCount++;
        } else {
            console.error(`❌ Error adding ${column.name}:`, e.message);
        }
    }
}

console.log(`\n📊 Summary:`);
console.log(`   Added: ${successCount}`);
console.log(`   Skipped: ${skipCount}`);
console.log(`   Total: ${columns.length}`);

db.close();
console.log('\n✅ Migration complete!\n');
