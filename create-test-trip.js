import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

console.log('\n🎯 CREANDO VIAJE DE PRUEBA CON CANDIDATOS PRECARGADOS\n');

// 1. Crear viaje
const codigo = 'TEST' + Math.random().toString(36).substring(2, 6).toUpperCase();
const resultado = db.prepare(`
    INSERT INTO viajes (codigo, destino, fecha_inicio, fecha_fin)
    VALUES (?, 'PENDIENTE: Europa 2026', '2026-08-01', '2026-08-15')
`).run(codigo);

const viajeId = resultado.lastInsertRowid;

console.log(`✅ Viaje creado:`);
console.log(`   ID: ${viajeId}`);
console.log(`   CÓDIGO: ${codigo}`);

// 2. Crear usuarios
const eduId = db.prepare('INSERT INTO usuarios (viaje_id, nombre, es_admin, es_tesorero) VALUES (?, ?, 1, 1)').run(viajeId, 'Edu').lastInsertRowid;
const pabId = db.prepare('INSERT INTO usuarios (viaje_id, nombre, es_admin, es_tesorero) VALUES (?, ?, 0, 0)').run(viajeId, 'Pablessi').lastInsertRowid;
const xoaId = db.prepare('INSERT INTO usuarios (viaje_id, nombre, es_admin, es_tesorero) VALUES (?, ?, 0, 0)').run(viajeId, 'Xoanete').lastInsertRowid;

console.log(`\n✅ Usuarios creados:`);
console.log(`   Edu (Admin): ${eduId}`);
console.log(`   Pablessi: ${pabId}`);
console.log(`   Xoanete: ${xoaId}`);

// 3. Añadir 12 ciudades
const ciudades = [
    'Praga', 'Budapest', 'Viena', 'Cracovia',
    'Lisboa', 'Oporto', 'Berlín', 'Múnich',
    'Ámsterdam', 'Bruselas', 'Dublín', 'Edimburgo'
];

console.log(`\n✅ Añadiendo ${ciudades.length} candidatos:`);

ciudades.forEach((ciudad, index) => {
    const candId = db.prepare(`
        INSERT INTO candidaturas (viaje_id, usuario_id, ciudad)
        VALUES (?, ?, ?)
    `).run(viajeId, eduId, ciudad).lastInsertRowid;

    console.log(`   ${index + 1}. ${ciudad} (ID: ${candId})`);
});

console.log(`\n════════════════════════════════════════════════════`);
console.log(`🎉 VIAJE DE PRUEBA LISTO`);
console.log(`════════════════════════════════════════════════════`);
console.log(`\n📋 CÓDIGO PARA UNIRSE: ${codigo}`);
console.log(`\n👥 USUARIOS:`);
console.log(`   - Edu (admin)`);
console.log(`   - Pablessi`);
console.log(`   - Xoanete`);
console.log(`\n🏙️  CIUDADES: ${ciudades.length} ya añadidas`);
console.log(`\n🚀 SIGUIENTE PASO: Abrir votación y votar\n`);
console.log(`════════════════════════════════════════════════════\n`);

db.close();
