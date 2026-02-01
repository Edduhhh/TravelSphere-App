import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

console.log('\n🧹 LIMPIANDO USUARIOS DUPLICADOS DEL VIAJE 20\n');

// 1. Ver usuarios actuales
const usuarios = db.prepare('SELECT * FROM usuarios WHERE viaje_id = 20').all();
console.log('📋 USUARIOS ACTUALES:');
usuarios.forEach(u => {
    console.log(`   ID: ${u.id} | Nombre: ${u.nombre} | Admin: ${u.es_admin}`);
});

// 2. Identificar duplicados
const nombres = {};
usuarios.forEach(u => {
    if (!nombres[u.nombre]) {
        nombres[u.nombre] = [];
    }
    nombres[u.nombre].push(u.id);
});

console.log('\n🔍 ANÁLISIS DE DUPLICADOS:');
Object.keys(nombres).forEach(nombre => {
    if (nombres[nombre].length > 1) {
        console.log(`   ⚠️  "${nombre}" tiene ${nombres[nombre].length} copias: IDs ${nombres[nombre].join(', ')}`);
    } else {
        console.log(`   ✅ "${nombre}" OK (ID: ${nombres[nombre][0]})`);
    }
});

// 3. Borrar usuarios duplicados (mantener el PRIMERO de cada nombre)
console.log('\n🗑️  ELIMINANDO DUPLICADOS...');
Object.keys(nombres).forEach(nombre => {
    if (nombres[nombre].length > 1) {
        // Mantener el primero, borrar los demás
        const idsToDelete = nombres[nombre].slice(1); // Todos excepto el primero
        idsToDelete.forEach(id => {
            // Primero borrar votos asociados
            db.prepare('DELETE FROM votos_realizados WHERE usuario_id = ?').run(id);
            db.prepare('DELETE FROM votos_detalle WHERE usuario_id = ?').run(id);

            // Luego borrar usuario
            db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
            console.log(`   ❌ Eliminado usuario duplicado: ID ${id} (${nombre})`);
        });
        console.log(`   ✅ Mantenido: ID ${nombres[nombre][0]} (${nombre})`);
    }
});

// 4. Verificar resultado
const usuariosFinales = db.prepare('SELECT * FROM usuarios WHERE viaje_id = 20').all();
console.log('\n✅ USUARIOS FINALES:');
usuariosFinales.forEach(u => {
    console.log(`   ID: ${u.id} | Nombre: ${u.nombre} | Admin: ${u.es_admin}`);
});

console.log('\n════════════════════════════════════════\n');

db.close();
