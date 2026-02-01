import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

console.log('🔧 Añadiendo columna "eliminada" a candidaturas...\n');

try {
    db.prepare('ALTER TABLE candidaturas ADD COLUMN eliminada INTEGER DEFAULT 0').run();
    console.log('✅ Columna añadida exitosamente');
} catch (e) {
    if (e.message.includes('duplicate column')) {
        console.log('ℹ️  La columna ya existe');
    } else {
        console.error('❌ Error:', e.message);
    }
}

db.close();
console.log('\n✅ Migración completada\n');
