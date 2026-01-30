/**
 * Script para limpiar la base de datos y empezar pruebas desde cero
 * 
 * USO:
 * 1. Detén el servidor backend (Ctrl+C en la terminal de node server.js)
 * 2. Ejecuta: node cleanup-db.js
 * 3. Reinicia el servidor: node server.js
 */

import Database from 'better-sqlite3';

const db = new Database('./viajes_pro.db');

console.log('🧹 Iniciando limpieza de base de datos...\n');

try {
    // Mostrar estado actual
    const usuariosAntes = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    const votosAntes = db.prepare('SELECT COUNT(*) as count FROM votos_realizados').get();
    const candidaturasAntes = db.prepare('SELECT COUNT(*) as count FROM candidaturas').get();

    console.log('📊 Estado ANTES de la limpieza:');
    console.log(`   Usuarios: ${usuariosAntes.count}`);
    console.log(`   Votos realizados: ${votosAntes.count}`);
    console.log(`   Candidaturas: ${candidaturasAntes.count}\n`);

    // Limpiar todas las tablas relacionadas con votación
    console.log('🗑️  Eliminando datos...');

    db.prepare('DELETE FROM votos_realizados').run();
    console.log('   ✅ votos_realizados limpiados');

    db.prepare('DELETE FROM votos_detalle').run();
    console.log('   ✅ votos_detalle limpiados');

    db.prepare('DELETE FROM candidaturas').run();
    console.log('   ✅ candidaturas limpiadas');

    db.prepare('DELETE FROM usuarios').run();
    console.log('   ✅ usuarios limpiados');

    db.prepare('DELETE FROM viajes').run();
    console.log('   ✅ viajes limpiados');

    // Resetear autoincrement (corregido)
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('usuarios', 'viajes', 'candidaturas', 'votos_detalle')").run();
    console.log('   ✅ Contadores reseteados\n');

    // Mostrar estado final
    const usuariosDespues = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    const votosDespues = db.prepare('SELECT COUNT(*) as count FROM votos_realizados').get();
    const candidaturasDespues = db.prepare('SELECT COUNT(*) as count FROM candidaturas').get();

    console.log('📊 Estado DESPUÉS de la limpieza:');
    console.log(`   Usuarios: ${usuariosDespues.count}`);
    console.log(`   Votos realizados: ${votosDespues.count}`);
    console.log(`   Candidaturas: ${candidaturasDespues.count}\n`);

    console.log('✅ ¡Limpieza completada con éxito!');
    console.log('💡 Ahora puedes reiniciar el servidor y crear un nuevo viaje desde cero.\n');

} catch (error) {
    console.error('❌ Error durante la limpieza:', error);
} finally {
    db.close();
}
