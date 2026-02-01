// 🔧 MIGRACIÓN: Agregar columnas de votación a tabla viajes
import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

console.log('🔧 Aplicando migración: Agregar columnas de votación...\n');

try {
    // Verificar si las columnas ya existen
    const tableInfo = db.prepare("PRAGMA table_info(viajes)").all();
    const columnNames = tableInfo.map(col => col.name);

    console.log('📋 Columnas actuales:', columnNames.join(', '));

    // Agregar columnas si no existen
    const columnsToAdd = [
        { name: 'voting_start_date', type: 'TEXT', defaultValue: null },
        { name: 'voting_phase', type: 'TEXT', defaultValue: "'PLANNING'" },
        { name: 'current_round', type: 'INTEGER', defaultValue: '1' },
        { name: 'total_cities_initial', type: 'INTEGER', defaultValue: '0' }
    ];

    let addedCount = 0;

    for (const col of columnsToAdd) {
        if (!columnNames.includes(col.name)) {
            const sql = `ALTER TABLE viajes ADD COLUMN ${col.name} ${col.type}${col.defaultValue !== null ? ` DEFAULT ${col.defaultValue}` : ''}`;
            console.log(`  ➕ Agregando columna: ${col.name}`);
            db.exec(sql);
            addedCount++;
        } else {
            console.log(`  ✓  Columna ${col.name} ya existe`);
        }
    }

    // Verificar resultado
    const newTableInfo = db.prepare("PRAGMA table_info(viajes)").all();
    const newColumnNames = newTableInfo.map(col => col.name);

    console.log('\n📋 Columnas finales:', newColumnNames.join(', '));
    console.log(`\n✅ Migración completada: ${addedCount} columna(s) agregada(s)`);

} catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
} finally {
    db.close();
}
